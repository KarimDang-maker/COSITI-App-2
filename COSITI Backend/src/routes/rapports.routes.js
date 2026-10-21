import { Router } from 'express';
import { z } from 'zod';
import { repos } from '../db/repository.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, yearMonth, idParam } from '../middleware/validate.js';
import { ok } from '../utils/respond.js';
import { bornesMois, MOIS_FR } from '../utils/dates.js';
import { rapprochement, etatMensuel } from '../services/rapports.js';
import { generateAlerts, calculateAdherentStats } from '../utils/business.js';
import { sumMoney, groupSumMoney, addMoney, round2 } from '../utils/money.js';
import { cotisationsEnAttente } from '../services/versements.js';
import { getAdherentOrFail, cotisationsOf } from '../services/adherents.js';

const router = Router();
router.use(authenticate);

const sum = (list, k) => sumMoney(list, k);
const groupSum = groupSumMoney;
const countBy = (list, keyFn) => {
  const out = {};
  for (const x of list) out[keyFn(x) ?? 'Non renseigné'] = (out[keyFn(x) ?? 'Non renseigné'] || 0) + 1;
  return out;
};

/** GET /api/dashboard — indicateurs du tableau de bord */
router.get('/dashboard', async (req, res) => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const ym = today.slice(0, 7);
  const year = today.slice(0, 4);
  const params = (await repos.parametres.get('main'));
  const adherents = (await repos.adherents.all());
  const cotisations = (await repos.cotisations.all());
  const dossiers = (await repos.dossiers.all());
  const alertes = generateAlerts(adherents, cotisations, dossiers, params, now);
  const seuil = params.seuilImmatriculation || 15000;
  // statistiques de cotisation de chaque adhérent (les cotisations sont indexées une seule fois)
  const cotsParAdh = new Map(adherents.map((a) => [a.id, []]));
  const adhParId = new Map(adherents.map((a) => [a.id, a]));
  const adhParMat = new Map(adherents.map((a) => [a.matricule, a]));
  for (const c of cotisations) {
    const a = adhParId.get(c.adherentId) || adhParMat.get(c.matricule);
    if (a) cotsParAdh.get(a.id).push(c);
  }
  const statsAdh = adherents.map((a) => ({ a, st: calculateAdherentStats(a, cotsParAdh.get(a.id), params, now) }));

  const ceMois = cotisations.filter((c) => c.datePaiement.startsWith(ym));
  const douzeMois = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    douzeMois[d.toISOString().slice(0, 7)] = 0;
  }
  for (const c of cotisations) {
    const k = c.datePaiement.slice(0, 7);
    if (k in douzeMois) douzeMois[k] = addMoney(douzeMois[k], c.montant);
  }

  const parGestionnaire = (await repos.gestionnaires.all()).map((g) => {
    const ids = new Set(adherents.filter((a) => a.gestionnaireId === g.id).flatMap((a) => [a.id, a.matricule]));
    const recouvre = sum(ceMois.filter((c) => ids.has(c.adherentId) || ids.has(c.matricule)), 'montant');
    return {
      id: g.id, code: g.code, nom: `${g.nom} ${g.prenom}`, zoneSecteur: g.zoneSecteur, statut: g.statut,
      adherents: adherents.filter((a) => a.gestionnaireId === g.id).length,
      adherentsEnRetard: statsAdh.filter(({ a, st }) => a.gestionnaireId === g.id && st.statutCotisation === 'En retard').length,
      recouvreCeMois: recouvre, objectifMensuel: g.objectifsRecouvrementMensuel || 0,
      tauxRealisation: g.objectifsRecouvrementMensuel ? Math.round((recouvre / g.objectifsRecouvrementMensuel) * 100) : null,
    };
  });

  const data = {
    date: today,
    adherents: {
      total: adherents.length,
      parStatut: countBy(adherents, (a) => a.statut),
      parImmatriculation: countBy(adherents, (a) => a.statutImmatriculation),
      nouveauxCeMois: adherents.filter((a) => (a.dateAdhesion || '').startsWith(ym)).length,
      sansGestionnaire: adherents.filter((a) => !a.gestionnaireId).length,
      actifs: adherents.filter((a) => a.statut === 'Actif').length,
      immatricules: adherents.filter((a) => a.statutImmatriculation === 'Immatriculé').length,
      nonImmatricules: adherents.filter((a) => a.statutImmatriculation !== 'Immatriculé').length,
      aJour: statsAdh.filter(({ st }) => st.statutCotisation === 'À jour').length,
      nonAJour: statsAdh.filter(({ st }) => st.statutCotisation !== 'À jour').length,
      seuilAtteint: statsAdh.filter(({ st }) => st.totalCumule >= seuil).length,
      aImmatriculer: statsAdh.filter(({ a, st }) => st.totalCumule >= seuil && a.statutImmatriculation !== 'Immatriculé').length,
    },
    cotisations: {
      nombre: cotisations.length,
      totalGlobal: sum(cotisations, 'montant'),
      aujourdHui: sum(cotisations.filter((c) => c.datePaiement === today), 'montant'),
      ceMois: sum(ceMois, 'montant'),
      cetteAnnee: sum(cotisations.filter((c) => c.datePaiement.startsWith(year)), 'montant'),
      parModeCeMois: groupSum(ceMois, (c) => c.modePaiement),
      parMois: douzeMois,
      dernieres: [...cotisations].sort((a, b) => b.datePaiement.localeCompare(a.datePaiement) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 8),
    },
    alertes: {
      total: alertes.length,
      urgentes: alertes.filter((a) => a.niveau === 'urgent').length,
      parType: countBy(alertes, (a) => a.type),
    },
    dossiers: { total: dossiers.length, parStatut: countBy(dossiers, (d) => d.statut), aConstituer: alertes.filter((a) => a.type === 'DOSSIER_ALLOCATIONS').length },
    gestionnaires: parGestionnaire,
  };

  if (req.permissions.canManageFinances) {
    const depenses = (await repos.depenses.all());
    const versements = (await repos.versements.all());
    const frais = (await repos.frais_mobile_money.all());
    const attente = (await cotisationsEnAttente());
    data.finances = {
      depensesCeMois: sum(depenses.filter((d) => d.date.startsWith(ym)), 'montant'),
      depensesTotal: sum(depenses, 'montant'),
      depensesParCategorie: groupSum(depenses, (d) => d.categorie),
      depensesParOrigine: groupSum(depenses, (d) => d.origineFonds),
      versementsTotal: sum(versements, 'montant'),
      fraisMobileMoneyTotal: sum(frais, 'fraisPreleves'),
      cotisationsAVerser: { nombre: attente.nombre, montant: attente.totalMontant },
    };
  }
  ok(res, data);
});

/** GET /api/rapports/etats-mensuels?mois=2026-03 — état de clôture mensuelle */
router.get('/rapports/etats-mensuels', validate({ query: z.object({ mois: yearMonth }) }), async (req, res) => {
  const { mois } = req.validatedQuery;
  const { debut, fin } = bornesMois(mois);
  const inMonth = (d) => d >= debut && d <= fin;
  const cotisations = (await repos.cotisations.all({ where: { datePaiement: { gte: debut, lte: fin } } }));
  const adherents = (await repos.adherents.all());
  const nomGest = new Map((await repos.gestionnaires.all()).map((g) => [g.id, `${g.nom} ${g.prenom} (${g.code})`]));
  const adhById = new Map(adherents.flatMap((a) => [[a.id, a], [a.matricule, a]]));

  const data = {
    mois,
    periode: { debut, fin },
    cotisations: {
      nombre: cotisations.length,
      total: sum(cotisations, 'montant'),
      adherentsCotisants: new Set(cotisations.map((c) => c.adherentId)).size,
      parMode: groupSum(cotisations, (c) => c.modePaiement),
      parJour: groupSum(cotisations, (c) => c.datePaiement),
      parAgent: groupSum(cotisations, (c) => c.agentEnregistreur),
      parGestionnaire: groupSum(cotisations, (c) => nomGest.get(adhById.get(c.adherentId)?.gestionnaireId) || 'Sans gestionnaire'),
      regularisations: cotisations.filter((c) => c.estRegularisation).length,
    },
    adherents: {
      nouveaux: adherents.filter((a) => inMonth(a.dateAdhesion || '')).length,
      immatricules: adherents.filter((a) => inMonth(a.dateImmatriculation || '')).length,
      totalFinDeMois: adherents.filter((a) => (a.dateAdhesion || '') <= fin).length,
    },
    rapportsAgents: await (async () => {
      const r = (await repos.rapports_agents.all({ where: { dateRapport: { gte: debut, lte: fin } } }));
      return { nombre: r.length, totalCollecte: sum(r, 'montantTotalCollecte'), especes: sum(r, 'montantEspecesRemis'), mobileMoney: sum(r, 'montantMobileMoneyDeclare'), ecarts: r.filter((x) => x.conformiteCaisse === 'Écart constaté (À justifier)').length };
    })(),
  };

  if (req.permissions.canManageFinances) {
    const depenses = (await repos.depenses.all({ where: { date: { gte: debut, lte: fin } } }));
    const versements = (await repos.versements.all({ where: { date: { gte: debut, lte: fin } } }));
    const frais = (await repos.frais_mobile_money.all({ where: { date: { gte: debut, lte: fin } } }));
    const bulletins = (await repos.bulletins_paie.all({ where: { mois } }));
    const personnel = bulletins.filter((b) => b.typeBeneficiaire !== 'ADHERENT_CNPS');
    data.finances = {
      depenses: { nombre: depenses.length, total: sum(depenses, 'montant'), parCategorie: groupSum(depenses, (d) => d.categorie), parOrigine: groupSum(depenses, (d) => d.origineFonds) },
      versements: { nombre: versements.length, total: sum(versements, 'montant'), parBanque: groupSum(versements, (v) => v.banque) },
      fraisMobileMoney: { nombre: frais.length, totalFrais: sum(frais, 'fraisPreleves'), parOperateur: groupSum(frais, (f) => f.operateur, (f) => f.fraisPreleves) },
      paie: { bulletins: bulletins.length, masseSalarialeNette: sum(personnel, 'netAPayer'), chargesPatronales: sum(personnel, 'totalChargesPatronales') },
      soldeMois: round2(sum(cotisations, 'montant') - sum(depenses, 'montant')),
    };
  }
  ok(res, data);
});

const moisFr = z.enum(MOIS_FR);

/**
 * GET /api/rapports/etat-mensuel?mois=Mars&annee=2026 — état de clôture complet d'une période (cotisations, ventilations,
 * état nominatif des adhérents, rapprochement bancaire). Le volet financier est réservé à la direction financière.
 */
router.get('/rapports/etat-mensuel', validate({ query: z.object({ mois: moisFr, annee: z.coerce.number().int().min(2000).max(2100) }) }), async (req, res) => {
  ok(res, await etatMensuel({ ...req.validatedQuery, financesAutorisees: !!req.permissions.canManageFinances }));
});

/**
 * GET /api/rapports/rapprochement?periode=GLOBAL|MOIS&mois=&annee=&banque=&base=COTISATIONS_PERCUES|SEUIL
 * Solde réel en banque = fonds versés − réserve cotisations CNPS ; flux d'encaissements / décaissements (exploitation vs apport PCA).
 */
router.get(
  '/rapports/rapprochement',
  authorize('canManageFinances'),
  validate({
    query: z
      .object({
        periode: z.enum(['GLOBAL', 'MOIS']).default('GLOBAL'),
        mois: moisFr.optional(),
        annee: z.coerce.number().int().min(2000).max(2100).optional(),
        banque: z.string().trim().max(150).optional(),
        base: z.enum(['COTISATIONS_PERCUES', 'SEUIL']).default('COTISATIONS_PERCUES'),
      })
      .refine((q) => q.periode !== 'MOIS' || (q.mois && q.annee), { message: 'mois et annee requis pour periode=MOIS', path: ['mois'] }),
  }),
  async (req, res) => ok(res, await rapprochement(req.validatedQuery))
);

/** GET /api/rapports/releve/:id — relevé complet d'un adhérent (fiche + cotisations + statistiques) */
router.get('/rapports/releve/:id', validate({ params: idParam }), async (req, res) => {
  const adh = (await getAdherentOrFail(req.params.id));
  const cotisations = (await cotisationsOf(adh)).sort((a, b) => b.datePaiement.localeCompare(a.datePaiement));
  ok(res, {
    adherent: adh,
    stats: calculateAdherentStats(adh, cotisations, (await repos.parametres.get('main'))),
    cotisations,
    dossiers: (await repos.dossiers.all({ or: [{ adherentId: adh.id }, { matricule: adh.matricule }] })),
    genereLe: new Date().toISOString(),
  });
});

export default router;
