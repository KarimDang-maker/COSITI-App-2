import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Backend/.env, quel que soit le dossier depuis lequel la commande est lancée (les variables déjà définies priment)
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

const env = process.env;
const isProd = env.NODE_ENV === 'production';

const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};
const bool = (v, d) => (v === undefined || v === '' ? d : ['1', 'true', 'yes'].includes(String(v).toLowerCase()));

export const config = {
  env: env.NODE_ENV || 'development',
  isProd,
  port: int(env.PORT, 4000),
  corsOrigins: (env.CORS_ORIGINS || 'http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean),
  trustProxy: int(env.TRUST_PROXY, 0),
  db: {
    host: env.DB_HOST || '127.0.0.1',
    port: int(env.DB_PORT, 3306),
    user: env.DB_USER || 'cositi',
    password: env.DB_PASSWORD ?? '',
    name: env.DB_NAME || 'cositi_ci',
    ssl: bool(env.DB_SSL, false),
    sslCa: env.DB_SSL_CA || '',
    poolSize: int(env.DB_POOL_SIZE, 10),
    // Crée la base si elle n'existe pas (nécessite le privilège CREATE)
    autoCreate: bool(env.DB_AUTO_CREATE, true),
    // Hôte autorisé pour DB_USER lors de sa création (CREATE USER 'user'@'hôte')
    userHost: env.DB_USER_HOST || 'localhost',
    // Compte administrateur MySQL : « npm run db:setup », et au démarrage SEULEMENT si DB_PROVISION_ON_START=true
    admin: { user: env.DB_ADMIN_USER || '', password: env.DB_ADMIN_PASSWORD ?? '' },
    provisionOnStart: bool(env.DB_PROVISION_ON_START, false),
  },
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET || 'dev-access-secret-not-for-production-use-0000',
    refreshSecret: env.JWT_REFRESH_SECRET || 'dev-refresh-secret-not-for-production-use-1111',
    accessTtl: env.ACCESS_TOKEN_TTL || '15m',
    refreshTtlDays: int(env.REFRESH_TOKEN_TTL_DAYS, 7),
  },
  bcryptRounds: int(env.BCRYPT_ROUNDS, 12),
  maxLoginAttempts: int(env.MAX_LOGIN_ATTEMPTS, 5),
  lockMinutes: int(env.LOCK_MINUTES, 15),
  // Limite de requêtes par IP sur /auth/login (par 15 min) et /auth/refresh (par 15 min). Large : un bureau partage souvent une seule IP.
  apiRateLimit: int(env.API_RATE_LIMIT, 600), // requêtes / minute / IP sur toute l'API
  loginRateLimit: int(env.LOGIN_RATE_LIMIT, 100),
  refreshRateLimit: int(env.REFRESH_RATE_LIMIT, 600),
  maintenanceCode: env.MAINTENANCE_CODE || '1111',
  // POST /systeme/reset-demo efface TOUTES les données : désactivé par défaut en production.
  allowDemoReset: bool(env.ALLOW_DEMO_RESET, !isProd),
  seed: {
    // Base vide au démarrage : true => importe database_mysql/ ; false => un seul compte administrateur
    fromDump: bool(env.SEED_FROM_DUMP ?? env.SEED_DEMO_DATA, true),
    dumpPath: env.DUMP_PATH || fileURLToPath(new URL('../database/COSITI DATABASE/cositi_database_mysql_dump_2026-10-26.sql', import.meta.url)),
    defaultPassword: env.SEED_DEFAULT_PASSWORD || 'Cositi@2026!',
    // true : les comptes importés doivent changer leur mot de passe à la 1re connexion (recommandé en production)
    forcePasswordChange: bool(env.SEED_FORCE_PASSWORD_CHANGE, false),
    // Compte Super Administrateur garanti au démarrage (seul habilité à gérer comptes et identifiants)
    superAdmin: {
      nom: env.SUPERADMIN_NOM || 'Super Administrateur COSITI',
      email: env.SUPERADMIN_EMAIL || 'superadmin@cositi-ci.org',
      // vide => mot de passe aléatoire affiché une seule fois dans la console, changement imposé
      password: env.SUPERADMIN_PASSWORD ?? (isProd ? '' : 'SuperAdmin@2026!'),
    },
  },
};

if (isProd) {
  const weak = (s) => !s || s.length < 32 || s.startsWith('change-me') || s.startsWith('dev-');
  if (weak(env.JWT_ACCESS_SECRET) || weak(env.JWT_REFRESH_SECRET) || env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET et JWT_REFRESH_SECRET doivent être définis, distincts, et faire au moins 32 caractères en production.');
  }
  if (config.maintenanceCode === '1111') {
    console.warn('[config] ATTENTION : MAINTENANCE_CODE utilise la valeur par défaut (1111). Changez-le en production.');
  }
}
