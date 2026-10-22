import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { config } from '../config.js';
import { getPool, query, tx } from './database.js';
import { repos } from './repository.js';
import { TABLES } from './tables.js';
import { splitStatements } from './sql.js';
import { hashSecret } from '../services/security.js';
import { calculerBulletinPaie } from '../utils/paie.js';
import { adherentInput } from '../services/paie.js';
import { newId, nowIso } from '../utils/ids.js';

const BANQUES_DEFAUT = [
  'BICICI', "Ecobank Côte d'Ivoire", 'SGCI (Société Générale)', 'BOA CI (Bank of Africa)', 'NSIA Banque',
  "BNI (Banque Nationale d'Investissement)", 'Coris Bank', 'Autre institution bancaire',
];

// Valeurs du dump (table `parametres`) — utilisées uniquement si l'on démarre SANS importer le dump
const PARAMETRES_DEFAUT = {
  id: 'main',
  nomOrganisation: 'COSITI — Coopérative du Secteur Informel et des Travailleurs Indépendants',
  sigle: 'COSITI',
  slogan: 'Solidarité • Prévoyance • Dignité des Travailleurs Informels',
  adresse: 'Avenue des Banques, Quartier Bonanjo, B.P. 3140 Douala, Cameroun',
  telephone: '+237 233 42 15 89 / +237 677 88 99 00',
  email: 'contact@cositi-cameroun.cm',
  seuilImmatriculation: 15000,
  montantsCotisationDefauts: [700, 1000],
  joursVerification: [15, 30],
  seuilJoursRetardAlerte: 10,
  dernierNumeroMatricule: 0,
};

const complements = () => JSON.parse(readFileSync(new URL('./employes-complements.json', import.meta.url), 'utf8'));

export async function seedBanques() {
  for (const nom of BANQUES_DEFAUT) await repos.banques.insert({ id: '0', nom, actif: true });
}

/**
 * Vide toutes les tables puis exécute les INSERT du dump `database_mysql/` tels quels
 * (même mode SQL que le dump : NO_AUTO_VALUE_ON_ZERO, sans mode strict).
 */
async function runDumpInserts(path) {
  if (!existsSync(path)) throw new Error(`Dump SQL introuvable : ${path} (variable DUMP_PATH)`);
  const inserts = splitStatements(readFileSync(path, 'utf8')).filter((s) => /^INSERT\s+INTO/i.test(s));
  if (!inserts.length) throw new Error(`Aucune instruction INSERT dans ${path}`);

  const conn = await getPool().getConnection();
  try {
    await conn.query("SET SESSION sql_mode = 'NO_AUTO_VALUE_ON_ZERO'");
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('SET NAMES utf8mb4');
    await conn.beginTransaction();
    try {
      for (const def of Object.values(TABLES)) await conn.query(`DELETE FROM \`${def.table}\``);
      await conn.query('DELETE FROM `refresh_tokens`');
      for (const stmt of inserts) await conn.query(stmt);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    }
  } finally {
    conn.release();
  }
  return inserts.length;
}

/**
 * Complète les données importées pour que l'application fonctionne :
 *  - hache le code de confirmation (le dump le contient en clair) et initialise la séquence des matricules
 *  - crée les identifiants de connexion (mot de passe + code PIN HACHÉS) des comptes du dump
 *  - complète la fiche des salariés et le détail des bulletins (colonnes absentes du dump)
 */
async function finaliserImport() {
  const report = { bulletinsDetailles: 0, bulletinsEcarts: [], comptesCrees: 0, parametresInitialises: false, salariesCompletes: 0 };

  // 1. Paramètres : le code de confirmation du dump est en clair ; on ne garde que son hash. Séquence des matricules.
  const [par] = await query('SELECT code_confirmation_securite AS code, code_confirmation_hash AS hash, dernier_numero_matricule AS seq FROM parametres WHERE id = 1');
  if (par && !par.hash) {
    const code = (par.code || '').trim() || '0000';
    await query("UPDATE parametres SET code_confirmation_hash = ?, code_confirmation_securite = '' WHERE id = 1", [await hashSecret(code)]);
    report.parametresInitialises = true;
  }
  if (par && !par.seq) {
    const adherents = await repos.adherents.all();
    const maxSeq = Math.max(0, ...adherents.map((a) => parseInt(String(a.matricule).split('-').pop(), 10) || 0));
    await query('UPDATE parametres SET dernier_numero_matricule = ? WHERE id = 1', [maxSeq]);
  }

  // 2. Identifiants de connexion des comptes qui n'en ont pas (le dump n'en contient pas : mots de passe et PIN HACHÉS)
  const tokenVersion = Math.floor(Date.now() / 1000) % 1_000_000_000; // invalide tout jeton émis avant l'import
  for (const u of await repos.utilisateurs.all()) {
    if (u.passwordHash) continue;
    await repos.utilisateurs.patch(u.id, {
      email: u.email.toLowerCase(),
      passwordHash: await hashSecret(config.seed.defaultPassword),
      mustChangePassword: config.seed.forcePasswordChange,
      failedAttempts: 0,
      lockedUntil: null,
      tokenVersion,
    });
    report.comptesCrees++;
  }
  // anciennes colonnes du dump (codes en clair, remplacés par les hash) : purgées seulement là où il en reste
  // Plus aucun code PIN de compte : la connexion se fait uniquement par e-mail + mot de passe (codes obsolètes effacés)
  await query('UPDATE utilisateurs SET code_pin = NULL, code_acces = NULL, pin_hash = NULL WHERE code_pin IS NOT NULL OR code_acces IS NOT NULL OR pin_hash IS NOT NULL');

  // 3. Fiches salariés (colonnes absentes du dump) — les valeurs du dump restent prioritaires
  const comp = complements();
  for (const e of await repos.employes.all()) {
    const extra = comp[e.id];
    if (extra && !e.telephone) {
      await repos.employes.patch(e.id, extra);
      report.salariesCompletes++;
    }
  }

  // 4. Détail des bulletins (le dump ne contient que brut / net / statut)
  for (const row of await repos.bulletins_paie.all()) {
    if (row.trancheLoi) continue;
    const isAdh = !String(row.employeId).startsWith('emp-');
    const base = isAdh
      ? { adherent: adherentInput(await repos.adherents.get(row.employeId)), typeBeneficiaire: 'ADHERENT_CNPS', salaireBaseOptionnel: row.salaireBase }
      : { employe: await repos.employes.get(row.employeId) };
    const full = calculerBulletinPaie({ ...base, mois: row.mois, bulletinNumero: row.bulletinNumero, statut: row.statut, dateEdition: `${row.mois}-28`, validePar: 'Direction financière (import)' });
    if (full.netAPayer !== row.netAPayer || full.totalGainsBruts !== row.totalGainsBruts) {
      report.bulletinsEcarts.push({ id: row.id, dump: { brut: row.totalGainsBruts, net: row.netAPayer }, recalcule: { brut: full.totalGainsBruts, net: full.netAPayer } });
    }
    // les montants du dump font foi pour les colonnes qu'il contient
    await repos.bulletins_paie.replace({
      ...full,
      id: row.id,
      totalGainsBruts: row.totalGainsBruts,
      netAPayer: row.netAPayer,
      salaireBase: row.salaireBase,
      createdAt: row.createdAt,
      dateValidation: row.statut === 'Brouillon' ? undefined : full.dateEdition,
    });
    report.bulletinsDetailles++;
  }
  return report;
}

/**
 * Garantit l'existence d'au moins un compte « Super Administrateur » (gestion des comptes et des identifiants).
 * Créé avec SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD (mot de passe aléatoire affiché une fois s'il n'est pas fourni).
 */
export async function ensureSuperAdmin() {
  const existing = await repos.utilisateurs.findOne({ where: { role: 'Super Administrateur' } });
  if (existing) return null;
  const sa = config.seed.superAdmin;
  let password = sa.password;
  let generated = false;
  if (!password) {
    password = `${randomBytes(9).toString('base64url')}aA1`;
    generated = true;
  }
  const byEmail = await repos.utilisateurs.findOne({ where: { email: sa.email.toLowerCase() } });
  if (byEmail) throw new Error(`L'e-mail ${sa.email} est déjà utilisé : définissez SUPERADMIN_EMAIL.`);
  await repos.utilisateurs.insert({
    id: 'u-superadmin',
    nom: sa.nom,
    email: sa.email.toLowerCase(),
    role: 'Super Administrateur',
    typeAcces: 'Super administration',
    titreComplet: 'Super Administrateur de la plateforme',
    poste: 'Administration des comptes et des accès',
    descriptionAcces: 'Création des comptes, gestion des identifiants de connexion, audit des actions de tous les acteurs',
    actif: true,
    passwordHash: await hashSecret(password),
    mustChangePassword: generated || config.seed.forcePasswordChange,
    failedAttempts: 0,
    tokenVersion: Math.floor(Date.now() / 1000) % 1_000_000_000,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  return { email: sa.email, password, generated };
}

const superAdminNote = (r) =>
  r && `Compte Super Administrateur créé : ${r.email}${r.generated ? ` — mot de passe temporaire généré, à noter maintenant : ${r.password}` : ` (mot de passe : SUPERADMIN_PASSWORD)`}.`;

/** Remplace TOUTES les données par celles du dossier database_mysql/ et recrée les identifiants de connexion. */
export async function importDump({ path = config.seed.dumpPath } = {}) {
  const statements = await runDumpInserts(path);
  const report = await finaliserImport();
  const superAdmin = await ensureSuperAdmin();
  const counts = {};
  for (const [name, def] of Object.entries(TABLES)) counts[def.table] = await repos[name].count();
  return { source: path, statements, counts, superAdmin: superAdmin && { email: superAdmin.email, generated: superAdmin.generated, password: superAdmin.generated ? superAdmin.password : undefined }, ...report };
}

/**
 * Démarrage : crée le strict nécessaire si la base est vide.
 *  - base vide + SEED_FROM_DUMP=true : import de database_mysql/ (données + comptes de connexion)
 *  - base vide + SEED_FROM_DUMP=false : paramètres par défaut + un compte administrateur (ADMIN_*)
 */
export async function bootstrap() {
  const log = [];
  // L'import du dump vide les tables avant d'insérer : il n'est lancé que si TOUTES les tables sont vides.
  const nonVides = [];
  for (const [name, def] of Object.entries(TABLES)) if ((await repos[name].count()) > 0) nonVides.push(def.table);
  const [{ n }] = await query('SELECT (SELECT COUNT(*) FROM utilisateurs) AS n');

  if (Number(n) === 0 && nonVides.length) {
    log.push(`Aucun compte utilisateur, mais des données existent (${nonVides.join(', ')}) : import du dump ignoré pour ne rien écraser.`);
  } else if (Number(n) === 0) {
    if (config.seed.fromDump) {
      const r = await importDump();
      log.push(`Base vide : données de ${r.source} importées (${Object.entries(r.counts).map(([t, c]) => `${t}=${c}`).join(', ')}).`);
      log.push(`Identifiants créés pour les ${r.counts.utilisateurs - (r.superAdmin ? 1 : 0)} comptes du dump. Mot de passe initial : « ${config.seed.defaultPassword} » (stocké haché).`);
      if (r.superAdmin) log.push(`Compte Super Administrateur : ${r.superAdmin.email}${r.superAdmin.generated ? ` — mot de passe temporaire généré, à noter maintenant : ${r.superAdmin.password}` : ' (mot de passe : SUPERADMIN_PASSWORD)'}.`);
      if (r.bulletinsEcarts.length) log.push(`Attention : ${r.bulletinsEcarts.length} bulletin(s) dont le recalcul diffère du dump (valeurs du dump conservées).`);
    } else {
      await tx(async () => {
        if (!(await repos.parametres.get('main'))) await repos.parametres.insert({ ...PARAMETRES_DEFAUT, codeConfirmationHash: await hashSecret('0000') });
      });
      log.push('Base vide sans import (SEED_FROM_DUMP=false) : paramètres par défaut créés. Code de confirmation : 0000 (à changer dans Paramètres).');
    }
  }

  if (!(await repos.parametres.get('main'))) await repos.parametres.insert({ ...PARAMETRES_DEFAUT, codeConfirmationHash: await hashSecret('0000') });
  if ((await repos.banques.count()) === 0) await seedBanques();

  // Base alimentée par l'import brut du dump (mysql < cositi_database_mysql_dump.sql) : on ajoute ce qui manque
  // (identifiants de connexion, hash du code de confirmation, détail des bulletins...). Sans effet sur une base déjà prête.
  const p = await finaliserImport();
  if (p.comptesCrees) log.push(`${p.comptesCrees} compte(s) sans identifiants : mot de passe initial « ${config.seed.defaultPassword} » créé (haché).`);
  if (p.parametresInitialises) log.push('Code de confirmation du dump (en clair) haché puis effacé.');
  if (p.bulletinsDetailles) log.push(`${p.bulletinsDetailles} bulletin(s) de paie détaillé(s).`);
  const sa = await ensureSuperAdmin();
  if (sa) log.push(superAdminNote(sa));
  return log;
}
