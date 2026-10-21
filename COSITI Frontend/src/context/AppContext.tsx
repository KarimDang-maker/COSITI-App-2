/**
 * Données de la plateforme : TOUT vient de l'API COSITI (Backend/ — base MySQL).
 * Aucune donnée n'est conservée dans le navigateur ; chaque action appelle le serveur, qui applique les règles
 * métier, contrôle les droits et journalise l'opération, puis les listes concernées sont rechargées.
 *
 * Les actions gardent les noms de l'ancien contexte mais sont asynchrones : `await action(...)` renvoie
 * `{ success, error?, ... }`. Une erreur est aussi signalée dans une notification (voir `notifications`).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Adherent,
  Alerte,
  BrancheCnps,
  Cotisation,
  DossierAllocations,
  JournalOperation,
  ParametresApp,
  Utilisateur,
  DepenseCourante,
  VersementBancaire,
  FraisMobileMoney,
  PartenaireDirection,
  RendezVousDirection,
  NoteSpecifiqueDirection,
  GestionnairePortefeuille,
  RapportReunion,
  RapportAgentTerrain,
  StatutAdherent,
  TypeRegularisationCotisation,
  ModePaiement,
  Employe,
  BulletinPaie,
} from '../types';
import { getAll, request, errorMessage, type ModuleAcces } from '../api/client';
import { STATS_VIDES, type AdherentStats, type AdherentAvecStats, type DashboardData, type FinanceSynthese, type SuiviVersements } from '../api/models';
import { useAuth } from './AuthContext';

type Result<T = object> = Promise<{ success: boolean; error?: string } & Partial<T>>;

export interface Notification {
  id: number;
  type: 'error' | 'success';
  message: string;
}

export interface ActiviteUtilisateur {
  items: JournalOperation[];
  total: number;
  statistiques: {
    total: number;
    premiereAction: string | null;
    derniereAction: string | null;
    connexions: number;
    echecsConnexion: number;
    parTypeOperation: Record<string, number>;
    parEntite: Record<string, number>;
    parJour: Record<string, number>;
  };
}

export interface RapportAudit {
  organisation: { nom?: string; sigle?: string; adresse?: string; telephone?: string; email?: string };
  utilisateur: Utilisateur & { modules: ModuleAcces[] };
  periode: { du: string | null; au: string | null };
  statistiques: ActiviteUtilisateur['statistiques'];
  actions: JournalOperation[];
  actionsTronquees: boolean;
  genereLe: string;
  generePar: { id: string; nom: string; role: string };
}

export interface NouveauCompte {
  nom: string;
  email: string;
  role: Utilisateur['role'];
  typeAcces?: Utilisateur['typeAcces'];
  titreComplet?: string;
  poste?: string;
  descriptionAcces?: string;
  telephone?: string;
  actif?: boolean;
  password: string;
  mustChangePassword?: boolean;
}

export interface Identifiants {
  email?: string;
  password?: string;
  mustChangePassword?: boolean;
  deverrouiller?: boolean;
}

interface AppContextType {
  // ---- données (MySQL via l'API)
  adherents: Adherent[];
  cotisations: Cotisation[];
  dossiers: DossierAllocations[];
  journal: JournalOperation[];
  parametres: ParametresApp;
  utilisateurs: Utilisateur[];
  currentUser: Utilisateur;
  modules: ModuleAcces[];
  /** Alertes calculées par le serveur (GET /alertes) */
  alerts: Alerte[];
  /** Noms des acteurs en poste (DG, DGA, DAF, PCA) pour les signatures des documents imprimés — lus en base, jamais codés en dur */
  signataires: { dg: string; dga: string; daf: string; pca: string };
  /** Statistiques de cotisation d'un adhérent, calculées par le serveur (jamais recalculées dans le navigateur) */
  statsOf: (adherent: Pick<Adherent, 'id' | 'matricule'> | null | undefined) => AdherentStats;
  /** Tableau de bord calculé par le serveur (GET /dashboard) */
  dashboard: DashboardData | null;
  /** Synthèse financière calculée par le serveur (GET /finances/synthese) — direction financière uniquement */
  finances: FinanceSynthese | null;
  /** Cotisations en attente de versement et dernier point d'arrêt (GET /versements/suivi/en-attente) */
  suiviVersements: SuiviVersements | null;
  gestionnaires: GestionnairePortefeuille[];
  depenses: DepenseCourante[];
  versements: VersementBancaire[];
  fraisMobileMoney: FraisMobileMoney[];
  banques: string[];
  employes: Employe[];
  bulletinsPaie: BulletinPaie[];
  partenaires: PartenaireDirection[];
  rendezVous: RendezVousDirection[];
  notesDirection: NoteSpecifiqueDirection[];
  rapportsReunions: RapportReunion[];
  rapportsAgents: RapportAgentTerrain[];
  loading: boolean;
  lastSync: string | null;
  refreshAll: () => Promise<void>;
  notifications: Notification[];
  dismissNotification: (id: number) => void;

  // ---- navigation (état d'interface)
  activeTab: string;
  selectedAdherentId: string | null;
  globalSearch: string;
  setActiveTab: (tab: string) => void;
  setSelectedAdherentId: (id: string | null) => void;
  setGlobalSearch: (term: string) => void;
  /** La session est gérée par le serveur : un compte = une personne, connexion par e-mail + mot de passe uniquement. */
  setCurrentUser: (user: Utilisateur) => void;

  // ---- gestionnaires
  addGestionnaire: (data: Omit<GestionnairePortefeuille, 'id' | 'createdAt' | 'updatedAt'>) => Result<{ gestionnaire: GestionnairePortefeuille }>;
  updateGestionnaire: (id: string, data: Partial<GestionnairePortefeuille>) => Result;
  deleteGestionnaire: (id: string) => Result;
  assignerPortefeuille: (adherentId: string, gestionnaireId: string | null) => Result;

  // ---- rapports
  addRapportReunion: (data: Omit<RapportReunion, 'id' | 'createdAt' | 'updatedAt'>) => Result<{ rapport: RapportReunion }>;
  updateRapportReunion: (id: string, data: Partial<RapportReunion>) => Result;
  deleteRapportReunion: (id: string) => Result;
  addRapportAgent: (data: Omit<RapportAgentTerrain, 'id' | 'createdAt' | 'updatedAt'>) => Result<{ rapport: RapportAgentTerrain }>;
  updateRapportAgent: (id: string, data: Partial<RapportAgentTerrain>) => Result;
  deleteRapportAgent: (id: string) => Result;
  validerRapportAgentDaf: (id: string, visa: string) => Result;

  // ---- adhérents / cotisations / dossiers
  addAdherent: (data: Omit<Adherent, 'id' | 'matricule' | 'createdAt' | 'updatedAt'>) => Result<{ adherent: Adherent }>;
  updateAdherent: (id: string, data: Partial<Adherent>, pinCode: string) => Result;
  updateAdherentStatut: (adherentId: string, nouveauStatut: StatutAdherent, motif?: string) => Result;
  deleteAdherent: (id: string, pinCode: string) => Result;
  addCotisation: (data: Omit<Cotisation, 'id' | 'createdAt'>) => Result<{ cotisation: Cotisation }>;
  updateCotisation: (id: string, data: Partial<Cotisation>, pinCode: string) => Result;
  deleteCotisation: (id: string, pinCode: string) => Result;
  regulariserCotisation: (params: {
    cotisationId?: string;
    adherentId: string;
    matricule: string;
    adherentNomPrenom: string;
    montant: number;
    modePaiement: ModePaiement;
    datePaiement: string;
    mois: string;
    annee: number;
    typeRegularisation: TypeRegularisationCotisation;
    motifRegularisation: string;
    montantAnterieurInitial?: number;
    montantComplementaire?: number;
    reference?: string;
    observations?: string;
  }) => Result<{ cotisation: Cotisation }>;
  immatriculerAdherent: (adherentId: string, numeroCnps: string, dateImmatriculation: string, observations?: string) => Result;
  updateDossier: (dossierId: string, data: Partial<DossierAllocations>, noteAction?: string) => Result;
  createDossierForAdherent: (adherentId: string, branche?: BrancheCnps, sousRubriqueOffre?: string) => Result;
  marquerAdherentSansEnfant: (adherentId: string, motif?: string) => Result;

  // ---- finances
  addDepense: (data: Omit<DepenseCourante, 'id' | 'createdAt'>) => Result;
  updateDepense: (id: string, data: Partial<DepenseCourante>) => Result;
  deleteDepense: (id: string, pinCode?: string) => Result;
  addVersement: (data: Omit<VersementBancaire, 'id' | 'createdAt'>) => Result;
  updateVersement: (id: string, data: Partial<VersementBancaire>) => Result;
  deleteVersement: (id: string, pinCode?: string) => Result;
  addBanque: (nom: string) => Result;
  deleteBanque: (nom: string) => Result;
  resetBanques: () => Result;
  addFraisMobileMoney: (data: Omit<FraisMobileMoney, 'id' | 'createdAt'>) => Result;
  updateFraisMobileMoney: (id: string, data: Partial<FraisMobileMoney>) => Result;
  deleteFraisMobileMoney: (id: string, pinCode?: string) => Result;

  // ---- paie
  addEmploye: (data: Omit<Employe, 'id' | 'createdAt' | 'updatedAt'>) => Result;
  updateEmploye: (id: string, data: Partial<Employe>) => Result;
  deleteEmploye: (id: string, pinCode?: string) => Result;
  genererPaieMois: (mois: string, options?: { ecraserExistant?: boolean }) => Result<{ count: number }>;
  genererPaieAdherentsCnps: (mois: string, salaireCotisableDefaut?: number) => Result<{ count: number }>;
  updateSalaireCotisableAdherent: (adherentId: string, montant: number) => Result;
  saveBulletinPaie: (bulletin: BulletinPaie) => Result;
  deleteBulletinPaie: (id: string) => Result;
  validerPaieMois: (mois: string, genererDepenseAutomatique?: boolean) => Result;

  // ---- direction
  addPartenaire: (data: Omit<PartenaireDirection, 'id' | 'createdAt' | 'updatedAt'>) => Result;
  updatePartenaire: (id: string, data: Partial<PartenaireDirection>) => Result;
  deletePartenaire: (id: string) => Result;
  addRendezVous: (data: Omit<RendezVousDirection, 'id' | 'createdAt' | 'updatedAt'>) => Result;
  updateRendezVous: (id: string, data: Partial<RendezVousDirection>) => Result;
  deleteRendezVous: (id: string) => Result;
  addNoteDirection: (data: Omit<NoteSpecifiqueDirection, 'id' | 'createdAt' | 'updatedAt'>) => Result;
  updateNoteDirection: (id: string, data: Partial<NoteSpecifiqueDirection>) => Result;
  deleteNoteDirection: (id: string) => Result;

  // ---- administration
  updateParametres: (newParams: Partial<ParametresApp> & { ancienCodeConfirmation?: string }) => Result;
  addUtilisateur: (compte: NouveauCompte) => Result<{ utilisateur: Utilisateur }>;
  updateUtilisateur: (id: string, data: Partial<Utilisateur>) => Result;
  updateIdentifiants: (id: string, data: Identifiants) => Result;
  deleteUtilisateur: (id: string) => Result;
  nouveauParametrageUtilisateurs: (users: Utilisateur[]) => Result;
  fetchActiviteUtilisateur: (id: string, filtres?: { du?: string; au?: string; typeOperation?: string; page?: number; pageSize?: number }) => Promise<ActiviteUtilisateur>;
  fetchRapportAudit: (id: string, filtres?: { du?: string; au?: string }) => Promise<RapportAudit>;
  clearJournal: () => Result;
  resetToDemoData: () => Result;
  wipeAllDataForUpdate: (password: string) => Result;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/** Collections chargées depuis l'API, avec le droit nécessaire pour y accéder */
const COLLECTIONS = {
  // stats=true : chaque adhérent arrive avec ses statistiques de cotisation calculées par le serveur
  adherents: { path: '/adherents', query: { stats: 'true' } },
  cotisations: { path: '/cotisations' },
  dossiers: { path: '/dossiers' },
  gestionnaires: { path: '/gestionnaires' },
  utilisateurs: { path: '/utilisateurs', single: true },
  banques: { path: '/banques', single: true },
  rapportsReunions: { path: '/rapports-reunions' },
  rapportsAgents: { path: '/rapports-agents' },
  depenses: { path: '/depenses', perm: 'canManageFinances' },
  versements: { path: '/versements', perm: 'canManageFinances' },
  fraisMobileMoney: { path: '/frais-mobile-money', perm: 'canManageFinances' },
  employes: { path: '/employes', perm: 'canManageFinances' },
  bulletinsPaie: { path: '/paie/bulletins', perm: 'canManageFinances' },
  partenaires: { path: '/partenaires', perm: 'canManageAgenda' },
  rendezVous: { path: '/rendez-vous', perm: 'canManageAgenda' },
  notesDirection: { path: '/notes-direction', perm: 'canManageAgenda' },
} as const;
type Key = keyof typeof COLLECTIONS | 'journal' | 'parametres' | 'alertes' | 'dashboard' | 'finances' | 'suiviVersements';
type Store = { [K in keyof typeof COLLECTIONS]: any[] } & {
  journal: JournalOperation[];
  parametres: ParametresApp | null;
  alertes: Alerte[];
  dashboard: DashboardData | null;
  finances: FinanceSynthese | null;
  suiviVersements: SuiviVersements | null;
};

/** Modèles calculés par le serveur : rechargés après CHAQUE action (un chiffre affiché ne peut pas être périmé) */
const CALCULES: Key[] = ['alertes', 'dashboard', 'finances', 'suiviVersements'];

const EMPTY: Store = {
  adherents: [], cotisations: [], dossiers: [], gestionnaires: [], utilisateurs: [], banques: [], rapportsReunions: [],
  rapportsAgents: [], depenses: [], versements: [], fraisMobileMoney: [], employes: [], bulletinsPaie: [], partenaires: [],
  rendezVous: [], notesDirection: [], journal: [], parametres: null, alertes: [], dashboard: null, finances: null, suiviVersements: null,
};

const sans = <T extends object>(obj: T, keys: string[]) =>
  Object.fromEntries(Object.entries(obj).filter(([k, v]) => !keys.includes(k) && v !== undefined)) as Partial<T>;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const perms = (session?.permissions || {}) as Record<string, boolean>;
  const currentUser = session!.user;

  const [store, setStore] = useState<Store>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAdherentId, setSelectedAdherentId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const notifId = useRef(0);

  const notify = useCallback((type: Notification['type'], message: string) => {
    const id = ++notifId.current;
    setNotifications((n) => [...n.slice(-3), { id, type, message }]);
    setTimeout(() => setNotifications((n) => n.filter((x) => x.id !== id)), type === 'error' ? 9000 : 4000);
  }, []);
  const dismissNotification = useCallback((id: number) => setNotifications((n) => n.filter((x) => x.id !== id)), []);

  // ------------------------------------------------------------ chargement depuis l'API
  const fetchKey = useCallback(
    async (key: Key): Promise<unknown> => {
      if (key === 'parametres') return (await request('GET', '/parametres')).data;
      if (key === 'journal') return (await request('GET', '/journal', { query: { pageSize: 500 } })).data;
      if (key === 'alertes') return (await request('GET', '/alertes')).data;
      if (key === 'dashboard') return (await request('GET', '/dashboard')).data;
      if (key === 'finances') return perms.canManageFinances ? (await request('GET', '/finances/synthese')).data : null;
      if (key === 'suiviVersements') return perms.canManageFinances ? (await request('GET', '/versements/suivi/en-attente')).data : null;
      const c = COLLECTIONS[key] as { path: string; perm?: string; single?: boolean; query?: Record<string, string> };
      if (c.perm && !perms[c.perm]) return [];
      return c.single ? (await request('GET', c.path)).data : getAll(c.path, c.query);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session?.user.id, session?.user.role]
  );

  const reload = useCallback(
    async (keys: Key[]) => {
      const uniq = [...new Set(keys)];
      const values = await Promise.all(uniq.map((k) => fetchKey(k).catch((e) => ({ __error: errorMessage(e) }))));
      setStore((s) => {
        const next = { ...s } as Store;
        uniq.forEach((k, i) => {
          const v = values[i] as any;
          if (v && v.__error) return;
          (next as any)[k] = v;
        });
        return next;
      });
      setLastSync(new Date().toISOString());
      const failed = values.find((v: any) => v && v.__error) as any;
      if (failed) throw new Error(failed.__error);
    },
    [fetchKey]
  );

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await reload([...(Object.keys(COLLECTIONS) as Key[]), 'journal', 'parametres', ...CALCULES]);
      setLoadError(null);
      setLoaded(true);
    } catch (e) {
      setLoadError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [reload]);

  // nouveau chargement complet à chaque changement d'utilisateur (connexion, bascule)
  useEffect(() => {
    setStore(EMPTY);
    setLoaded(false);
    refreshAll();
  }, [session?.user.id, refreshAll]);

  /** Exécute une action serveur, recharge les collections touchées (+ journal) et normalise le résultat. */
  const run = useCallback(
    async <T,>(action: () => Promise<T>, keys: Key[], pick?: (r: T) => object, successMessage?: string) => {
      try {
        const r = await action();
        await reload([...keys, 'journal', ...CALCULES]).catch(() => undefined);
        if (successMessage) notify('success', successMessage);
        return { success: true, ...(pick ? pick(r) : {}) } as any;
      } catch (e) {
        const error = errorMessage(e);
        notify('error', error);
        return { success: false, error } as any;
      }
    },
    [reload, notify]
  );

  const api = {
    post: async (path: string, body?: unknown, confirmCode?: string) => (await request('POST', path, { body, confirmCode })).data,
    put: async (path: string, body?: unknown, confirmCode?: string) => (await request('PUT', path, { body, confirmCode })).data,
    patch: async (path: string, body?: unknown) => (await request('PATCH', path, { body })).data,
    del: async (path: string, confirmCode?: string) => (await request('DELETE', path, { confirmCode })).data,
  };
  const enc = encodeURIComponent;

  // statistiques par adhérent : celles du serveur, indexées par id et matricule
  const statsIndex = useMemo(() => {
    const m = new Map<string, AdherentStats>();
    for (const a of store.adherents as AdherentAvecStats[]) if (a.stats) { m.set(a.id, a.stats); m.set(a.matricule, a.stats); }
    return m;
  }, [store.adherents]);
  const signataires = useMemo(() => {
    const nom = (role: string) => store.utilisateurs.find((u) => u.role === role && u.actif !== false)?.nom ?? '';
    return { dg: nom('DG'), dga: nom('DGA'), daf: nom('DAF'), pca: nom('PCA') };
  }, [store.utilisateurs]);
  const statsOf = useCallback(
    (a: Pick<Adherent, 'id' | 'matricule'> | null | undefined) => (a && (statsIndex.get(a.id) || statsIndex.get(a.matricule))) || STATS_VIDES,
    [statsIndex]
  );

  // ------------------------------------------------------------ actions
  const value: AppContextType = {
    adherents: store.adherents,
    cotisations: store.cotisations,
    dossiers: store.dossiers,
    journal: store.journal,
    parametres: store.parametres as ParametresApp,
    utilisateurs: store.utilisateurs,
    currentUser,
    modules: session?.modules || [],
    alerts: store.alertes,
    signataires,
    statsOf,
    dashboard: store.dashboard,
    finances: store.finances,
    suiviVersements: store.suiviVersements,
    gestionnaires: store.gestionnaires,
    depenses: store.depenses,
    versements: store.versements,
    fraisMobileMoney: store.fraisMobileMoney,
    banques: store.banques,
    employes: store.employes,
    bulletinsPaie: store.bulletinsPaie,
    partenaires: store.partenaires,
    rendezVous: store.rendezVous,
    notesDirection: store.notesDirection,
    rapportsReunions: store.rapportsReunions,
    rapportsAgents: store.rapportsAgents,
    loading,
    lastSync,
    refreshAll,
    notifications,
    dismissNotification,

    activeTab,
    selectedAdherentId,
    globalSearch,
    setActiveTab,
    setSelectedAdherentId,
    setGlobalSearch,
    setCurrentUser: () => notify('error', 'Changement de session impossible : déconnectez-vous puis connectez-vous avec vos propres identifiants.'),

    addGestionnaire: (data) => run(() => api.post('/gestionnaires', data), ['gestionnaires'], (g) => ({ gestionnaire: g })),
    updateGestionnaire: (id, data) => run(() => api.put(`/gestionnaires/${enc(id)}`, sans(data, ['id', 'createdAt', 'updatedAt'])), ['gestionnaires', 'adherents']),
    deleteGestionnaire: (id) => run(() => api.del(`/gestionnaires/${enc(id)}`), ['gestionnaires', 'adherents']),
    assignerPortefeuille: (adherentId, gestionnaireId) => run(() => api.put(`/adherents/${enc(adherentId)}/portefeuille`, { gestionnaireId }), ['adherents']),

    addRapportReunion: (data) => run(() => api.post('/rapports-reunions', data), ['rapportsReunions'], (r) => ({ rapport: r })),
    updateRapportReunion: (id, data) => run(() => api.put(`/rapports-reunions/${enc(id)}`, sans(data, ['id', 'createdAt', 'updatedAt', 'redigePar'])), ['rapportsReunions']),
    deleteRapportReunion: (id) => run(() => api.del(`/rapports-reunions/${enc(id)}`), ['rapportsReunions']),
    addRapportAgent: (data) => run(() => api.post('/rapports-agents', data), ['rapportsAgents'], (r) => ({ rapport: r })),
    updateRapportAgent: (id, data) =>
      run(() => api.put(`/rapports-agents/${enc(id)}`, sans(data, ['id', 'createdAt', 'updatedAt', 'saisiPar', 'statutValidation', 'visaDaf', 'dateHeureSaisie'])), ['rapportsAgents']),
    deleteRapportAgent: (id) => run(() => api.del(`/rapports-agents/${enc(id)}`), ['rapportsAgents']),
    validerRapportAgentDaf: (id, visa) => run(() => api.post(`/rapports-agents/${enc(id)}/valider-daf`, { visa }), ['rapportsAgents']),

    addAdherent: (data) => run(() => api.post('/adherents', sans(data, ['gestionnaireNom'])), ['adherents', 'dossiers', 'parametres'], (a) => ({ adherent: a })),
    updateAdherent: (id, data, pinCode) =>
      run(() => api.put(`/adherents/${enc(id)}`, sans(data, ['id', 'matricule', 'createdAt', 'updatedAt', 'gestionnaireNom']), pinCode), ['adherents', 'dossiers']),
    updateAdherentStatut: (id, statut, motif) => run(() => api.patch(`/adherents/${enc(id)}/statut`, { statut, motif }), ['adherents']),
    deleteAdherent: (id, pinCode) => run(() => api.del(`/adherents/${enc(id)}`, pinCode), ['adherents', 'dossiers']),
    addCotisation: (data) => run(() => api.post('/cotisations', sans(data, ['matricule', 'adherentNomPrenom'])), ['cotisations', 'adherents'], (c) => ({ cotisation: c })),
    updateCotisation: (id, data, pinCode) =>
      run(() => api.put(`/cotisations/${enc(id)}`, sans(data, ['id', 'adherentId', 'matricule', 'adherentNomPrenom', 'agentEnregistreur', 'createdAt']), pinCode), ['cotisations', 'adherents']),
    deleteCotisation: (id, pinCode) => run(() => api.del(`/cotisations/${enc(id)}`, pinCode), ['cotisations', 'adherents']),
    regulariserCotisation: (params) => run(() => api.post('/cotisations/regulariser', sans(params, ['adherentNomPrenom'])), ['cotisations', 'adherents'], (c) => ({ cotisation: c })),
    immatriculerAdherent: (adherentId, numeroCnps, dateImmatriculation, observations) =>
      run(() => api.post(`/adherents/${enc(adherentId)}/immatriculer`, { numeroCnps, dateImmatriculation, observations }), ['adherents', 'dossiers']),
    updateDossier: (dossierId, data, noteAction) =>
      run(() => api.put(`/dossiers/${enc(dossierId)}`, { ...sans(data, ['id', 'adherentId', 'matricule', 'adherentNomPrenom', 'historique', 'createdAt', 'updatedAt', 'branche', 'sousRubriqueOffre', 'dateImmatriculation']), noteAction }), ['dossiers', 'adherents']),
    createDossierForAdherent: (adherentId, branche, sousRubriqueOffre) => run(() => api.post('/dossiers', { adherentId, branche, sousRubriqueOffre }), ['dossiers']),
    marquerAdherentSansEnfant: (adherentId, motif) => run(() => api.post(`/adherents/${enc(adherentId)}/sans-enfant`, { motif }), ['adherents', 'dossiers']),

    addDepense: (data) => run(() => api.post('/depenses', sans(data, ['enregistrePar'])), ['depenses']),
    updateDepense: (id, data) => run(() => api.put(`/depenses/${enc(id)}`, sans(data, ['id', 'createdAt', 'enregistrePar'])), ['depenses']),
    deleteDepense: (id, pinCode) => run(() => api.del(`/depenses/${enc(id)}`, pinCode), ['depenses']),
    addVersement: (data) => run(() => api.post('/versements', sans(data, ['enregistrePar'])), ['versements']),
    updateVersement: (id, data) => run(() => api.put(`/versements/${enc(id)}`, sans(data, ['id', 'createdAt', 'enregistrePar'])), ['versements']),
    deleteVersement: (id, pinCode) => run(() => api.del(`/versements/${enc(id)}`, pinCode), ['versements']),
    addBanque: (nom) => run(() => api.post('/banques', { nom }), ['banques']),
    deleteBanque: (nom) => run(() => api.del(`/banques/${enc(nom)}`), ['banques']),
    resetBanques: () => run(() => api.post('/banques/reset'), ['banques']),
    addFraisMobileMoney: (data) => run(() => api.post('/frais-mobile-money', sans(data, ['enregistrePar', 'montantNet'])), ['fraisMobileMoney']),
    updateFraisMobileMoney: (id, data) => run(() => api.put(`/frais-mobile-money/${enc(id)}`, sans(data, ['id', 'createdAt', 'enregistrePar', 'montantNet'])), ['fraisMobileMoney']),
    deleteFraisMobileMoney: (id, pinCode) => run(() => api.del(`/frais-mobile-money/${enc(id)}`, pinCode), ['fraisMobileMoney']),

    addEmploye: (data) => run(() => api.post('/employes', data), ['employes']),
    updateEmploye: (id, data) => run(() => api.put(`/employes/${enc(id)}`, sans(data, ['id', 'createdAt', 'updatedAt'])), ['employes']),
    deleteEmploye: (id, pinCode) => run(() => api.del(`/employes/${enc(id)}`, pinCode), ['employes']),
    genererPaieMois: (mois, options) => run(() => api.post('/paie/generer', { mois, ecraserExistant: !!options?.ecraserExistant }), ['bulletinsPaie'], (r: any) => ({ count: r.count })),
    genererPaieAdherentsCnps: (mois, salaire) => run(() => api.post('/paie/generer-adherents', { mois, salaireCotisableDefaut: salaire ?? 60000 }), ['bulletinsPaie'], (r: any) => ({ count: r.count })),
    updateSalaireCotisableAdherent: (adherentId, montant) => run(() => api.put(`/adherents/${enc(adherentId)}/salaire-cotisable`, { montant }), ['adherents', 'bulletinsPaie']),
    saveBulletinPaie: (b) =>
      run(
        () =>
          api.put(`/paie/bulletins/${enc(b.id)}`, {
            salaireBase: b.salaireBase, sursalaire: b.sursalaire, primeAnciennete: b.primeAnciennete, primeRendement: b.primeRendement,
            indemniteTransport: b.indemniteTransport, indemniteLogement: b.indemniteLogement, autresPrimes: b.autresPrimes,
            acomptesAvances: b.acomptesAvances, retenuesDiverses: b.retenuesDiverses, heuresTravaillees: b.heuresTravaillees,
            joursTravailles: b.joursTravailles, notesCommentaires: b.notesCommentaires, datePaiement: b.datePaiement, statut: b.statut,
          }),
        ['bulletinsPaie']
      ),
    deleteBulletinPaie: (id) => run(() => api.del(`/paie/bulletins/${enc(id)}`), ['bulletinsPaie']),
    validerPaieMois: (mois, gen = true) => run(() => api.post('/paie/valider', { mois, genererDepenseAutomatique: gen }), ['bulletinsPaie', 'depenses']),

    addPartenaire: (data) => run(() => api.post('/partenaires', sans(data, ['enregistrePar'])), ['partenaires']),
    updatePartenaire: (id, data) => run(() => api.put(`/partenaires/${enc(id)}`, sans(data, ['id', 'createdAt', 'updatedAt', 'enregistrePar'])), ['partenaires']),
    deletePartenaire: (id) => run(() => api.del(`/partenaires/${enc(id)}`), ['partenaires']),
    addRendezVous: (data) => run(() => api.post('/rendez-vous', sans(data, ['enregistrePar'])), ['rendezVous']),
    updateRendezVous: (id, data) => run(() => api.put(`/rendez-vous/${enc(id)}`, sans(data, ['id', 'createdAt', 'updatedAt', 'enregistrePar'])), ['rendezVous']),
    deleteRendezVous: (id) => run(() => api.del(`/rendez-vous/${enc(id)}`), ['rendezVous']),
    addNoteDirection: (data) => run(() => api.post('/notes-direction', data), ['notesDirection']),
    updateNoteDirection: (id, data) => run(() => api.put(`/notes-direction/${enc(id)}`, sans(data, ['id', 'createdAt', 'updatedAt'])), ['notesDirection']),
    deleteNoteDirection: (id) => run(() => api.del(`/notes-direction/${enc(id)}`), ['notesDirection']),

    updateParametres: (p) => {
      const body: Record<string, unknown> = sans(p, ['id', 'statutsAdherents', 'statutsDossiers', 'dernierNumeroMatricule', 'joursVerificationCycle', 'codeConfirmationDefini', 'createdAt', 'updatedAt', 'codeConfirmationSecurite']);
      if (p.codeConfirmationSecurite) body.codeConfirmationSecurite = p.codeConfirmationSecurite;
      return run(() => api.put('/parametres', body), ['parametres'], undefined, 'Paramètres enregistrés.');
    },
    addUtilisateur: (compte) => run(() => api.post('/utilisateurs', compte), ['utilisateurs'], (u) => ({ utilisateur: u }), `Compte ${compte.email} créé.`),
    updateUtilisateur: (id, data) =>
      run(() => api.put(`/utilisateurs/${enc(id)}`, sans(data, ['id', 'codePin', 'codeAcces', 'hasPin', 'dernierAcces', 'mustChangePassword', 'lockedUntil', 'createdAt', 'updatedAt', 'permissions'])), ['utilisateurs']),
    updateIdentifiants: (id, data) => run(() => api.put(`/utilisateurs/${enc(id)}/identifiants`, data), ['utilisateurs'], undefined, 'Informations de connexion mises à jour.'),
    deleteUtilisateur: (id) => run(() => api.del(`/utilisateurs/${enc(id)}`), ['utilisateurs']),
    nouveauParametrageUtilisateurs: (users) =>
      run(
        () =>
          api.put('/utilisateurs/bulk', {
            utilisateurs: users.map((u) => ({
              id: u.id, nom: u.nom, email: u.email, role: u.role, typeAcces: u.typeAcces, titreComplet: u.titreComplet,
              poste: u.poste, descriptionAcces: u.descriptionAcces, telephone: u.telephone, actif: u.actif,
            })),
          }),
        ['utilisateurs'],
        undefined,
        'Paramétrage des utilisateurs enregistré.'
      ),
    fetchActiviteUtilisateur: async (id, f = {}) => {
      const r = await request('GET', `/utilisateurs/${enc(id)}/activite`, { query: { page: f.page ?? 1, pageSize: f.pageSize ?? 100, du: f.du, au: f.au, typeOperation: f.typeOperation } });
      return { items: r.data, total: r.meta.total, statistiques: r.meta.statistiques };
    },
    fetchRapportAudit: async (id, f = {}) => (await request('GET', `/utilisateurs/${enc(id)}/rapport-audit`, { query: { du: f.du, au: f.au } })).data,
    clearJournal: () => run(() => api.del('/journal'), ['journal'], undefined, "Journal d'audit purgé (la purge reste tracée)."),
    resetToDemoData: () => run(() => api.post('/systeme/reset-demo'), [], undefined, 'Base réimportée depuis database_mysql : reconnectez-vous.'),
    wipeAllDataForUpdate: (password) =>
      run(async () => (await request('POST', '/systeme/mise-a-jour', { maintenanceCode: password })).data, [...(Object.keys(COLLECTIONS) as Key[]), 'parametres']),
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FBF5EC] text-[#3A2A1C]">
        <img src="/cositi-logo.jpg" alt="COSITI" className="w-28 h-28 object-cover scale-125 rounded-2xl" />
        {loadError ? (
          <>
            <p className="font-semibold text-rose-700">Chargement des données impossible : {loadError}</p>
            <button onClick={() => refreshAll()} className="px-4 py-2 rounded-xl bg-[#D97F2E] text-white font-bold">Réessayer</button>
          </>
        ) : (
          <p className="text-sm text-[#6B5440] animate-pulse">Chargement des données depuis la base COSITI…</p>
        )}
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp doit être utilisé dans AppProvider');
  return context;
};
