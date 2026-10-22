import * as XLSX from 'xlsx';
import { repos } from '../db/repository.js';
import { tx, query } from '../db/database.js';
import { getUserPermissions } from '../utils/permissions.js';
import { calculateAdherentStats } from '../utils/business.js';
import { round2 } from '../utils/money.js';
import { nowIso } from '../utils/ids.js';
import { badRequest, forbidden, HttpError } from '../utils/httpError.js';
import { logOperation } from './journal.js';
import * as adherentsSvc from './adherents.js';
import * as cotisationsSvc from './cotisations.js';
import { createSchema as adherentCreate, updateSchema as adherentUpdate } from '../routes/adherents.routes.js';
import { createSchema as cotisationCreate, updateSchema as cotisationUpdate } from '../routes/cotisations.routes.js';
import * as entities from '../routes/entities.js';

/**
 * ÉCHANGE DE DONNÉES EXCEL — un seul format, dans les deux sens.
 *
 * Le catalogue SHEETS décrit, pour chaque donnée, sa feuille et ses colonnes. Il sert à :
 *   - EXPORTER   (les mêmes en-têtes, les mêmes unités : montants numériques en FCFA, dates AAAA-MM-JJ),
 *   - fournir un MODÈLE vierge,
 *   - IMPORTER   (le fichier exporté est relu tel quel, après modification hors de l'application).
 * À l'import, chaque ligne passe par les mêmes schémas de validation, services métier et journal que les écrans :
 * une ligne importée est traitée exactement comme une saisie manuelle.
 */

export const FORMAT = { nom: 'COSITI-ECHANGE', version: 1 };
const MAX_ROWS_PER_SHEET = 10000;
const MAX_COLUMNS = 100;
const MAX_SHEETS = 40;
const MAX_ERRORS_PER_SHEET = 200;
const ID_RE = /^[A-Za-z0-9._-]{1,64}$/;

const ID_COL = { h: 'ID (ne pas modifier)', f: 'id', t: 's' };

/** t : s texte · n nombre (FCFA) · d date AAAA-MM-JJ · b Oui/Non · ro : colonne calculée par le serveur (export seul, ignorée à l'import) */
export const SHEETS = [
  {
    id: 'gestionnaires', feuille: 'Gestionnaires', repo: 'gestionnaires', write: 'canConfigure', cle: 'Code',
    columns: [
      ID_COL,
      { h: 'Code', f: 'code', t: 's' },
      { h: 'Nom', f: 'nom', t: 's', req: true },
      { h: 'Prénom', f: 'prenom', t: 's', req: true },
      { h: 'Téléphone', f: 'telephone', t: 's', req: true },
      { h: 'E-mail', f: 'email', t: 's' },
      { h: 'Zone / Secteur', f: 'zoneSecteur', t: 's', req: true },
      { h: 'Statut', f: 'statut', t: 's' },
      { h: 'Objectif mensuel de recouvrement (FCFA)', f: 'objectifsRecouvrementMensuel', t: 'n' },
      { h: 'Notes', f: 'notes', t: 's' },
    ],
  },
  {
    id: 'adherents', feuille: 'Adhérents', repo: 'adherents', write: 'canRecord', cle: 'Matricule',
    columns: [
      ID_COL,
      { h: 'Matricule', f: 'matricule', t: 's' },
      { h: 'Nom', f: 'nom', t: 's', req: true },
      { h: 'Prénom', f: 'prenom', t: 's', req: true },
      { h: 'Sexe (M/F)', f: 'sexe', t: 's' },
      { h: 'Date de naissance', f: 'dateNaissance', t: 'd' },
      { h: 'Lieu de naissance', f: 'lieuNaissance', t: 's' },
      { h: 'CNI', f: 'cni', t: 's' },
      { h: 'Téléphone', f: 'telephone', t: 's', req: true },
      { h: 'Adresse', f: 'adresse', t: 's' },
      { h: 'Profession', f: 'profession', t: 's', req: true },
      { h: "Date d'adhésion", f: 'dateAdhesion', t: 'd' },
      { h: 'Statut', f: 'statut', t: 's' },
      { h: "Statut d'immatriculation", f: 'statutImmatriculation', t: 's' },
      { h: 'N° CNPS', f: 'numeroCnps', t: 's' },
      { h: "Date d'immatriculation", f: 'dateImmatriculation', t: 'd' },
      { h: 'Tarif journalier (FCFA)', f: 'tarifJournalier', t: 'n' },
      { h: 'Assiette cotisable CNPS (FCFA)', f: 'salaireCotisableCnps', t: 'n' },
      { h: 'Gestionnaire (code)', f: 'gestionnaireCode', t: 's' },
      { h: "Nombre d'enfants", f: 'nombreEnfants', t: 'n' },
      { h: 'Sans enfant (Oui/Non)', f: 'sansEnfant', t: 'b' },
      { h: 'Observations', f: 'observations', t: 's' },
      { h: 'Total cotisé (FCFA) [calculé]', f: '_totalCumule', t: 'n', ro: true },
      { h: 'Statut de cotisation [calculé]', f: '_statutCotisation', t: 's', ro: true },
      { h: 'Jours de retard [calculé]', f: '_joursRetard', t: 'n', ro: true },
    ],
  },
  {
    id: 'banques', feuille: 'Banques', repo: 'banques', write: 'canManageFinances', read: 'canManageFinances', cle: 'Nom',
    columns: [
      { h: 'Nom', f: 'nom', t: 's', req: true },
      { h: 'Active (Oui/Non)', f: 'actif', t: 'b' },
    ],
  },
  {
    id: 'cotisations', feuille: 'Cotisations', repo: 'cotisations', write: 'canRecord', cle: 'Référence',
    columns: [
      ID_COL,
      { h: 'Référence', f: 'reference', t: 's' },
      { h: 'Date de paiement', f: 'datePaiement', t: 'd', req: true },
      { h: 'Matricule adhérent', f: 'matricule', t: 's', req: true },
      { h: 'Nom adhérent [calculé]', f: 'adherentNomPrenom', t: 's', ro: true },
      { h: 'Montant (FCFA)', f: 'montant', t: 'n', req: true },
      { h: 'Mode de paiement', f: 'modePaiement', t: 's', req: true },
      { h: 'Mois', f: 'mois', t: 's' },
      { h: 'Année', f: 'annee', t: 'n' },
      { h: 'Agent enregistreur', f: 'agentEnregistreur', t: 's' },
      { h: 'Observations', f: 'observations', t: 's' },
      { h: 'Régularisation [calculé]', f: 'estRegularisation', t: 'b', ro: true },
    ],
  },
  {
    id: 'depenses', feuille: 'Dépenses', repo: 'depenses', write: 'canManageFinances', read: 'canManageFinances', service: () => entities.depenses.service,
    signature: (v) => [v.date, v.montant, v.categorie, v.motif, v.numeroPiece].join('|'), cle: 'ID ou date + montant + motif + N° pièce',
    columns: [
      ID_COL,
      { h: 'Date', f: 'date', t: 'd', req: true },
      { h: 'Catégorie', f: 'categorie', t: 's', req: true },
      { h: 'Motif', f: 'motif', t: 's', req: true },
      { h: 'Montant (FCFA)', f: 'montant', t: 'n', req: true },
      { h: 'Mode de paiement', f: 'modePaiement', t: 's', req: true },
      { h: 'Bénéficiaire', f: 'beneficiaire', t: 's', req: true },
      { h: 'N° pièce', f: 'numeroPiece', t: 's', req: true },
      { h: 'Statut', f: 'statut', t: 's' },
      { h: 'Origine des fonds', f: 'origineFonds', t: 's' },
      { h: 'Observations', f: 'observations', t: 's' },
      { h: 'Enregistré par [calculé]', f: 'enregistrePar', t: 's', ro: true },
    ],
  },
  {
    id: 'versements', feuille: 'Versements', repo: 'versements', write: 'canManageFinances', read: 'canManageFinances', service: () => entities.versements.service,
    signature: (v) => [v.date, v.banque, v.numeroBordereau, v.montant].join('|'), cle: 'ID ou date + banque + N° bordereau + montant',
    columns: [
      ID_COL,
      { h: 'Date', f: 'date', t: 'd', req: true },
      { h: 'Banque', f: 'banque', t: 's', req: true },
      { h: 'N° compte', f: 'numeroCompte', t: 's' },
      { h: 'N° bordereau', f: 'numeroBordereau', t: 's', req: true },
      { h: 'Montant (FCFA)', f: 'montant', t: 'n', req: true },
      { h: 'Source des fonds', f: 'sourceFonds', t: 's', req: true },
      { h: 'Déposant', f: 'deposant', t: 's', req: true },
      { h: 'Statut', f: 'statut', t: 's' },
      { h: 'Observations', f: 'observations', t: 's' },
      // Suivi chronologique : le point d'arrêt et la tranche de cotisations couvertes sont des données stockées
      // (calculées à la saisie, puis conservées) : elles voyagent dans le fichier pour qu'un réimport soit fidèle.
      { h: 'Cotisations couvertes (nombre)', f: 'nbCotisationsIncluses', t: 'n' },
      { h: 'Cumul des cotisations couvertes (FCFA)', f: 'cumulCotisationsIncluses', t: 'n' },
      { h: "Point d'arrêt - ID cotisation", f: 'arretCotisationId', t: 's' },
      { h: "Point d'arrêt - date", f: 'arretCotisationDate', t: 'd' },
      { h: "Point d'arrêt - adhérent", f: 'arretCotisationNom', t: 's' },
      { h: "Point d'arrêt - matricule", f: 'arretCotisationMatricule', t: 's' },
      { h: "Point d'arrêt - montant (FCFA)", f: 'arretCotisationMontant', t: 'n' },
      { h: "Point d'arrêt - référence", f: 'arretCotisationRef', t: 's' },
      { h: 'Versement précédent - ID cotisation', f: 'arretPrecedentCotisationId', t: 's' },
      { h: 'Versement précédent - date', f: 'arretPrecedentDate', t: 'd' },
      { h: 'Versement précédent - adhérent', f: 'arretPrecedentNom', t: 's' },
      { h: 'Versement précédent - matricule', f: 'arretPrecedentMatricule', t: 's' },
      { h: 'Versement précédent - montant (FCFA)', f: 'arretPrecedentMontant', t: 'n' },
      { h: 'Versement précédent - bordereau', f: 'arretPrecedentBordereau', t: 's' },
    ],
  },
  {
    id: 'frais', feuille: 'Frais Mobile Money', repo: 'frais_mobile_money', write: 'canManageFinances', read: 'canManageFinances', service: () => entities.fraisMobileMoney.service,
    signature: (v) => [v.date, v.operateur, v.referenceTransaction, v.montantTransaction].join('|'), cle: 'ID ou date + opérateur + référence + montant',
    columns: [
      ID_COL,
      { h: 'Date', f: 'date', t: 'd', req: true },
      { h: 'Opérateur', f: 'operateur', t: 's', req: true },
      { h: 'Type de frais', f: 'typeFrais', t: 's', req: true },
      { h: 'Montant de la transaction (FCFA)', f: 'montantTransaction', t: 'n', req: true },
      { h: 'Frais prélevés (FCFA)', f: 'fraisPreleves', t: 'n', req: true },
      { h: 'Montant net (FCFA) [calculé]', f: 'montantNet', t: 'n', ro: true },
      { h: 'Référence de la transaction', f: 'referenceTransaction', t: 's', req: true },
      { h: 'Adhérent concerné', f: 'adherentConcerne', t: 's' },
      { h: 'Observations', f: 'observations', t: 's' },
    ],
  },
  {
    id: 'employes', feuille: 'Employés', repo: 'employes', write: 'canManageFinances', read: 'canManageFinances', service: () => entities.employes.service, cle: 'Matricule',
    columns: [
      ID_COL,
      { h: 'Matricule', f: 'matricule', t: 's' },
      { h: 'Nom', f: 'nom', t: 's', req: true },
      { h: 'Prénom', f: 'prenom', t: 's', req: true },
      { h: 'Sexe (M/F)', f: 'sexe', t: 's', req: true },
      { h: 'Poste', f: 'poste', t: 's', req: true },
      { h: 'Département', f: 'departement', t: 's', req: true },
      { h: 'Type de contrat', f: 'typeContrat', t: 's', req: true },
      { h: "Date d'embauche", f: 'dateEmbauche', t: 'd', req: true },
      { h: 'N° CNPS', f: 'numeroCnps', t: 's' },
      { h: 'N° CMU', f: 'numeroCmu', t: 's' },
      { h: 'Salaire de base (FCFA)', f: 'salaireBase', t: 'n', req: true },
      { h: 'Sursalaire (FCFA)', f: 'sursalaire', t: 'n' },
      { h: 'Indemnité de transport (FCFA)', f: 'indemniteTransport', t: 'n' },
      { h: 'Indemnité de logement (FCFA)', f: 'indemniteLogement', t: 'n' },
      { h: 'Primes fixes (FCFA)', f: 'primesFixes', t: 'n' },
      { h: 'Parts fiscales', f: 'nombrePartsFiscales', t: 'n' },
      { h: 'Mode de paiement', f: 'modePaiement', t: 's', req: true },
      { h: 'Banque', f: 'banqueNom', t: 's' },
      { h: 'N° compte bancaire', f: 'numeroCompteBancaire', t: 's' },
      { h: 'Téléphone', f: 'telephone', t: 's', req: true },
      { h: 'E-mail', f: 'email', t: 's' },
      { h: 'Actif (Oui/Non)', f: 'actif', t: 'b' },
      { h: 'Notes', f: 'notes', t: 's' },
    ],
  },
  {
    // Export seul : les bulletins sont CALCULÉS par le serveur (barème CNPS / CGI), ils ne s'importent pas
    id: 'bulletins', feuille: 'Bulletins de paie', repo: 'bulletins_paie', read: 'canManageFinances', exportSeul: true,
    columns: [
      { h: 'ID', f: 'id', t: 's' },
      { h: 'Mois', f: 'mois', t: 's' },
      { h: 'N° bulletin', f: 'bulletinNumero', t: 's' },
      { h: 'Matricule', f: 'employeMatricule', t: 's' },
      { h: 'Nom', f: 'employeNomComplet', t: 's' },
      { h: 'Type', f: 'typeBeneficiaire', t: 's' },
      { h: 'Poste', f: 'employePoste', t: 's' },
      { h: 'Salaire de base (FCFA)', f: 'salaireBase', t: 'n' },
      { h: 'Total des gains bruts (FCFA)', f: 'totalGainsBruts', t: 'n' },
      { h: 'Retenues salariales (FCFA)', f: 'totalRetenuesSalariales', t: 'n' },
      { h: 'Net à payer (FCFA)', f: 'netAPayer', t: 'n' },
      { h: 'Charges patronales (FCFA)', f: 'totalChargesPatronales', t: 'n' },
      { h: "Coût total employeur (FCFA)", f: 'coutTotalEmployeur', t: 'n' },
      { h: 'Statut', f: 'statut', t: 's' },
    ],
  },
];

const SHEET_BY_ID = new Map(SHEETS.map((s) => [s.id, s]));
export const importables = () => SHEETS.filter((s) => !s.exportSeul);

/* ------------------------------------------------------------------ utilitaires */

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\[.*?\]/g, ' ') // « [calculé] »
    .replace(/\(.*?\)/g, ' ') // « (FCFA) », « (M/F) »
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const permsOf = (user) => getUserPermissions(user);
const canRead = (spec, perms) => !spec.read || perms[spec.read];
const canWrite = (spec, perms) => !spec.exportSeul && (!spec.write || perms[spec.write]);

function isoFromDate(d) {
  // tolérance de fuseau : on se place à midi pour qu'un décalage de ±12 h ne change pas le jour
  return new Date(d.getTime() + 12 * 3600_000).toISOString().slice(0, 10);
}

/** Convertit une cellule Excel dans le type de la colonne. Retourne { v } ou { err }. */
function parseCell(raw, t) {
  if (isEmpty(raw)) return { v: undefined };
  switch (t) {
    case 'n': {
      if (typeof raw === 'number') return Number.isFinite(raw) ? { v: raw } : { err: 'nombre invalide' };
      let s = String(raw).replace(/[\s\u00a0]/g, '').replace(/fcfa|f$/i, '');
      if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); // « 1.500 » = mille cinq cents (séparateur de milliers)
      s = s.replace(',', '.');
      const n = Number(s);
      return s !== '' && Number.isFinite(n) ? { v: n } : { err: `« ${raw} » n'est pas un nombre` };
    }
    case 'd': {
      if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? { err: 'date invalide' } : { v: isoFromDate(raw) };
      if (typeof raw === 'number') return raw > 20000 && raw < 80000 ? { v: new Date(Math.floor(raw - 25569) * 86400_000).toISOString().slice(0, 10) } : { err: `« ${raw} » n'est pas une date` };
      const s = String(raw).trim();
      let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(s);
      if (!m) {
        const f = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
        if (f) m = [null, f[3], f[2].padStart(2, '0'), f[1].padStart(2, '0')];
      }
      if (!m) return { err: `« ${s} » n'est pas une date (format attendu AAAA-MM-JJ ou JJ/MM/AAAA)` };
      const iso = `${m[1]}-${m[2]}-${m[3]}`;
      const d = new Date(`${iso}T00:00:00Z`);
      return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? { err: `« ${s} » n'est pas une date valide` } : { v: iso };
    }
    case 'b': {
      if (typeof raw === 'boolean') return { v: raw };
      const s = norm(raw);
      if (['oui', 'o', 'true', 'vrai', '1', 'yes', 'x'].includes(s)) return { v: true };
      if (['non', 'n', 'false', 'faux', '0', 'no'].includes(s)) return { v: false };
      return { err: `« ${raw} » : répondre Oui ou Non` };
    }
    default:
      return { v: String(raw).trim() };
  }
}

const sameValue = (a, b) => {
  if (typeof a === 'number' || typeof b === 'number') return round2(a) === round2(b);
  return String(a ?? '') === String(b ?? '');
};

/* ------------------------------------------------------------------ EXPORT */

const orderBy = {
  adherents: [['matricule', 'asc']], cotisations: [['datePaiement', 'asc']], depenses: [['date', 'asc']], versements: [['date', 'asc']],
  frais_mobile_money: [['date', 'asc']], employes: [['matricule', 'asc']], gestionnaires: [['code', 'asc']], banques: [['nom', 'asc']],
  bulletins_paie: [['mois', 'asc'], ['employeMatricule', 'asc']],
};
const dateField = { cotisations: 'datePaiement', depenses: 'date', versements: 'date', frais_mobile_money: 'date', bulletins_paie: 'mois' };

const cellValue = (v, t) => {
  if (v === undefined || v === null) return '';
  if (t === 'b') return v ? 'Oui' : 'Non';
  if (t === 'n') return Number.isFinite(Number(v)) ? Number(v) : '';
  return String(v);
};

async function exportRows(spec, { ids, du, au }) {
  let docs = await repos[spec.repo].all({ orderBy: orderBy[spec.repo] });
  const df = dateField[spec.repo];
  if (df && (du || au)) {
    const cut = (x) => (spec.repo === 'bulletins_paie' ? String(x || '').slice(0, 7) : String(x || '').slice(0, 10));
    docs = docs.filter((d) => (!du || cut(d[df]) >= cut(du)) && (!au || cut(d[df]) <= cut(au)));
  }
  if (ids?.length) {
    const set = new Set(ids);
    docs = docs.filter((d) => set.has(d.id) || (d.matricule && set.has(d.matricule)));
  }

  if (docs.length > MAX_ROWS_PER_SHEET) {
    throw badRequest(`« ${spec.feuille} » contient ${docs.length} lignes : maximum ${MAX_ROWS_PER_SHEET} par export (et par import). Restreignez la période (du / au).`);
  }
  const extra = {};
  if (spec.id === 'adherents') {
    const [cots, params, gests] = await Promise.all([repos.cotisations.all(), repos.parametres.get('main'), repos.gestionnaires.all()]);
    const code = new Map(gests.map((g) => [g.id, g.code]));
    const parId = new Map(docs.map((a) => [a.id, a]));
    const parMat = new Map(docs.map((a) => [a.matricule, a]));
    const cotsDe = new Map(docs.map((a) => [a.id, []]));
    for (const c of cots) {
      const a = parId.get(c.adherentId) || parMat.get(c.matricule);
      if (a) cotsDe.get(a.id).push(c);
    }
    for (const a of docs) {
      const stats = calculateAdherentStats(a, cotsDe.get(a.id), params);
      extra[a.id] = { gestionnaireCode: code.get(a.gestionnaireId), _totalCumule: stats.totalCumule, _statutCotisation: stats.statutCotisation, _joursRetard: stats.joursRetard };
    }
  }
  return docs.map((d) => spec.columns.map((c) => cellValue({ ...d, ...(extra[d.id] || {}) }[c.f], c.t)));
}

function instructionsSheet(specs) {
  const rows = [['Feuille', 'Colonne', 'Obligatoire à la création', 'Type', 'Calculée par le serveur (ignorée à l\'import)']];
  const type = { s: 'Texte', n: 'Nombre', d: 'Date AAAA-MM-JJ', b: 'Oui / Non' };
  for (const s of specs) for (const c of s.columns) rows.push([s.feuille, c.h, c.req ? 'Oui' : 'Non', type[c.t], c.ro ? 'Oui' : 'Non']);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 22 }, { wch: 46 }, { wch: 24 }, { wch: 18 }, { wch: 38 }];
  return ws;
}

function resolveEntites(user, entites, { pourImport = false } = {}) {
  const perms = permsOf(user);
  const wanted = entites?.length ? entites : SHEETS.filter((s) => canRead(s, perms) && (!pourImport || !s.exportSeul)).map((s) => s.id);
  return wanted.map((id) => {
    const spec = SHEET_BY_ID.get(id);
    if (!spec) throw badRequest(`Donnée inconnue « ${id} ». Valeurs possibles : ${SHEETS.map((s) => s.id).join(', ')}.`);
    if (!canRead(spec, perms)) throw forbidden(`Votre profil (${user.role}) ne permet pas d'exporter « ${spec.feuille} ».`);
    return spec;
  });
}

/** Classeur d'échange : une feuille par donnée + « Informations » + « Instructions ». */
export async function exportWorkbook(user, { entites, ids = {}, du, au, modele = false } = {}) {
  const specs = resolveEntites(user, entites);
  const wb = XLSX.utils.book_new();
  const comptes = [];
  for (const spec of specs) {
    const rows = modele ? [] : await exportRows(spec, { ids: ids[spec.id], du, au });
    const ws = XLSX.utils.aoa_to_sheet([spec.columns.map((c) => c.h), ...rows]);
    ws['!cols'] = spec.columns.map((c) => ({ wch: Math.max(12, Math.min(40, c.h.length + 2)) }));
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws, spec.feuille);
    comptes.push([spec.feuille, rows.length]);
  }
  const info = XLSX.utils.aoa_to_sheet([
    ['Format', FORMAT.nom],
    ['Version', FORMAT.version],
    ['Généré le', nowIso()],
    ['Généré par', `${user.nom} (${user.role})`],
    ['Type', modele ? 'Modèle vierge' : 'Export de données'],
    ...(du || au ? [['Période', `${du || '…'} → ${au || '…'}`]] : []),
    [],
    ['Feuille', 'Lignes'],
    ...comptes,
    [],
    ['Ce fichier peut être modifié hors de l\'application puis réimporté (Paramètres → Échange de données Excel).'],
    ['Ne modifiez pas les en-têtes de colonnes ni la colonne « ID (ne pas modifier) ». Les colonnes [calculé] sont ignorées à l\'import.'],
    ['Une cellule vide à l\'import laisse la valeur existante inchangée : aucune donnée n\'est effacée par un import.'],
  ]);
  info['!cols'] = [{ wch: 28 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, info, 'Informations');
  XLSX.utils.book_append_sheet(wb, instructionsSheet(specs), 'Instructions');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  if (!modele) {
    await logOperation(user, {
      typeOperation: 'EXPORT_DONNEES',
      entite: 'Échange Excel',
      description: `Export Excel (format d'échange) : ${comptes.map(([f, n]) => `${f} ${n}`).join(', ')}`,
      action: 'EXPORT',
    });
  }
  return { buffer, comptes };
}

/* ------------------------------------------------------------------ IMPORT */

class Rollback extends Error {}

const zodMessage = (spec, issues) =>
  issues
    .map((i) => {
      const f = i.path?.[0];
      const col = spec.columns.find((c) => c.f === f || (f === 'adherentId' && c.f === 'matricule'));
      return `${col ? col.h : f || 'ligne'} : ${i.message}`;
    })
    .join(' ; ');

const rowError = (message) => Object.assign(new Error(message), { rowError: true });

/** Aucune valeur n'est modifiée ? (seuls les champs fournis dans la ligne sont comparés) */
const nothingChanged = (cur, input) => Object.entries(input).every(([k, v]) => sameValue(cur[k], v));

const stripUndefined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/**
 * Index en mémoire d'une table, chargé UNE fois par feuille (au lieu de plusieurs requêtes par ligne) et tenu à jour
 * au fil des créations / modifications de l'import. `keyFns` : { nomIndex: (doc) => clé }.
 */
function lookup(state, repoName, keyFns) {
  state.lk ||= {};
  state.lk[repoName] ||= { maps: Object.fromEntries(Object.keys(keyFns).map((k) => [k, new Map()])), loaded: null };
  const L = state.lk[repoName];
  L.initial ||= Object.fromEntries(Object.keys(keyFns).map((k) => [k, new Set()]));
  const add = (doc) => {
    for (const [k, fn] of Object.entries(keyFns)) {
      const v = fn(doc);
      if (v !== undefined && v !== null && v !== '') {
        L.maps[k].set(String(v), doc);
        if (L.chargement) L.initial[k].add(String(v)); // clés présentes AVANT l'import
      }
    }
  };
  return {
    async get(index, value) {
      if (!L.loaded) {
        L.chargement = true;
        L.loaded = repos[repoName].all().then((docs) => {
          docs.forEach(add);
          L.chargement = false;
        });
      }
      await L.loaded;
      return value === undefined || value === null || value === '' ? undefined : L.maps[index].get(String(value));
    },
    /** la clé existait-elle déjà en base avant cet import ? (deux lignes identiques d'un même fichier restent deux données) */
    async existed(index, value) {
      await this.get(index, value);
      return value !== undefined && value !== null && value !== '' && L.initial[index].has(String(value));
    },
    add,
  };
}

const lookupAdherents = (state) =>
  lookup(state, 'adherents', {
    id: (a) => a.id,
    matricule: (a) => a.matricule,
    identite: (a) => `${String(a.nom).toLocaleUpperCase('fr-FR')}|${a.prenom}|${a.telephone}`,
  });
const lookupCotisations = (state) =>
  lookup(state, 'cotisations', {
    id: (c) => c.id,
    reference: (c) => c.reference,
    signature: (c) => `${c.matricule}|${c.datePaiement}|${round2(c.montant)}|${c.modePaiement}`,
  });

/** Traitements spécifiques par donnée : retrouver l'existant, créer, modifier. Retournent 'cree' | 'maj' | 'inchange' | 'doublon'. */
const HANDLERS = {
  async gestionnaires(user, v, spec, state) {
    const L = lookup(state, 'gestionnaires', { id: (g) => g.id, code: (g) => g.code });
    const cur = (await L.get('id', v.id)) || (await L.get('code', v.code));
    return crudUpsert(user, v, spec, entities.gestionnaires.service, cur, state, L);
  },

  async adherents(user, v, spec, state) {
    const { id, matricule, gestionnaireCode, ...rest } = v;
    const perms = permsOf(user);
    // L'assiette cotisable CNPS relève de la direction financière et déclenche le recalcul des bulletins : traitée à part
    const assiette = rest.salaireCotisableCnps;
    delete rest.salaireCotisableCnps;
    if (assiette !== undefined && !(assiette >= 0 && assiette <= 100_000_000)) throw rowError('Assiette cotisable CNPS (FCFA) : valeur invalide.');
    const L = lookupAdherents(state);
    let cur = (await L.get('id', id)) || (await L.get('matricule', matricule));
    // Sans ID ni matricule : même nom + prénom + téléphone = même personne (le même fichier importé deux fois ne double rien)
    if (!cur && !id && !matricule && rest.nom && rest.prenom && rest.telephone) {
      cur = await L.get('identite', `${String(rest.nom).toLocaleUpperCase('fr-FR')}|${rest.prenom}|${rest.telephone}`);
    }
    if (gestionnaireCode) {
      const g = await lookup(state, 'gestionnaires', { id: (x) => x.id, code: (x) => x.code }).get('code', gestionnaireCode);
      if (!g) throw rowError(`Gestionnaire (code) : « ${gestionnaireCode} » est introuvable.`);
      rest.gestionnaireId = g.id;
    }
    if (cur) {
      const parsed = adherentUpdate.safeParse(stripUndefined(rest));
      if (!parsed.success) throw rowError(zodMessage(spec, parsed.error.issues));
      const input = stripUndefined(parsed.data);
      if (matricule && matricule !== cur.matricule) throw rowError(`Le matricule d'un adhérent ne peut pas être modifié (${cur.matricule}).`);
      const assietteChange = assiette !== undefined && !sameValue(cur.salaireCotisableCnps, assiette);
      if (assietteChange && !perms.canManageFinances) throw rowError("Assiette cotisable CNPS : modification réservée à la direction financière.");
      const inchange = nothingChanged(cur, input);
      if (inchange && !assietteChange) return 'inchange';
      let doc = cur;
      if (!inchange) doc = await adherentsSvc.updateAdherent(user, cur.id, input);
      if (assietteChange) doc = await adherentsSvc.updateSalaireCotisable(user, cur.id, assiette);
      L.add(doc);
      return 'maj';
    }
    const parsed = adherentCreate.safeParse(stripUndefined(rest));
    if (!parsed.success) throw rowError(zodMessage(spec, parsed.error.issues));
    if (id && !ID_RE.test(id)) throw rowError('ID invalide (lettres, chiffres, . _ - ; 64 caractères max).');
    if (assiette !== undefined && assiette !== 60000 && !perms.canManageFinances) throw rowError("Assiette cotisable CNPS : modification réservée à la direction financière.");
    L.add(await adherentsSvc.createAdherent(user, { ...parsed.data, ...(assiette !== undefined ? { salaireCotisableCnps: assiette } : {}) }, { matricule: matricule || undefined, id: id || undefined }));
    return 'cree';
  },

  async banques(user, v, _spec, state) {
    const L = lookup(state, 'banques', { nom: (b) => b.nom.toLowerCase() });
    const nom = v.nom;
    const exists = await L.get('nom', nom.toLowerCase());
    if (exists) {
      if (v.actif !== undefined && v.actif !== exists.actif) {
        L.add(await repos.banques.patch(exists.id, { actif: v.actif }));
        return 'maj';
      }
      return 'inchange';
    }
    await repos.banques.insert({ id: '0', nom, actif: v.actif ?? true });
    L.add({ nom, actif: v.actif ?? true });
    await logOperation(user, { typeOperation: 'AJOUT_BANQUE', entite: 'Banque', description: `Ajout de la banque partenaire "${nom}" (import Excel) par ${user.nom} (${user.role})` });
    return 'cree';
  },

  async cotisations(user, v, spec, state) {
    const { id, matricule, ...rest } = v;
    const L = lookupCotisations(state);
    const cur = (await L.get('id', id)) || (await L.get('reference', rest.reference));
    if (cur) {
      if (matricule && matricule !== cur.matricule) throw rowError(`Une cotisation ne peut pas changer d'adhérent (actuellement ${cur.matricule}).`);
      const parsed = cotisationUpdate.safeParse(stripUndefined({ datePaiement: rest.datePaiement, montant: rest.montant, modePaiement: rest.modePaiement, reference: rest.reference, mois: rest.mois, annee: rest.annee, observations: rest.observations }));
      if (!parsed.success) throw rowError(zodMessage(spec, parsed.error.issues));
      const input = stripUndefined(parsed.data);
      // date modifiée mais « Mois » / « Année » du fichier = ceux d'avant : la période est recalculée par le serveur
      if (input.datePaiement && input.datePaiement !== cur.datePaiement && input.mois === cur.mois && Number(input.annee) === Number(cur.annee)) {
        delete input.mois;
        delete input.annee;
      }
      if (nothingChanged(cur, input)) return 'inchange';
      L.add(await cotisationsSvc.modifierCotisation(user, cur.id, input));
      return 'maj';
    }
    const parsed = cotisationCreate.safeParse(stripUndefined({ ...rest, matricule }));
    if (!parsed.success) throw rowError(zodMessage(spec, parsed.error.issues));
    if (id && !ID_RE.test(id)) throw rowError('ID invalide (lettres, chiffres, . _ - ; 64 caractères max).');
    // Sans ID ni référence : même adhérent + date + montant + mode = déjà enregistrée
    if (!id && !rest.reference && (await L.existed('signature', `${matricule}|${parsed.data.datePaiement}|${round2(parsed.data.montant)}|${parsed.data.modePaiement}`))) return 'doublon';
    L.add(await cotisationsSvc.enregistrerCotisation(user, parsed.data, { id: id || undefined }));
    return 'cree';
  },

  async depenses(user, v, spec, state) {
    const L = lookup(state, 'depenses', { id: (d) => d.id, signature: (d) => spec.signature(d) });
    return crudUpsert(user, v, spec, spec.service(), await L.get('id', v.id), state, L);
  },
  async versements(user, v, spec, state) {
    const L = lookup(state, 'versements', { id: (d) => d.id, signature: (d) => spec.signature(d) });
    return crudUpsert(user, v, spec, spec.service(), await L.get('id', v.id), state, L);
  },
  async frais(user, v, spec, state) {
    const L = lookup(state, 'frais_mobile_money', { id: (d) => d.id, signature: (d) => spec.signature(d) });
    return crudUpsert(user, v, spec, spec.service(), await L.get('id', v.id), state, L);
  },
  async employes(user, v, spec, state) {
    const L = lookup(state, 'employes', { id: (e) => e.id, matricule: (e) => e.matricule });
    const cur = (await L.get('id', v.id)) || (await L.get('matricule', v.matricule));
    return crudUpsert(user, v, spec, spec.service(), cur, state, L);
  },
};

/** Création / mise à jour via le service d'un crudRouter (mêmes schémas, hooks métier et journal que l'API). */
async function crudUpsert(user, v, spec, svc, cur, state, L) {
  const { id, ...rest } = v;
  const values = stripUndefined(rest);
  if (cur) {
    const parsed = svc.updateSchema.safeParse(values);
    if (!parsed.success) throw rowError(zodMessage(spec, parsed.error.issues));
    const input = stripUndefined(parsed.data);
    if (nothingChanged(cur, input)) return 'inchange';
    const req = { user, permissions: permsOf(user), body: input };
    L?.add(await svc.updateDoc(user, cur.id, input, req));
    return 'maj';
  }
  const parsed = svc.createSchema.safeParse(values);
  if (!parsed.success) throw rowError(zodMessage(spec, parsed.error.issues));
  if (id && !ID_RE.test(id)) throw rowError('ID invalide (lettres, chiffres, . _ - ; 64 caractères max).');

  // Sans ID : une ligne identique à une donnée déjà enregistrée est un doublon (le même fichier importé deux fois ne double rien)
  if (!id && spec.signature && L && (await L.existed('signature', spec.signature(parsed.data)))) return 'doublon';
  const req = { user, permissions: permsOf(user), body: parsed.data };
  const saved = await svc.createDoc(user, parsed.data, req, { id: id || undefined });
  L?.add(saved);
  return 'cree';
}

/** Lit un classeur : retourne { feuilles: Map(specId → { rows: [{ ligne, values, erreurs }], manquantes, ignorees }) , inconnues } */
function lireClasseur(buffer) {
  let wb;
  try {
    // sheetRows : la lecture s'arrête après N lignes (un classeur minuscule peut DÉCLARER des millions de lignes)
    wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, sheetRows: MAX_ROWS_PER_SHEET + 10 });
  } catch (e) {
    throw badRequest(`Fichier Excel illisible : ${e.message}`);
  }
  if (!wb.SheetNames.length) throw badRequest('Le classeur ne contient aucune feuille.');
  if (wb.SheetNames.length > MAX_SHEETS) throw badRequest(`Trop de feuilles (${wb.SheetNames.length}) : maximum ${MAX_SHEETS}.`);
  for (const name of wb.SheetNames) {
    const ref = wb.Sheets[name]?.['!ref'];
    if (ref && XLSX.utils.decode_range(ref).e.c >= MAX_COLUMNS) throw badRequest(`La feuille « ${name} » déclare trop de colonnes (maximum ${MAX_COLUMNS}).`);
  }

  const byName = new Map();
  for (const s of SHEETS) {
    byName.set(norm(s.feuille), s);
    byName.set(norm(s.id), s);
  }
  const feuilles = new Map();
  const inconnues = [];
  for (const name of wb.SheetNames) {
    const n = norm(name);
    if (['informations', 'instructions', 'lisez moi'].includes(n)) continue;
    const spec = byName.get(n);
    if (!spec) {
      inconnues.push(name);
      continue;
    }
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null, blankrows: false });
    feuilles.set(spec.id, { nomFeuille: name, aoa });
  }
  return { feuilles, inconnues };
}

/**
 * Importe un classeur d'échange.
 *  - mode 'simulation' : tout est exécuté puis annulé (rapport exact, aucune écriture) ;
 *  - mode 'import'     : tout ou rien (une seule erreur annule l'import), sauf `ignorerErreurs` (les lignes valides sont importées).
 * Jamais de suppression, jamais d'effacement de valeur : une cellule vide laisse la donnée existante intacte.
 */
export async function importWorkbook(user, buffer, { mode = 'simulation', ignorerErreurs = false, entites } = {}) {
  const perms = permsOf(user);
  const { feuilles, inconnues } = lireClasseur(buffer);
  if (!feuilles.size) throw badRequest('Aucune feuille reconnue. Utilisez un fichier exporté par COSITI ou le modèle (Paramètres → Échange de données Excel).');

  const filtre = entites?.length ? new Set(entites) : null;
  const report = { mode, applique: false, feuilles: [], feuillesInconnues: inconnues, totaux: { lignes: 0, crees: 0, misAJour: 0, inchanges: 0, doublons: 0, erreurs: 0 } };

  const useSavepoints = mode === 'import' && ignorerErreurs;
  const run = async () => {
    for (const spec of SHEETS.filter((s) => feuilles.has(s.id))) {
      if (filtre && !filtre.has(spec.id)) continue;
      const { nomFeuille, aoa } = feuilles.get(spec.id);
      const fr = { id: spec.id, feuille: nomFeuille, lignes: 0, crees: 0, misAJour: 0, inchanges: 0, doublons: 0, erreurs: [], avertissements: [] };
      report.feuilles.push(fr);
      const addError = (ligne, message) => {
        report.totaux.erreurs++;
        if (fr.erreurs.length < MAX_ERRORS_PER_SHEET) fr.erreurs.push({ ligne, message });
      };

      // Un fichier d'export complet contient les feuilles calculées (bulletins de paie) : elles sont ignorées, pas refusées
      if (spec.exportSeul) {
        fr.avertissements.push('Feuille calculée par le serveur (barème CNPS / CGI) : ignorée à l\'import.');
        continue;
      }
      if (!canWrite(spec, perms)) {
        addError(null, `Votre profil (${user.role}) ne permet pas d'importer « ${spec.feuille} ».`);
        continue;
      }
      // en-têtes
      const headerIdx = aoa.findIndex((r) => r.some((c) => !isEmpty(c)));
      if (headerIdx < 0) {
        fr.avertissements.push('Feuille vide.');
        continue;
      }
      const headerRow = aoa[headerIdx];
      const colIndex = new Map(); // champ → index de colonne
      const inconnuesCol = [];
      headerRow.forEach((h, i) => {
        if (isEmpty(h)) return;
        const col = spec.columns.find((c) => norm(c.h) === norm(h));
        if (col && !col.ro) colIndex.set(col.f, i);
        else if (!col) inconnuesCol.push(String(h));
      });
      if (inconnuesCol.length) fr.avertissements.push(`Colonnes ignorées (non reconnues) : ${inconnuesCol.join(', ')}`);
      const manquantes = spec.columns.filter((c) => c.req && !c.ro && !colIndex.has(c.f)).map((c) => c.h);
      const lignes = aoa.slice(headerIdx + 1);
      if (lignes.length > MAX_ROWS_PER_SHEET) {
        addError(null, `Trop de lignes (${lignes.length}) : maximum ${MAX_ROWS_PER_SHEET} par feuille.`);
        continue;
      }
      if (manquantes.length && lignes.some((r) => r.some((c) => !isEmpty(c)))) {
        // une colonne obligatoire absente n'est bloquante que pour les créations ; on le signale et on laisse les lignes dire
        fr.avertissements.push(`Colonnes obligatoires absentes : ${manquantes.join(', ')}`);
      }

      const state = {};
      for (let i = 0; i < lignes.length; i++) {
        const cells = lignes[i];
        if (!cells.some((c) => !isEmpty(c))) continue;
        const ligne = headerIdx + i + 2; // numéro de ligne tel qu'affiché dans Excel
        fr.lignes++;
        report.totaux.lignes++;

        // conversion des cellules
        const values = {};
        const erreursCell = [];
        for (const col of spec.columns) {
          if (col.ro || !colIndex.has(col.f)) continue;
          const r = parseCell(cells[colIndex.get(col.f)], col.t);
          if (r.err) erreursCell.push(`${col.h} : ${r.err}`);
          else if (r.v !== undefined) values[col.f] = r.v;
        }
        if (erreursCell.length) {
          addError(ligne, erreursCell.join(' ; '));
          continue;
        }

        // Point de sauvegarde par ligne : seulement quand des lignes valides doivent survivre à une ligne refusée.
        // Sinon (simulation, import « tout ou rien ») l'ensemble est de toute façon annulé en cas d'erreur : 2 requêtes économisées par ligne.
        const sp = `imp_${i % 1000}`;
        try {
          if (useSavepoints) await query(`SAVEPOINT ${sp}`);
          const issue = await HANDLERS[spec.id](user, values, spec, state);
          if (useSavepoints) await query(`RELEASE SAVEPOINT ${sp}`);
          if (issue === 'cree') { fr.crees++; report.totaux.crees++; }
          else if (issue === 'maj') { fr.misAJour++; report.totaux.misAJour++; }
          else if (issue === 'doublon') { fr.doublons++; fr.inchanges++; report.totaux.inchanges++; report.totaux.doublons++; }
          else { fr.inchanges++; report.totaux.inchanges++; }
        } catch (e) {
          // un verrou mortel annule toute la transaction : on abandonne l'import (jamais de lignes validées hors transaction)
          if (e.code === 'ER_LOCK_DEADLOCK' || e.code === 'ER_LOCK_WAIT_TIMEOUT') throw e;
          if (useSavepoints) {
            try {
              await query(`ROLLBACK TO SAVEPOINT ${sp}`);
            } catch {
              throw e;
            }
          }
          const msg = e instanceof HttpError || e.rowError ? e.message : e.code ? `Refusé par la base (${e.code}).` : `Erreur inattendue : ${e.message}`;
          addError(ligne, e.details?.length ? `${msg} ${e.details.map((d) => `${d.champ}: ${d.message}`).join(' ; ')}` : msg);
        }
      }
    }
  };

  let committed = false;
  try {
    await tx(async () => {
      await run();
      for (const f of report.feuilles) {
        if (f.doublons) f.avertissements.push(`${f.doublons} ligne(s) ignorée(s) : déjà enregistrée(s) (aucun doublon créé).`);
      }
      const bloque = report.totaux.erreurs > 0 && !ignorerErreurs;
      if (mode === 'simulation' || bloque) throw new Rollback();
      await logOperation(user, {
        typeOperation: 'IMPORT_EXCEL',
        entite: 'Échange Excel',
        description: `Import Excel : ${report.totaux.crees} créé(s), ${report.totaux.misAJour} mis à jour, ${report.totaux.inchanges} inchangé(s), ${report.totaux.erreurs} ligne(s) refusée(s) (${report.feuilles.map((f) => f.feuille).join(', ')})`,
        action: 'IMPORT',
      });
      committed = true;
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
  report.applique = committed;
  report.ok = report.totaux.erreurs === 0;
  if (mode === 'import' && !committed) {
    await logOperation(user, {
      typeOperation: 'IMPORT_EXCEL_REJETE',
      entite: 'Échange Excel',
      description: `Import Excel refusé : ${report.totaux.erreurs} erreur(s), aucune donnée modifiée`,
      action: 'IMPORT',
    });
  }
  return report;
}

export const catalogue = (user) => {
  const perms = permsOf(user);
  return SHEETS.map((s) => ({
    id: s.id,
    feuille: s.feuille,
    exportable: !!canRead(s, perms),
    importable: !!canWrite(s, perms),
    exportSeul: !!s.exportSeul,
    cle: s.cle || null,
    colonnes: s.columns.map((c) => ({ en_tete: c.h, obligatoire: !!c.req, calculee: !!c.ro })),
  }));
};

