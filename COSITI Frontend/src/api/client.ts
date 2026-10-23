/**
 * Client de l'API COSITI (Backend/ — Node + MySQL).
 *
 * - Jeton d'accès en mémoire, jeton de renouvellement en sessionStorage (la session se ferme avec le navigateur).
 * - 401 : renouvellement automatique (une seule requête de renouvellement à la fois) puis nouvel essai.
 * - Code de confirmation : si le serveur l'exige ou le refuse, le code est demandé à l'utilisateur (voir
 *   setConfirmationCodePrompt) puis la requête est rejouée.
 */
import type { Utilisateur } from '../types';

const viteEnv = (import.meta as unknown as { env?: Record<string, string | boolean> }).env;
const configuredBase = String(viteEnv?.VITE_API_URL || (viteEnv?.PROD ? 'https://cositibackend.vercel.app/api' : '/api'));
const BASE = (configuredBase.startsWith('/') || /^https?:\/\//i.test(configuredBase) ? configuredBase : `https://${configuredBase}`).replace(/\/$/, '');
const REFRESH_KEY = 'cositi_refresh_token';

export interface ModuleAction {
  id: string;
  label: string;
  kind: 'lecture' | 'ecriture';
  autorise: boolean;
}
export interface ModuleAcces {
  id: string;
  label: string;
  niveau: 'ecriture' | 'lecture' | 'aucun';
  actions: ModuleAction[];
}
export type Permissions = Record<string, boolean | string>;

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: Utilisateur;
  permissions: Permissions;
  modules: ModuleAcces[];
  mustChangePassword?: boolean;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: { champ: string; message: string }[];
  /** corps `data` de la réponse d'erreur (ex. rapport d'un import Excel refusé) */
  data?: any;
  constructor(status: number, message: string, code?: string, details?: { champ: string; message: string }[], data?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.data = data;
  }
}

/** Message lisible (avec le détail des champs invalides) */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.details?.length) return `${e.message} ${e.details.map((d) => `${d.champ ? `${d.champ} : ` : ''}${d.message}`).join(' ; ')}`;
    return e.message;
  }
  if (e instanceof TypeError) return "Serveur injoignable : vérifiez que l'API COSITI est démarrée.";
  return e instanceof Error ? e.message : String(e);
}

// ------------------------------------------------------------------ session
let accessToken: string | null = null;
let session: Session | null = null;
const listeners = new Set<(s: Session | null, reason?: string) => void>();

const storage = {
  get: () => {
    try {
      return sessionStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  set: (v: string | null) => {
    try {
      if (v) sessionStorage.setItem(REFRESH_KEY, v);
      else sessionStorage.removeItem(REFRESH_KEY);
    } catch {
      /* stockage indisponible : la session ne survivra pas au rechargement */
    }
  },
};

function setSession(s: Session | null, reason?: string) {
  session = s;
  accessToken = s?.accessToken ?? null;
  storage.set(s?.refreshToken ?? null);
  listeners.forEach((l) => l(s, reason));
}

export const onSessionChange = (fn: (s: Session | null, reason?: string) => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const getSession = () => session;

// ------------------------------------------------------------------ code de confirmation
let codePrompt: ((message: string) => Promise<string | null>) | null = null;
export const setConfirmationCodePrompt = (fn: typeof codePrompt) => {
  codePrompt = fn;
};
const isCodeProblem = (e: ApiError) => (e.status === 400 && /Code de confirmation requis/i.test(e.message)) || (e.status === 403 && /Code de confirmation incorrect/i.test(e.message));

// ------------------------------------------------------------------ requêtes
interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  confirmCode?: string;
  maintenanceCode?: string;
  auth?: boolean;
  /** demande le code de confirmation à l'utilisateur si le serveur l'exige (défaut : oui) */
  askCode?: boolean;
  /** corps binaire (fichier .xlsx) envoyé tel quel */
  binary?: ArrayBuffer | Blob;
  /** la réponse est un fichier : `data` = Blob, `meta.filename` = nom proposé par le serveur */
  asBlob?: boolean;
}

let refreshing: Promise<boolean> | null = null;

async function raw(method: string, path: string, opts: RequestOptions) {
  const qs = opts.query
    ? '?' +
      Object.entries(opts.query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const headers: Record<string, string> = { Accept: opts.asBlob ? '*/*' : 'application/json' };
  if (opts.binary !== undefined) headers['Content-Type'] = 'application/octet-stream';
  else if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (opts.confirmCode) headers['X-Confirmation-Code'] = opts.confirmCode;
  if (opts.maintenanceCode) headers['X-Maintenance-Code'] = opts.maintenanceCode;
  const res = await fetch(`${BASE}${path}${qs === '?' ? '' : qs}`, {
    method,
    headers,
    body: opts.binary !== undefined ? opts.binary : opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  if (opts.asBlob && res.ok) {
    const filename = res.headers.get('X-Filename') || /filename="?([^";]+)"?/i.exec(res.headers.get('Content-Disposition') || '')?.[1] || undefined;
    return { success: true, data: await res.blob(), meta: { filename } } as { success: true; data: any; meta?: any };
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    throw new ApiError(res.status, json?.error || `Erreur ${res.status}`, json?.code, json?.details, json?.data);
  }
  return json as { success: true; data: any; meta?: any };
}

async function tryRefresh(): Promise<boolean> {
  const rt = storage.get();
  if (!rt) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const r = await raw('POST', '/auth/refresh', { body: { refreshToken: rt }, auth: false });
        setSession({ ...(session || {}), ...r.data, user: { ...r.data.user, permissions: r.data.permissions } });
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => (refreshing = null), 0);
      }
    })();
  }
  return refreshing;
}

export async function request(method: string, path: string, opts: RequestOptions = {}): Promise<{ data: any; meta?: any }> {
  let attempt = { ...opts };
  for (let i = 0; i < 4; i++) {
    try {
      return await raw(method, path, attempt);
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      if (e.status === 401 && attempt.auth !== false && !path.startsWith('/auth/login') && i === 0) {
        if (await tryRefresh()) continue;
        setSession(null, 'expired');
        throw new ApiError(401, 'Session expirée : veuillez vous reconnecter.');
      }
      if (isCodeProblem(e) && attempt.askCode !== false && codePrompt) {
        const code = await codePrompt(e.status === 403 ? 'Code incorrect. Saisissez le code de confirmation :' : 'Cette opération exige le code de confirmation :');
        if (!code) throw new ApiError(e.status, 'Opération annulée : code de confirmation non saisi.');
        attempt = { ...attempt, confirmCode: code };
        continue;
      }
      throw e;
    }
  }
  throw new ApiError(403, 'Code de confirmation incorrect.');
}

/** Télécharge un fichier produit par le serveur (export Excel...) : déclenche l'enregistrement dans le navigateur. */
export async function downloadFile(method: string, path: string, opts: RequestOptions & { filename?: string } = {}): Promise<string> {
  const r = await request(method, path, { ...opts, asBlob: true });
  const name = (r.meta?.filename as string | undefined) || opts.filename || 'export.xlsx';
  const url = URL.createObjectURL(r.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return name;
}

/** Toutes les pages d'une liste paginée */
export async function getAll<T = any>(path: string, query: RequestOptions['query'] = {}): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page < 200; page++) {
    const r = await request('GET', path, { query: { ...query, page, pageSize: 500 } });
    out.push(...r.data);
    const total = r.meta?.total ?? r.data.length;
    if (out.length >= total || r.data.length === 0) break;
  }
  return out;
}

// ------------------------------------------------------------------ authentification
const toSession = (d: any): Session => ({ ...d, user: { ...d.user, permissions: d.permissions } });

export const auth = {
  async login(email: string, password: string) {
    const r = await raw('POST', '/auth/login', { body: { email, password }, auth: false });
    setSession(toSession(r.data));
    return session!;
  },
  /** Reprend la session après un rechargement de page (refresh token en sessionStorage) */
  async restore(): Promise<Session | null> {
    if (!storage.get()) return null;
    return (await tryRefresh()) ? session : null;
  },
  async logout() {
    const rt = storage.get();
    try {
      if (accessToken) await raw('POST', '/auth/logout', { body: { refreshToken: rt || undefined } });
    } catch {
      /* déjà expirée */
    }
    setSession(null, 'logout');
  },
  async changePassword(currentPassword: string, newPassword: string) {
    const r = await request('POST', '/auth/change-password', { body: { currentPassword, newPassword } });
    setSession(toSession(r.data));
    return session!;
  },
  async verifyCode(pinCode: string) {
    await request('POST', '/auth/verify-code', { body: { pinCode }, askCode: false });
    return true;
  },
  expire() {
    setSession(null, 'expired');
  },
};

/** Trace dans le journal d'audit une action effectuée dans le navigateur (impression, export...). Sans effet bloquant. */
export function logEvent(
  typeOperation: 'IMPRESSION_DOCUMENT' | 'EXPORT_DONNEES' | 'IMPRESSION_RAPPORT_AUDIT' | 'CONSULTATION_PROFIL' | 'IMPRESSION_RECU' | 'CONSULTATION_RAPPORT',
  description: string,
  matricule?: string
) {
  if (!accessToken) return;
  request('POST', '/journal/evenements', { body: { typeOperation, description, matricule } }).catch(() => undefined);
}
