import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { repos } from '../db/repository.js';
import { COLLECTIONS, tx } from '../db/database.js';
import { authenticate, authorize, requireConfirmation, requireMaintenanceCode } from '../middleware/auth.js';
import { validate, isoDate, pageQuery } from '../middleware/validate.js';
import { ok, page } from '../utils/respond.js';
import { forbidden } from '../utils/httpError.js';
import { hashSecret, verifySecret, getParametres } from '../services/security.js';
import { logOperation } from '../services/journal.js';
import { importDump } from '../db/seed.js';
import { publicUser } from '../services/auth.js';

/* ============================================================
 * PARAMÈTRES GÉNÉRAUX
 * ============================================================ */
export const parametres = Router();
parametres.use(authenticate);

// Listes de référence attendues par le front (ParametresApp)
const STATUTS_ADHERENTS = ['Actif', 'En cours de régularisation', 'En attente', 'Inactif', 'Suspendu', 'Radié'];
const STATUTS_DOSSIERS = ['Dossier non commencé', 'Dossier en cours', 'Dossier incomplet', 'Dossier complet', 'Dossier transmis', 'Dossier traité', 'Sans enfant (Non éligible allocations)'];

const publicParams = (p) => {
  const { codeConfirmationHash, ...rest } = p;
  return {
    ...rest,
    joursVerificationCycle: rest.joursVerification,
    statutsAdherents: STATUTS_ADHERENTS,
    statutsDossiers: STATUTS_DOSSIERS,
    codeConfirmationDefini: !!codeConfirmationHash,
  };
};

/** GET /api/parametres — le code de confirmation n'est JAMAIS renvoyé (stocké haché) */
parametres.get('/', async (_req, res) => ok(res, publicParams((await getParametres()))));

const paramsSchema = z
  .object({
    nomOrganisation: z.string().trim().min(2).max(255),
    sigle: z.string().trim().min(1).max(50),
    slogan: z.string().trim().max(255),
    adresse: z.string().trim().max(255),
    telephone: z.string().trim().max(50),
    email: z.string().trim().email().max(100),
    seuilImmatriculation: z.coerce.number().positive().max(100_000_000),
    montantsCotisationDefauts: z.array(z.coerce.number().positive()).min(1).max(10),
    joursVerification: z.array(z.coerce.number().int().min(1).max(31)).min(1).max(6),
    seuilJoursRetardAlerte: z.coerce.number().int().min(0).max(31),
    // Changement du code de confirmation : l'ancien code est exigé
    codeConfirmationSecurite: z.string().regex(/^\d{4,8}$/, 'Le code doit contenir 4 à 8 chiffres'),
    ancienCodeConfirmation: z.string().max(20),
  })
  .partial();

/** PUT /api/parametres — (DAF, DG, DGA) */
parametres.put('/', authorize('canManageParametres'), validate({ body: paramsSchema }), async (req, res, next) => {
  try {
    const { codeConfirmationSecurite, ancienCodeConfirmation, ...patch } = req.body;
    if (codeConfirmationSecurite) {
      if (!ancienCodeConfirmation || !(await verifySecret(ancienCodeConfirmation, (await getParametres()).codeConfirmationHash))) {
        throw forbidden('Ancien code de confirmation incorrect.');
      }
      patch.codeConfirmationHash = await hashSecret(codeConfirmationSecurite);
      patch.joursVerificationCycle = patch.joursVerification;
    }
    if (patch.joursVerification) patch.joursVerificationCycle = patch.joursVerification;
    const upd = (await repos.parametres.patch('main', patch));
    (await logOperation(req.user, {
      typeOperation: 'MODIFICATION_PARAMETRES',
      entite: 'Paramètres',
      description: `Mise à jour de la configuration générale du système${codeConfirmationSecurite ? ' (code de confirmation modifié)' : ''}`,
      nouvellesInformations: patch.codeConfirmationHash ? { ...patch, codeConfirmationHash: '***' } : patch,
    }));
    ok(res, publicParams(upd));
  } catch (e) {
    next(e);
  }
});

/* ============================================================
 * JOURNAL D'AUDIT
 * ============================================================ */
export const journal = Router();
journal.use(authenticate);

const journalQuery = pageQuery.extend({
  typeOperation: z.string().max(100).optional(),
  utilisateur: z.string().max(150).optional(),
  matricule: z.string().max(50).optional(),
  entite: z.string().max(150).optional(),
  du: isoDate.optional(),
  au: isoDate.optional(),
});

/** GET /api/journal?typeOperation=&utilisateur=&matricule=&du=&au=&q= — consultation de la piste d'audit */
journal.get('/', validate({ query: journalQuery }), async (req, res) => {
  const { q, typeOperation, utilisateur, matricule, entite, du, au, page: p, pageSize } = req.validatedQuery;
  page(
    res,
    (await repos.journal.paginate({
      where: {
        typeOperation, utilisateur, matricule, entite,
        ...(du || au ? { dateHeure: { gte: du ? `${du}T00:00:00.000Z` : undefined, lte: au ? `${au}T23:59:59.999Z` : undefined } } : {}),
      },
      like: q ? { term: q, keys: ['description', 'details', 'utilisateur', 'matricule', 'adherentNom'] } : undefined,
      orderBy: [['dateHeure', 'desc']],
      page: p,
      pageSize,
    }))
  );
});

/**
 * POST /api/journal/evenements — trace une action effectuée dans le navigateur (impression, export, consultation
 * d'un document...). Les opérations de modification sont déjà journalisées par le serveur lui-même.
 */
export const EVENEMENTS_CLIENT = ['IMPRESSION_DOCUMENT', 'EXPORT_DONNEES', 'IMPRESSION_RAPPORT_AUDIT', 'CONSULTATION_PROFIL', 'IMPRESSION_RECU', 'CONSULTATION_RAPPORT'];
journal.post(
  '/evenements',
  validate({
    body: z.object({
      typeOperation: z.enum(EVENEMENTS_CLIENT),
      description: z.string().trim().min(3).max(500),
      entite: z.string().trim().max(150).default('Interface'),
      matricule: z.string().trim().max(50).optional(),
    }),
  }),
  async (req, res) => {
    const { typeOperation, description, entite, matricule } = req.body;
    const e = await logOperation(req.user, { typeOperation, entite, description, matricule, action: 'CLIENT' });
    res.status(201).json({ success: true, data: { id: e.id } });
  }
);

/** DELETE /api/journal?avant=AAAA-MM-JJ — purge (DG/DGA, code de confirmation). Laisse toujours une trace de la purge. */
journal.delete(
  '/',
  authorize('canClearJournal'),
  validate({ query: z.object({ avant: isoDate.optional() }) }),
  requireConfirmation,
  async (req, res) => {
    const { avant } = req.validatedQuery;
    const n = (await tx(async () => {
      const cible = (await repos.journal.all({ where: avant ? { dateHeure: { lt: `${avant}T00:00:00.000Z` } } : {} }));
      for (const e of cible) await repos.journal.delete(e.id);
      (await logOperation(req.user, {
        typeOperation: 'PURGE_OU_IMPORT_DONNEES',
        entite: 'Journal',
        description: `Purge du journal d'audit par ${req.user.nom} : ${cible.length} entrée(s) supprimée(s)${avant ? ` (antérieures au ${avant})` : ' (journal complet)'}`,
      }));
      return cible.length;
    }));
    ok(res, { supprimees: n });
  }
);

/* ============================================================
 * SYSTÈME : santé, export, réinitialisation, mise à jour
 * ============================================================ */
export const systeme = Router();

/** GET /api/systeme/health — sonde de disponibilité (publique, sans donnée métier) */
systeme.get('/health', async (_req, res) => {
  (await repos.parametres.get('main')); // vérifie l'accès à la base
  res.json({ success: true, status: 'ok', uptime: Math.round(process.uptime()), env: config.env, time: new Date().toISOString() });
});

systeme.use(authenticate);

/** GET /api/systeme/export — sauvegarde JSON complète (sans secrets) */
systeme.get('/export', authorize('canExportReports', 'canManageParametres'), async (req, res) => {
  const dump = { exporteLe: new Date().toISOString(), exportePar: req.user.nom, donnees: {} };
  for (const name of COLLECTIONS) {
    const rows = await repos[name].all({ orderBy: [['id', 'asc']] });
    dump.donnees[name] = name === 'utilisateurs' ? rows.map(publicUser) : name === 'parametres' ? rows.map(({ codeConfirmationHash, ...r }) => r) : rows;
  }
  (await logOperation(req.user, { typeOperation: 'PURGE_OU_IMPORT_DONNEES', entite: 'Système', description: `Export complet des données par ${req.user.nom}` }));
  res.setHeader('Content-Disposition', `attachment; filename="cositi-export-${new Date().toISOString().slice(0, 10)}.json"`);
  ok(res, dump);
});

/** POST /api/systeme/reset-demo — réimporte database_mysql/ (efface TOUTES les données actuelles). Code de confirmation requis. */
systeme.post('/reset-demo', authorize('canResetDemo'), requireConfirmation, async (req, res, next) => {
  try {
    if (!config.allowDemoReset) throw forbidden('La réinitialisation de démonstration est désactivée (ALLOW_DEMO_RESET=false).');
    await importDump();
    (await logOperation(req.user, { typeOperation: 'PURGE_OU_IMPORT_DONNEES', entite: 'Système', description: 'Réinitialisation complète depuis le dump database_mysql/' }));
    ok(res, { message: 'Données du dump database_mysql/ rechargées. Reconnectez-vous.' });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/systeme/mise-a-jour — « mise à jour logicielle » du front (wipeAllDataForUpdate) :
 * efface les données d'exploitation et remet la séquence des matricules à 0.
 * Habilité : PCA, DG, DGA, DAF + code de maintenance (MAINTENANCE_CODE).
 */
systeme.post('/mise-a-jour', authorize('canUpdateSoftware'), requireMaintenanceCode, async (req, res) => {
  const stats = (await tx(async () => {
    const out = {};
    for (const name of ['adherents', 'cotisations', 'dossiers', 'depenses', 'versements', 'frais_mobile_money', 'partenaires', 'rendez_vous', 'notes_direction', 'rapports_reunions', 'rapports_agents', 'journal']) {
      out[name] = await repos[name].deleteAll();
    }
    (await repos.parametres.patch('main', { dernierNumeroMatricule: 0 }));
    (await logOperation(req.user, {
      typeOperation: 'MISE_A_JOUR_LOGICIEL',
      entite: 'Système Logiciel',
      description: 'Mise à jour logicielle effectuée avec succès (code de maintenance validé). Toutes les données d\'exploitation ont été effacées pour un redémarrage propre.',
      nouvellesInformations: `Supprimés : ${Object.entries(out).map(([k, v]) => `${k}=${v}`).join(', ')} | Matricule reset: COSITI-0001 prêt`,
    }));
    return out;
  }));
  ok(res, { message: "Données d'exploitation effacées.", supprimes: stats });
});

