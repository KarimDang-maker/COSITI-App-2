/**
 * Règles métier COSITI — port de src/utils/helpers.ts (statistiques d'adhérent, alertes, matricule).
 */

import { sumMoney } from './money.js';

export const formatFCFA = (amount) => {
  const n = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA';
};

/** Accepte les variantes de casse, d'accents et d'espaces issues des imports historiques. */
export const estStatutImmatricule = (value) => String(value ?? '')
  .trim()
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLocaleLowerCase('fr') === 'immatricule';

export function generateNextMatricule(derniereSequence) {
  const nextSeq = (derniereSequence || 0) + 1;
  return { matricule: `COSITI-${String(nextSeq).padStart(4, '0')}`, sequence: nextSeq };
}

const belongsTo = (c, adh) => c.adherentId === adh.id || c.matricule === adh.matricule;

export function calculateAdherentStats(adherent, allCotisations, parametres, currentDate = new Date()) {
  const memberCotisations = allCotisations
    .filter((c) => belongsTo(c, adherent))
    .sort((a, b) => new Date(b.datePaiement) - new Date(a.datePaiement));

  const totalCumule = sumMoney(memberCotisations, 'montant');

  const curMonth = currentDate.getMonth();
  const curYear = currentDate.getFullYear();
  const curDay = currentDate.toISOString().slice(0, 10);

  const sumWhere = (pred) => sumMoney(memberCotisations.filter(pred), 'montant');
  const totalCeMois = sumWhere((c) => {
    const d = new Date(c.datePaiement);
    return d.getMonth() === curMonth && d.getFullYear() === curYear;
  });
  const totalCetteAnnee = sumWhere((c) => new Date(c.datePaiement).getFullYear() === curYear);
  const totalAujourdhui = sumWhere((c) => c.datePaiement === curDay);

  const dernierPaiement = memberCotisations[0];
  const tarifJournalier = adherent.tarifJournalier || 700;
  const nombreJoursCotises = Math.floor(totalCumule / tarifJournalier);

  // Règle métier : retard calculé sur un cycle mensuel de 30 jours, réactualisé chaque mois.
  const CYCLE = 30;
  const jourMoisEngage = Math.min(CYCLE, Math.max(1, currentDate.getDate()));
  const joursCotisesCeMois = Math.min(CYCLE, Math.floor(totalCeMois / tarifJournalier));
  const retardMoisEngage = Math.max(0, jourMoisEngage - joursCotisesCeMois);

  let dateDebut = new Date(adherent.dateAdhesion);
  if (Number.isNaN(dateDebut.getTime())) dateDebut = new Date(curYear, curMonth, 1);
  const diffMois = curMonth - dateDebut.getMonth() + (curYear - dateDebut.getFullYear()) * 12;
  const moisCompletsAnterieurs = Math.max(0, diffMois);
  const joursDusTotal = moisCompletsAnterieurs * CYCLE + jourMoisEngage;

  let joursRetard = 0;
  let statutCotisation = 'Sans cotisation';

  if (memberCotisations.length === 0) {
    joursRetard = Math.min(CYCLE, jourMoisEngage);
    if (moisCompletsAnterieurs > 0) joursRetard = Math.max(joursRetard, Math.min(CYCLE, joursDusTotal));
  } else if (joursCotisesCeMois >= jourMoisEngage) {
    statutCotisation = 'À jour';
  } else {
    joursRetard = Math.max(0, retardMoisEngage);
    statutCotisation = joursRetard === 0 ? 'À jour' : 'En retard';
  }

  const seuil = parametres.seuilImmatriculation || 15000;
  return {
    totalCumule,
    totalCeMois,
    totalCetteAnnee,
    totalAujourdhui,
    dernierPaiement,
    nombreVersements: memberCotisations.length,
    nombreJoursCotises,
    statutCotisation,
    joursRetard,
    montantRetard: joursRetard * tarifJournalier,
    joursCotisesCeMois,
    retardMoisEngage,
    jourMoisEngage,
    seuilAtteint: totalCumule >= seuil,
    montantRestantPourSeuil: Math.max(0, seuil - totalCumule),
    pourcentageSeuil: Math.min(100, Math.round((totalCumule / seuil) * 100)),
  };
}

const DOSSIER_CLOS = ['Dossier complet', 'Dossier transmis', 'Dossier traité', 'Sans enfant (Non éligible allocations)'];

export function generateAlerts(adherents, cotisations, dossiers, parametres, referenceDate = new Date()) {
  const alerts = [];
  const seuil = parametres.seuilImmatriculation || 15000;
  const day = referenceDate.getDate();
  const iso = referenceDate.toISOString();

  // Index des cotisations par adhérent pour éviter un O(n²) sur de gros volumes
  const byAdh = new Map();
  for (const c of cotisations) {
    for (const key of [c.adherentId, c.matricule]) {
      if (!key) continue;
      if (!byAdh.has(key)) byAdh.set(key, new Set());
      byAdh.get(key).add(c);
    }
  }

  for (const adh of adherents) {
    const mine = [...new Set([...(byAdh.get(adh.id) || []), ...(byAdh.get(adh.matricule) || [])])];
    const stats = calculateAdherentStats(adh, mine, parametres, referenceDate);
    const nom = `${adh.nom} ${adh.prenom}`;
    const base = {
      adherentId: adh.id, matricule: adh.matricule, nomAdherent: nom, adherentNom: nom,
      dateCreation: iso, dateDeclenchement: iso,
    };

    // A. Non à jour
    if (adh.statut === 'Actif' && (stats.statutCotisation === 'En retard' || stats.statutCotisation === 'Sans cotisation')) {
      const sans = stats.statutCotisation === 'Sans cotisation';
      alerts.push({
        ...base,
        id: `alert-retard-${adh.id}`,
        type: 'NON_A_JOUR',
        titre: `Adhérent non à jour : ${nom}`,
        message: sans
          ? `Attention : ${adh.matricule} n'a effectué aucun versement depuis son adhésion (${stats.joursRetard} jours de retard).`
          : `Attention : cet adhérent n’est pas à jour de ses cotisations (dernier versement il y a ${stats.joursRetard} jours).`,
        niveau: stats.joursRetard > 25 ? 'urgent' : 'warning',
        actionRequise: 'Régulariser cotisation',
        details: {
          dernierPaiement: stats.dernierPaiement ? stats.dernierPaiement.datePaiement : 'Aucun',
          montantCumule: stats.totalCumule,
          montantRestant: Math.max(0, adh.tarifJournalier * 30 - stats.totalCeMois),
          joursRetard: stats.joursRetard,
        },
      });
    }

    // B. Seuil d'immatriculation atteint
    if (stats.seuilAtteint && !estStatutImmatricule(adh.statutImmatriculation)) {
      alerts.push({
        ...base,
        id: `alert-seuil-${adh.id}`,
        type: 'SEUIL_15000_ATTEINT',
        titre: `Seuil ${formatFCFA(seuil)} atteint : ${adh.matricule}`,
        message: `Alerte immatriculation : l'adhérent ${adh.matricule} (${nom}) a atteint ${formatFCFA(stats.totalCumule)} de cotisations. Veuillez procéder à son immatriculation CNPS.`,
        niveau: 'urgent',
        actionRequise: 'Immatriculer CNPS',
        details: {
          montantCumule: stats.totalCumule,
          statutImmatriculation: adh.statutImmatriculation,
          dateSeuilAtteint: stats.dernierPaiement?.datePaiement || adh.dateAdhesion,
        },
      });

      // C. Vérification périodique 15 / 30
      alerts.push({
        ...base,
        id: `alert-verif1530-${adh.id}`,
        type: 'VERIFICATION_15_30',
        titre: `Vérification périodique (Cycle 15/30) : ${adh.matricule}`,
        message: `Alerte : cet adhérent a atteint le seuil de cotisation requis (${formatFCFA(stats.totalCumule)}) et doit être immatriculé.`,
        niveau: 'urgent',
        actionRequise: 'Immatriculer CNPS',
        details: { montantCumule: stats.totalCumule, isCycle15or30: [15, 28, 30, 31].includes(day) },
      });
    }

    // D. Dossier d'allocations à constituer (adhérents immatriculés, hors travailleurs sans enfant)
    if (estStatutImmatricule(adh.statutImmatriculation)) {
      const dossier = dossiers.find((d) => d.adherentId === adh.id || d.matricule === adh.matricule);
      const sansEnfant =
        adh.sansEnfant === true || dossier?.sansEnfant === true || dossier?.statut === 'Sans enfant (Non éligible allocations)';
      if (sansEnfant) continue;

      if (!dossier || !DOSSIER_CLOS.includes(dossier.statut)) {
        alerts.push({
          ...base,
          id: `alert-dossier-${adh.id}`,
          type: 'DOSSIER_ALLOCATIONS',
          titre: `Dossier allocations familiales : ${nom}`,
          message: `Dossier d’allocations familiales à constituer : cet adhérent est immatriculé (${adh.numeroCnps || 'CNPS en attente'}) et doit compléter son dossier. Note : si ce travailleur n'a pas d'enfants, déclarez-le comme sans enfant pour clore l'alerte.`,
          niveau: 'warning',
          actionRequise: 'Constituer dossier',
          details: {
            statutImmatriculation: adh.statutImmatriculation,
            piecesManquantes: dossier ? dossier.pieces.filter((p) => p.obligatoire && !p.recu).map((p) => p.nom) : ['Dossier non encore créé'],
            peutEtreSansEnfant: true,
            nombreEnfants: dossier ? dossier.nombreEnfants || 0 : adh.nombreEnfants || 0,
          },
        });
      }
    }
  }
  return alerts;
}

/** Origine des fonds d'un décaissement : seules les cotisations CNPS relèvent de l'exploitation. */
export function resolveOrigineDecaissement(d) {
  if (d.origineFonds === 'Exploitation (Cotisations CNPS)') return d.origineFonds;
  if (d.origineFonds === 'Apport personnel du PCA') return d.origineFonds;
  const txt = [d.categorie, d.motif, d.observations].map((s) => (s || '').toLowerCase());
  if (txt.some((s) => s.includes('cnps')) || txt[0].includes('sécurité sociale')) return 'Exploitation (Cotisations CNPS)';
  return 'Apport personnel du PCA';
}
