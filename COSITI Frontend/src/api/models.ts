/**
 * Modèles de données CALCULÉS PAR LE SERVEUR (Backend/src/services). Le front ne recalcule rien : il affiche.
 */
import type { Cotisation, DepenseCourante, VersementBancaire, Adherent } from '../types';

/** Statistiques de cotisation d'un adhérent (GET /adherents?stats=true) */
export interface AdherentStats {
  totalCumule: number;
  totalCeMois: number;
  totalCetteAnnee: number;
  totalAujourdhui: number;
  dernierPaiement?: Cotisation;
  nombreVersements: number;
  nombreJoursCotises: number;
  statutCotisation: 'À jour' | 'En retard' | 'Sans cotisation';
  joursRetard: number;
  montantRetard: number;
  joursCotisesCeMois: number;
  retardMoisEngage: number;
  jourMoisEngage: number;
  seuilAtteint: boolean;
  montantRestantPourSeuil: number;
  pourcentageSeuil: number;
}

/** Valeurs neutres affichées le temps que le serveur réponde */
export const STATS_VIDES: AdherentStats = {
  totalCumule: 0, totalCeMois: 0, totalCetteAnnee: 0, totalAujourdhui: 0, nombreVersements: 0, nombreJoursCotises: 0,
  statutCotisation: 'Sans cotisation', joursRetard: 0, montantRetard: 0, joursCotisesCeMois: 0, retardMoisEngage: 0,
  jourMoisEngage: 0, seuilAtteint: false, montantRestantPourSeuil: 0, pourcentageSeuil: 0,
};

export type AdherentAvecStats = Adherent & { stats?: AdherentStats };

/** GET /dashboard */
export interface DashboardData {
  date: string;
  adherents: {
    total: number; actifs: number; immatricules: number; nonImmatricules: number; aJour: number; nonAJour: number;
    seuilAtteint: number; aImmatriculer: number; nouveauxCeMois: number; sansGestionnaire: number;
  };
  cotisations: { nombre: number; totalGlobal: number; aujourdHui: number; ceMois: number; cetteAnnee: number; dernieres: Cotisation[] };
  dossiers: { total: number; aConstituer: number };
  gestionnaires: { id: string; code: string; nom: string; statut: string; adherents: number; adherentsEnRetard: number; recouvreCeMois: number; objectifMensuel: number; tauxRealisation: number | null }[];
  alertes: { total: number; urgentes: number };
  finances?: Record<string, unknown>;
}

export interface PointArret {
  date?: string; nom?: string; matricule?: string; montant?: number; bordereau?: string; banque?: string;
  cotisationId?: string; reference?: string; estPremierVersement?: boolean;
}

/** GET /versements/suivi/en-attente */
export interface SuiviVersements {
  dernierVersement: { id: string; date: string; banque: string; numeroBordereau: string } | null;
  reperePrecedent: PointArret;
  nombre: number;
  totalMontant: number;
  cotisations: Cotisation[];
}

export interface ReserveAdherent {
  id: string; matricule: string; nomComplet: string; telephone: string; statutCnps: string; numeroCnps: string;
  cotisationsPercues: number; totalCumuleGlobal?: number; montantReserve: number; affectation: string;
}

export type DepenseFlux = Pick<DepenseCourante, 'id' | 'date' | 'numeroPiece' | 'motif' | 'montant' | 'beneficiaire' | 'modePaiement' | 'categorie'> & { origineFonds: string };

/** GET /rapports/rapprochement */
export interface Rapprochement {
  periode: { mode: 'GLOBAL' | 'MOIS'; mois: string | null; annee: number | null; banque: string | null; base: string };
  fondsBanque: { total: number; nombre: number; versements: VersementBancaire[] };
  reserveCnps: { total: number; nombreAdherents: number; adherents: ReserveAdherent[] };
  soldeReelBanque: number;
  tauxCouverture: number;
  flux: {
    encaissements: { total: number; nombre: number };
    decaissementsExploitation: { total: number; nombre: number; depenses: DepenseFlux[] };
    decaissementsApportPca: { total: number; nombre: number; depenses: DepenseFlux[] };
    totalDecaissements: number;
    soldeNet: number;
  };
}

export interface LigneNominative {
  adherent: Pick<Adherent, 'id' | 'matricule' | 'nom' | 'prenom' | 'telephone' | 'tarifJournalier' | 'statutImmatriculation' | 'numeroCnps'>;
  montantMois: number; nbJoursMois: number; nbVersementsMois: number; cumulTotal: number;
  seuil15000Atteint: boolean; aCotiseCeMois: boolean; estImmatricule: boolean; gestionnaireNom: string;
}

/** GET /rapports/etat-mensuel */
export interface EtatMensuel {
  periode: { mois: string; annee: number; prefixe: string | null };
  cotisations: { liste: Cotisation[]; total: number; nombre: number };
  statsParMode: { mode: string; montant: number; pourcentage: string }[];
  statsParAgent: { agent: string; montant: number; count: number; pourcentage: string }[];
  nominatif: LigneNominative[];
  comptes: { tous: number; cotisants: number; nonCotisants: number; dejaImmatricules: number; tauxParticipation: number };
  franchissements: string[];
  finances: null | {
    depenses: { liste: DepenseCourante[]; total: number; nombre: number };
    versements: { liste: VersementBancaire[]; total: number; nombre: number };
    soldeNet: number;
    rapprochement: Rapprochement;
  };
}

/** GET /finances/synthese */
export interface FinanceSynthese {
  genereLe: string;
  global: {
    cotisations: { nombre: number; total: number; mobileMoney: number; especes: number; parMode: Record<string, number> };
    depenses: {
      nombre: number; total: number; payees: number; enAttente: number;
      exploitationCnps: { nombre: number; total: number }; apportPca: { nombre: number; total: number };
      parCategorie: Record<string, number>;
    };
    versements: { nombre: number; total: number; parBanque: Record<string, number> };
    fraisMobileMoney: { nombre: number; totalFrais: number; totalTransactions: number; totalNet: number; parOperateur: Record<string, number> };
    reserveCnps: { totalReserve: number; totalVersementsBanque: number; soldeReelBanque: number; tauxCouverture: number };
  };
  paie: { masseSalarialeNetteValidee: number; masseSalarialeNetteBrouillon: number; chargesPatronalesValidees: number };
  suiviVersements: { cotisationsEnAttente: { nombre: number; total: number } };
  reservesAdherents?: ReserveAdherent[];
}

/** Réponse d'un import Excel */
export interface RapportImport {
  mode: 'simulation' | 'import';
  applique: boolean;
  ok: boolean;
  feuillesInconnues: string[];
  totaux: { lignes: number; crees: number; misAJour: number; inchanges: number; doublons: number; erreurs: number };
  feuilles: {
    id: string; feuille: string; lignes: number; crees: number; misAJour: number; inchanges: number; doublons: number;
    erreurs: { ligne: number | null; message: string }[]; avertissements: string[];
  }[];
}

export interface CatalogueFeuille {
  id: string; feuille: string; exportable: boolean; importable: boolean; exportSeul: boolean; cle: string | null;
  colonnes: { en_tete: string; obligatoire: boolean; calculee: boolean }[];
}

/** GET /paie/recap */
export interface RecapPaie {
  mois: string;
  personnel: { nombre: number; totalNetAPayer: number };
  adherentsCnps: { nombre: number; totalNetAPayer: number };
  total: { nombre: number; totalGainsBruts: number; totalNetAPayer: number; totalChargesPatronales: number; coutTotalEmployeur: number; valides: number };
  statsMois: {
    totalBrut: number; totalNet: number; totalSocialSalarial: number; totalFiscalSalarial: number; totalPatronal: number; totalCoutEmployeur: number;
    nbMoins60k: number; nbEgal60k: number; nbPlus60k: number; count: number; isAllValide: boolean;
  };
  declarations: {
    cnps: { masseSoumise: number; pvidSalariale: number; pvidPatronale: number; prestationsFamiliales: number; accidentsTravail: number; total: number };
    fiscal: { nombreBulletins: number; exoneres: number; assujettis: number; irpp: number; cac: number; cfc: number; tdl: number; fne: number; total: number };
  };
}

/** GET /paie/adherents-cnps */
export interface AdherentsCnpsDuMois {
  mois: string;
  lignes: {
    adherent: { id: string; matricule: string; nom: string; prenom: string; numeroCnps?: string; profession?: string; telephone?: string; sansEnfant: boolean; nombreEnfants: number; salaireCotisableCnps: number };
    bulletin: import('../types').BulletinPaie;
    genere: boolean;
  }[];
  totaux: {
    count: number; masseCotisableTotal: number; totalCnpsSalariale: number; totalCfcSalarial: number; totalTdl: number;
    totalNet: number; totalPatronal: number; totalDeclareCnps: number; bulletinsGeneresCount: number;
  };
}
