import { repos } from '../db/repository.js';
import { sumMoney } from '../utils/money.js';

/**
 * Suivi chronologique des versements bancaires — port de src/utils/versementTracking.ts.
 * Un versement couvre une "tranche" de cotisations : du point d'arrêt du versement précédent
 * jusqu'à la dernière cotisation incluse (son propre point d'arrêt).
 */

const byDateAsc = (dateKey) => (a, b) =>
  new Date(a[dateKey]) - new Date(b[dateKey]) || new Date(a.createdAt || a[dateKey]) - new Date(b.createdAt || b[dateKey]);

export const cotisationsChrono = async () => (await repos.cotisations.all()).sort(byDateAsc('datePaiement'));
export const versementsChrono = async () => (await repos.versements.all()).sort(byDateAsc('date'));

/** Repère laissé par un versement donné (explicite, sinon déduit de la dernière cotisation à sa date) */
function repereDe(versement, cotisations) {
  if (versement.arretCotisationDate && versement.arretCotisationNom) {
    return {
      date: versement.arretCotisationDate,
      nom: versement.arretCotisationNom,
      matricule: versement.arretCotisationMatricule,
      montant: versement.arretCotisationMontant,
      cotisationId: versement.arretCotisationId,
      reference: versement.arretCotisationRef,
      bordereau: versement.numeroBordereau,
      banque: versement.banque,
      estPremierVersement: false,
    };
  }
  const jusque = cotisations.filter((c) => new Date(c.datePaiement) <= new Date(versement.date));
  const last = jusque[jusque.length - 1];
  return last
    ? { date: last.datePaiement, nom: last.adherentNomPrenom, matricule: last.matricule, montant: last.montant, cotisationId: last.id, reference: last.reference, bordereau: versement.numeroBordereau, banque: versement.banque, estPremierVersement: false }
    : { date: versement.date, nom: 'Cotisations antérieures', montant: versement.montant, bordereau: versement.numeroBordereau, banque: versement.banque, estPremierVersement: false };
}

/**
 * Complète un versement avec ses repères (précédent / actuel) et sa tranche de cotisations.
 * Les valeurs explicitement fournies par l'utilisateur sont conservées.
 */
export async function completerVersement(data, selfId) {
  const cotisations = await cotisationsChrono();
  const versements = (await versementsChrono()).filter((v) => v.id !== selfId && new Date(v.date) <= new Date(data.date));
  const out = { ...data };

  const prev = versements[versements.length - 1] || null;
  const prevRepere = prev ? repereDe(prev, cotisations) : null;
  if (prevRepere && !out.arretPrecedentDate) {
    out.arretPrecedentDate = prevRepere.date;
    out.arretPrecedentNom = prevRepere.nom;
    out.arretPrecedentMatricule = prevRepere.matricule;
    out.arretPrecedentMontant = prevRepere.montant;
    out.arretPrecedentBordereau = prevRepere.bordereau;
    out.arretPrecedentCotisationId = prevRepere.cotisationId;
  }

  // Point d'arrêt de ce versement : cotisation désignée, sinon la dernière cotisation à la date du versement
  let arret = out.arretCotisationId ? cotisations.find((c) => c.id === out.arretCotisationId) : null;
  if (!arret && !out.arretCotisationDate) {
    const jusque = cotisations.filter((c) => new Date(c.datePaiement) <= new Date(data.date));
    arret = jusque[jusque.length - 1] || null;
  }
  if (arret) {
    out.arretCotisationId = arret.id;
    out.arretCotisationDate = arret.datePaiement;
    out.arretCotisationNom = arret.adherentNomPrenom;
    out.arretCotisationMatricule = arret.matricule;
    out.arretCotisationMontant = arret.montant;
    out.arretCotisationRef = arret.reference;
  }

  // Tranche couverte : (repère précédent, repère actuel]
  if (out.nbCotisationsIncluses === undefined && arret) {
    const idxArret = cotisations.findIndex((c) => c.id === arret.id);
    let idxPrev = -1;
    if (out.arretPrecedentCotisationId) idxPrev = cotisations.findIndex((c) => c.id === out.arretPrecedentCotisationId);
    // cotisation du point d'arrêt précédent supprimée depuis : on se replace d'après sa date
    if (idxPrev === -1 && out.arretPrecedentDate) {
      idxPrev = cotisations.reduce((acc, c, i) => (new Date(c.datePaiement) <= new Date(out.arretPrecedentDate) ? i : acc), -1);
    }
    const tranche = cotisations.slice(idxPrev + 1, idxArret + 1);
    out.nbCotisationsIncluses = tranche.length;
    out.cumulCotisationsIncluses = sumMoney(tranche, 'montant');
  }
  return out;
}

/** Cotisations encore à verser en banque depuis le dernier point d'arrêt. */
export async function cotisationsEnAttente() {
  const cotisations = await cotisationsChrono();
  const dernier = (await versementsChrono()).pop() || null;
  const repere = dernier ? repereDe(dernier, cotisations) : null;

  let enAttente = cotisations;
  if (repere) {
    const idx = repere.cotisationId ? cotisations.findIndex((c) => c.id === repere.cotisationId) : -1;
    enAttente = idx !== -1 ? cotisations.slice(idx + 1) : cotisations.filter((c) => new Date(c.datePaiement) > new Date(repere.date));
  }
  return {
    dernierVersement: dernier ? { id: dernier.id, date: dernier.date, banque: dernier.banque, numeroBordereau: dernier.numeroBordereau } : null,
    reperePrecedent: repere || { estPremierVersement: true },
    nombre: enAttente.length,
    totalMontant: sumMoney(enAttente, 'montant'),
    cotisations: enAttente,
  };
}

/**
 * Repères d'un versement (d'où il est parti / où il s'est arrêté) — valeurs enregistrées, sinon déduites des cotisations
 * (données historiques sans point d'arrêt). Joints à chaque versement renvoyé par l'API : le front ne les recalcule plus.
 */
export async function decorerVersements(list) {
  if (!list.length) return list;
  const [cotisations, versements] = await Promise.all([cotisationsChrono(), versementsChrono()]);
  const derniereJusque = (date) => {
    const jusque = cotisations.filter((c) => new Date(c.datePaiement) <= new Date(date));
    return jusque[jusque.length - 1];
  };

  return list.map((v) => {
    // repère précédent
    let precedent;
    if (v.arretPrecedentDate && v.arretPrecedentNom) {
      precedent = { date: v.arretPrecedentDate, nom: v.arretPrecedentNom, matricule: v.arretPrecedentMatricule, montant: v.arretPrecedentMontant, bordereau: v.arretPrecedentBordereau, cotisationId: v.arretPrecedentCotisationId, estPremierVersement: false };
    } else {
      const idx = versements.findIndex((x) => x.id === v.id);
      const prev = idx > 0 ? versements[idx - 1] : idx === -1 ? versements.filter((x) => new Date(x.date) <= new Date(v.date)).pop() : null;
      if (!prev) precedent = { estPremierVersement: true };
      else if (prev.arretCotisationDate && prev.arretCotisationNom) {
        precedent = { date: prev.arretCotisationDate, nom: prev.arretCotisationNom, matricule: prev.arretCotisationMatricule, montant: prev.arretCotisationMontant, bordereau: prev.numeroBordereau, banque: prev.banque, cotisationId: prev.arretCotisationId, reference: prev.arretCotisationRef, estPremierVersement: false };
      } else {
        const c = derniereJusque(prev.date);
        precedent = c
          ? { date: c.datePaiement, nom: c.adherentNomPrenom, matricule: c.matricule, montant: c.montant, bordereau: prev.numeroBordereau, banque: prev.banque, cotisationId: c.id, reference: c.reference, estPremierVersement: false }
          : { date: prev.date, nom: 'Cotisations antérieures', montant: prev.montant, bordereau: prev.numeroBordereau, banque: prev.banque, estPremierVersement: false };
      }
    }
    // repère actuel
    let actuel = { date: v.arretCotisationDate, nom: v.arretCotisationNom, matricule: v.arretCotisationMatricule, montant: v.arretCotisationMontant, cotisationId: v.arretCotisationId, reference: v.arretCotisationRef };
    if (!actuel.date || !actuel.nom) {
      const c = derniereJusque(v.date);
      if (c) actuel = { date: c.datePaiement, nom: c.adherentNomPrenom, matricule: c.matricule, montant: c.montant, cotisationId: c.id, reference: c.reference };
    }
    return { ...v, reperes: { precedent, actuel } };
  });
}
