import { randomInt } from 'node:crypto';
import { repos } from '../db/repository.js';
import { tx } from '../db/database.js';
import { newId, nowIso } from '../utils/ids.js';
import { moisAnneeFromDate } from '../utils/dates.js';
import { round2 } from '../utils/money.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { logOperation, fmtMoney } from './journal.js';
import { getAdherentOrFail, appliquerSeuilImmatriculation } from './adherents.js';

const nom = (a) => `${a.nom} ${a.prenom}`;

async function ensureReferenceUnique(reference, selfId) {
  if (!reference) return;
  const dup = await repos.cotisations.findOne({ where: { reference } });
  if (dup && dup.id !== selfId) {
    throw conflict(`La référence « ${reference} » est déjà utilisée (cotisation ${dup.matricule}, ${dup.datePaiement}).`);
  }
}

const randomReference = (prefix, datePaiement, digits) =>
  `${prefix}-${datePaiement.replace(/-/g, '')}-${String(randomInt(0, 10 ** digits)).padStart(digits, '0')}`;

/** Référence automatique garantie unique : 4 chiffres, rejouée en cas de collision, puis 6 chiffres si la journée est saturée. */
async function autoReference(prefix, datePaiement) {
  for (let i = 0; i < 60; i++) {
    const ref = randomReference(prefix, datePaiement, i < 40 ? 4 : 6);
    if (!(await repos.cotisations.findOne({ where: { reference: ref } }))) return ref;
  }
  throw conflict('Impossible de générer une référence unique : réessayez.');
}

export function enregistrerCotisation(user, data, options = {}) {
  return tx(async () => {
    const adh = await getAdherentOrFail(data.adherentId || data.matricule);
    if (adh.statut === 'Radié') throw badRequest(`${adh.matricule} est radié : aucune cotisation ne peut être enregistrée.`);

    const derived = moisAnneeFromDate(data.datePaiement);
    const reference = data.reference || (await autoReference('REC', data.datePaiement));
    await ensureReferenceUnique(data.reference);

    const cot = {
      id: options.id || newId('cot'),
      adherentId: adh.id,
      matricule: adh.matricule,
      adherentNomPrenom: nom(adh),
      datePaiement: data.datePaiement,
      montant: data.montant,
      modePaiement: data.modePaiement,
      reference,
      mois: data.mois || derived.mois,
      annee: data.annee || derived.annee,
      agentEnregistreur: data.agentEnregistreur || user.nom,
      observations: data.observations,
      estRegularisation: false,
      createdAt: nowIso(),
    };
    await repos.cotisations.insert(cot);
    await appliquerSeuilImmatriculation(adh);

    await logOperation(user, {
      agentEnregistreur: cot.agentEnregistreur,
      action: 'AJOUT',
      typeOperation: 'ENREGISTREMENT_COTISATION',
      entite: 'Cotisation',
      adherentMatricule: adh.matricule,
      adherentNom: cot.adherentNomPrenom,
      details: `Enregistrement cotisation ${cot.montant} FCFA (${cot.modePaiement}) pour ${adh.matricule} — Enregistré par : ${cot.agentEnregistreur} (${user.role})`,
      description: `Encaissement de ${cot.montant} FCFA (${cot.modePaiement}) pour ${adh.matricule}`,
      nouvellesInformations: `Mois: ${cot.mois} ${cot.annee}, Réf: ${cot.reference}, Agent: ${cot.agentEnregistreur}`,
    });
    return repos.cotisations.get(cot.id);
  });
}

export function modifierCotisation(user, id, data) {
  return tx(async () => {
    const cur = await repos.cotisations.get(id);
    if (!cur) throw notFound('Cotisation introuvable.');
    if (data.reference) await ensureReferenceUnique(data.reference, cur.id);

    const patch = { ...data };
    if (data.datePaiement && !data.mois && !data.annee) Object.assign(patch, moisAnneeFromDate(data.datePaiement));
    const upd = await repos.cotisations.patch(cur.id, patch);
    const adh = await repos.adherents.get(cur.adherentId);
    if (adh) await appliquerSeuilImmatriculation(adh);

    await logOperation(user, {
      agentEnregistreur: user.nom,
      action: 'MODIFICATION',
      codeSecuriteValide: true,
      typeOperation: 'MODIFICATION_COTISATION',
      entite: 'Cotisation',
      adherentMatricule: cur.matricule,
      adherentNom: cur.adherentNomPrenom,
      details: `Modification cotisation ${cur.matricule} (${cur.montant} -> ${upd.montant} FCFA) validée par code — Opérateur : ${user.nom} (${user.role})`,
      description: `Modification d'une cotisation de ${cur.montant} FCFA sur ${cur.matricule} (validé par code)`,
      anciennesInformations: `Montant: ${cur.montant}, Mode: ${cur.modePaiement}, Date: ${cur.datePaiement}`,
      nouvellesInformations: `Montant: ${upd.montant}, Mode: ${upd.modePaiement}, Date: ${upd.datePaiement}`,
    });
    return upd;
  });
}

export function supprimerCotisation(user, id) {
  return tx(async () => {
    const cur = await repos.cotisations.get(id);
    if (!cur) throw notFound('Cotisation introuvable.');
    await repos.cotisations.delete(id);
    await logOperation(user, {
      agentEnregistreur: user.nom,
      action: 'SUPPRESSION',
      codeSecuriteValide: true,
      typeOperation: 'SUPPRESSION_COTISATION',
      entite: 'Cotisation',
      adherentMatricule: cur.matricule,
      adherentNom: cur.adherentNomPrenom,
      details: `Suppression de la cotisation de ${cur.montant} FCFA sur ${cur.matricule} validée par code — Opérateur : ${user.nom} (${user.role})`,
      description: `Suppression d'une cotisation de ${cur.montant} FCFA sur ${cur.matricule}`,
      anciennesInformations: `Réf: ${cur.reference || 'N/A'}, Date: ${cur.datePaiement}, Montant: ${cur.montant}`,
    });
    return cur;
  });
}

/**
 * Régularisation rétroactive (DAF, DGA, DG, Administrateur) :
 *  - avec cotisationId : rectifie/complète une cotisation existante
 *  - sans cotisationId : crée une cotisation de rattrapage d'arriérés
 */
export function regulariserCotisation(user, p) {
  return tx(async () => {
    const operateur = `${user.nom} (${user.role})`;
    const reference = p.reference || (await autoReference('REG', p.datePaiement));
    const dateReg = nowIso();
    const periode = `${p.mois} ${p.annee}`;
    let saved;

    if (p.cotisationId) {
      const cur = await repos.cotisations.get(p.cotisationId);
      if (!cur) throw notFound("Cotisation d'origine introuvable.");
      await ensureReferenceUnique(p.reference, cur.id);
      const initial = p.montantAnterieurInitial ?? cur.montant;
      saved = await repos.cotisations.patch(cur.id, {
        montant: p.montant,
        modePaiement: p.modePaiement,
        datePaiement: p.datePaiement,
        mois: p.mois,
        annee: p.annee,
        reference,
        observations: p.observations || cur.observations,
        estRegularisation: true,
        typeRegularisation: p.typeRegularisation,
        motifRegularisation: p.motifRegularisation,
        montantAnterieurInitial: initial,
        montantComplementaire: p.montantComplementaire ?? Math.max(0, round2(p.montant - cur.montant)),
        regularisePar: operateur,
        dateRegularisation: dateReg,
        datePaiementEffective: p.datePaiement,
        periodeConcernee: periode,
      });
      await logOperation(user, {
        agentEnregistreur: operateur,
        action: 'REGULARISATION',
        typeOperation: 'REGULARISATION_COTISATION',
        entite: 'Cotisation',
        adherentMatricule: cur.matricule,
        adherentNom: cur.adherentNomPrenom,
        details: `Régularisation pour ${cur.matricule} (${initial} F ➔ ${p.montant} FCFA, mois : ${periode}) — Validé par : ${operateur}. Motif : ${p.motifRegularisation}`,
        description: `Régularisation rétroactive d'une cotisation pour ${cur.matricule} (${p.typeRegularisation})`,
        anciennesInformations: `Montant initial: ${initial} FCFA, Date: ${cur.datePaiement}, Période: ${cur.mois} ${cur.annee}`,
        nouvellesInformations: `Nouveau montant: ${p.montant} FCFA, Date rétroactive: ${p.datePaiement}, Période: ${periode}, Réf: ${reference}, Motif: ${p.motifRegularisation}`,
      });
    } else {
      const adh = await getAdherentOrFail(p.adherentId || p.matricule);
      await ensureReferenceUnique(p.reference);
      const id = newId('cot-reg');
      await repos.cotisations.insert({
        id,
        adherentId: adh.id,
        matricule: adh.matricule,
        adherentNomPrenom: nom(adh),
        datePaiement: p.datePaiement,
        montant: p.montant,
        modePaiement: p.modePaiement,
        reference,
        mois: p.mois,
        annee: p.annee,
        agentEnregistreur: operateur,
        observations: p.observations,
        createdAt: nowIso(),
        estRegularisation: true,
        typeRegularisation: p.typeRegularisation,
        motifRegularisation: p.motifRegularisation,
        montantAnterieurInitial: p.montantAnterieurInitial,
        montantComplementaire: p.montantComplementaire || p.montant,
        regularisePar: operateur,
        dateRegularisation: dateReg,
        datePaiementEffective: p.datePaiement,
        periodeConcernee: periode,
      });
      saved = await repos.cotisations.get(id);
      await logOperation(user, {
        agentEnregistreur: operateur,
        action: 'REGULARISATION',
        typeOperation: 'REGULARISATION_COTISATION',
        entite: 'Cotisation',
        adherentMatricule: adh.matricule,
        adherentNom: nom(adh),
        details: `Régularisation rétroactive : versement de ${fmtMoney(p.montant)} (${p.modePaiement}) pour ${adh.matricule} (Période : ${periode}) — Validé par : ${operateur}. Motif : ${p.motifRegularisation}`,
        description: `Régularisation rétroactive de ${fmtMoney(p.montant)} pour ${adh.matricule} (${p.typeRegularisation})`,
        nouvellesInformations: `Montant régularisé: ${p.montant} FCFA, Période: ${periode}, Date effective: ${p.datePaiement}, Réf: ${reference}, Motif: ${p.motifRegularisation}`,
      });
    }

    const adh = await repos.adherents.get(saved.adherentId);
    if (adh) await appliquerSeuilImmatriculation(adh);
    return saved;
  });
}
