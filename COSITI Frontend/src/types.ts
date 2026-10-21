export type Sexe = 'M' | 'F';

export type StatutAdherent =
  | 'Actif'
  | 'En cours de régularisation'
  | 'En attente'
  | 'Inactif'
  | 'Suspendu'
  | 'Radié';

export type StatutImmatriculation =
  | 'Non immatriculé'
  | 'Éligible (seuil atteint)'
  | 'En cours d\'immatriculation'
  | 'Immatriculé';

export type StatutCotisation = 'À jour' | 'En retard' | 'Sans cotisation';

export type StatutDossierAllocations =
  | 'Dossier non commencé'
  | 'Dossier en cours'
  | 'Dossier incomplet'
  | 'Dossier complet'
  | 'Dossier transmis'
  | 'Dossier traité'
  | 'Sans enfant (Non éligible allocations)';

export type ModePaiement =
  | 'Espèces'
  | 'Wave'
  | 'Orange Money'
  | 'MTN MoMo'
  | 'Moov Money'
  | 'Virement bancaire'
  | 'Chèque';

export interface PieceDossier {
  id: string;
  nom: string;
  obligatoire: boolean;
  recu: boolean;
  dateReception?: string;
  fichierRef?: string;
  notes?: string;
}

export interface HistoriqueDossier {
  date: string;
  auteur: string;
  action: string;
}

export interface Adherent {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: Sexe;
  dateNaissance: string;
  lieuNaissance: string;
  cni: string;
  telephone: string;
  adresse: string;
  profession: string;
  dateAdhesion: string;
  statut: StatutAdherent;
  statutImmatriculation: StatutImmatriculation;
  dateImmatriculation?: string;
  numeroCnps?: string;
  observations?: string;
  tarifJournalier: number; // 700 ou 1000 FCFA
  gestionnaireId?: string; // ID du gestionnaire de portefeuille attribué
  gestionnaireNom?: string; // Nom du gestionnaire de portefeuille
  nombreEnfants?: number;
  sansEnfant?: boolean; // Travailleur sans enfant à charge (exonéré de dossier allocations)
  salaireCotisableCnps?: number; // Assiette mensuelle cotisable CNPS (60 000 FCFA par défaut pour les adhérents immatriculés)
  createdAt: string;
  updatedAt: string;
}

export interface GestionnairePortefeuille {
  id: string;
  code: string; // Ex: "GP-01", "GP-02"
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  zoneSecteur: string; // Ex: "Douala - Marché Sandaga", "Yaoundé - Mokolo", "Bafoussam"
  statut: 'Actif' | 'Inactif' | 'En congé';
  objectifsRecouvrementMensuel?: number; // FCFA
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TypeRegularisationCotisation =
  | 'Complément de montant antérieur'
  | 'Rattrapage arriérés (depuis Juillet)'
  | 'Rectification rétroactive de date/montant'
  | 'Régularisation exceptionnelle DAF/DGA';

export interface Cotisation {
  id: string;
  adherentId: string;
  matricule: string;
  adherentNomPrenom: string;
  datePaiement: string; // YYYY-MM-DD
  montant: number;
  modePaiement: ModePaiement;
  reference?: string;
  mois: string; // ex: "Mars" ou "2026-03"
  annee: number;
  agentEnregistreur: string;
  observations?: string;
  createdAt: string;
  // Champs de régularisation DAF & DGA
  estRegularisation?: boolean;
  typeRegularisation?: TypeRegularisationCotisation;
  motifRegularisation?: string;
  montantAnterieurInitial?: number;
  montantComplementaire?: number;
  regularisePar?: string; // Ex: "N'GUESSAN Koffi Bernard (DAF)" ou "DIABATÉ Mariam (DGA)"
  dateRegularisation?: string;
  datePaiementEffective?: string;
  periodeConcernee?: string;
}

export type BrancheCnps =
  | 'PRESTATIONS_FAMILIALES'
  | 'RISQUES_PROFESSIONNELS'
  | 'PVID';

export interface DossierAllocations {
  id: string;
  adherentId: string;
  matricule: string;
  adherentNomPrenom: string;
  numeroCnps: string;
  branche?: BrancheCnps;
  sousRubriqueOffre?: string;
  montantPrestation?: number;
  dateImmatriculation: string;
  statut: StatutDossierAllocations;
  pieces: PieceDossier[];
  nombreEnfants: number;
  sansEnfant?: boolean; // Travailleur sans enfant (prestations familiales non requises)
  certificatsScolariteFournis: boolean;
  dateDepot?: string;
  dateTransmission?: string;
  dateRelance?: string;
  dateDecision?: string;
  observations?: string;
  historique: HistoriqueDossier[];
  createdAt: string;
  updatedAt: string;
}

export type DossierCnps = DossierAllocations;

export type TypeAlerte =
  | 'NON_A_JOUR'
  | 'SEUIL_15000_ATTEINT'
  | 'VERIFICATION_15_30'
  | 'DOSSIER_ALLOCATIONS';

export interface Alerte {
  id: string;
  type: TypeAlerte;
  titre: string;
  message: string;
  adherentId: string;
  matricule: string;
  nomAdherent: string;
  adherentNom?: string;
  dateCreation?: string;
  actionRequise?: string;
  dateDeclenchement: string;
  niveau: 'info' | 'warning' | 'urgent';
  details: {
    dernierPaiement?: string;
    montantCumule?: number;
    montantRestant?: number;
    joursRetard?: number;
    statutImmatriculation?: string;
    piecesManquantes?: string[];
    dateSeuilAtteint?: string;
    isCycle15or30?: boolean;
    peutEtreSansEnfant?: boolean;
    nombreEnfants?: number;
    sansEnfant?: boolean;
  };
  vueOuIgnoree?: boolean;
}

export type TypeAcces =
  | 'Super administration'
  | 'Consultation'
  | 'Administrateur et consultation'
  | 'Administrateur et enregistrement'
  | 'Administrateur, enregistrement et consultation'
  | 'Enregistrement';

export type RoleUtilisateur =
  | 'Super Administrateur'
  | 'PCA'
  | 'DG'
  | 'DGA'
  | 'Conseil de Surveillance'
  | 'DAF'
  | 'Caissière & Agent d\'enregistrement'
  | 'Administrateur'
  | 'Agent d\'enregistrement'
  | 'Agent de consultation';

export interface Utilisateur {
  id: string;
  nom: string;
  email: string;
  role: RoleUtilisateur;
  typeAcces: TypeAcces;
  titreComplet?: string;
  poste?: string;
  descriptionAcces?: string;
  actif: boolean;
  telephone?: string;
  /** @deprecated les codes sont hachés côté serveur et ne sont jamais renvoyés */
  codePin?: string;
  /** @deprecated les codes sont hachés côté serveur et ne sont jamais renvoyés */
  dernierAcces?: string;
  /** renvoyés par l'API */
  mustChangePassword?: boolean;
  lockedUntil?: string;
  createdAt?: string;
  updatedAt?: string;
  /** droits effectifs calculés par le serveur (session) */
  permissions?: Record<string, unknown>;
}

export interface JournalOperation {
  id: string;
  date: string;
  dateHeure?: string;
  utilisateur: string;
  role: string;
  agentEnregistreur?: string;
  action?: string;
  codeSecuriteValide?: boolean;
  matricule?: string;
  typeOperation?:
    | 'CREATION_ADHERENT'
    | 'MODIFICATION_ADHERENT'
    | 'MODIFICATION_STATUT_ADHERENT'
    | 'SUPPRESSION_ADHERENT'
    | 'ENREGISTREMENT_COTISATION'
    | 'MODIFICATION_COTISATION'
    | 'REGULARISATION_COTISATION'
    | 'SUPPRESSION_COTISATION'
    | 'IMMATRICULATION'
    | 'CREATION_DOSSIER'
    | 'MODIFICATION_DOSSIER'
    | 'MODIFICATION_PARAMETRES'
    | 'PURGE_OU_IMPORT_DONNEES'
    | 'MISE_A_JOUR_LOGICIEL'
    | 'CHANGEMENT_UTILISATEUR'
    | 'CREATION_UTILISATEUR'
    | 'MODIFICATION_UTILISATEUR'
    | 'SUPPRESSION_UTILISATEUR'
    | 'ENREGISTREMENT_DEPENSE'
    | 'MODIFICATION_DEPENSE'
    | 'SUPPRESSION_DEPENSE'
    | 'ENREGISTREMENT_VERSEMENT_BANCAIRE'
    | 'MODIFICATION_VERSEMENT_BANCAIRE'
    | 'SUPPRESSION_VERSEMENT_BANCAIRE'
    | 'ENREGISTREMENT_FRAIS_MOBILE_MONEY'
    | 'MODIFICATION_FRAIS_MOBILE_MONEY'
    | 'SUPPRESSION_FRAIS_MOBILE_MONEY'
    | 'GESTION_PAIE'
    | 'VALIDATION_PAIE_MOIS'
    | 'GENERATION_BULLETIN_PAIE'
    | 'MODIFICATION_BULLETIN_PAIE'
    | 'AJOUT_EMPLOYE'
    | 'MODIFICATION_EMPLOYE'
    | 'SUPPRESSION_EMPLOYE'
    | 'CREATION_PARTENAIRE'
    | 'MODIFICATION_PARTENAIRE'
    | 'SUPPRESSION_PARTENAIRE'
    | 'CREATION_RENDEZ_VOUS'
    | 'MODIFICATION_RENDEZ_VOUS'
    | 'SUPPRESSION_RENDEZ_VOUS'
    | 'CREATION_NOTE_DIRECTION'
    | 'MODIFICATION_NOTE_DIRECTION'
    | 'SUPPRESSION_NOTE_DIRECTION'
    | 'CREATION_GESTIONNAIRE'
    | 'MODIFICATION_GESTIONNAIRE'
    | 'SUPPRESSION_GESTIONNAIRE'
    | 'AFFECTATION_PORTEFEUILLE'
    | 'CREATION_RAPPORT_REUNION'
    | 'MODIFICATION_RAPPORT_REUNION'
    | 'SUPPRESSION_RAPPORT_REUNION'
    | 'ENREGISTREMENT_RAPPORT_AGENT'
    | 'MODIFICATION_RAPPORT_AGENT'
    | 'SUPPRESSION_RAPPORT_AGENT'
    | 'VALIDATION_RAPPORT_AGENT_DAF'
    | 'DECLARATION_TRAVAILLEUR_SANS_ENFANT'
    | 'GENERATION_PAIE_ADHERENTS_CNPS'
    | 'AJUSTEMENT_COTISABLE_ADHERENT'
    | 'AJOUT_BANQUE'
    | 'SUPPRESSION_BANQUE'
    // types ajoutés par le serveur (connexions, identifiants, audit, actions navigateur...)
    | (string & {});
  utilisateurId?: string;
  entite: string;
  adherentMatricule?: string;
  adherentNom?: string;
  description?: string;
  details?: string;
  anciennesInformations?: string;
  nouvellesInformations?: string;
}

export interface ParametresApp {
  nomOrganisation: string;
  sigle: string;
  slogan: string;
  adresse: string;
  telephone: string;
  email: string;
  seuilImmatriculation: number; // 15000 FCFA
  montantsCotisationDefauts: number[]; // [700, 1000]
  joursVerification: number[]; // [15, 30]
  joursVerificationCycle?: number[]; // [15, 30] pour compatibilité
  seuilJoursRetardAlerte: number; // ex: 10 jours
  codeConfirmationSecurite: string; // "0000"
  statutsAdherents: StatutAdherent[];
  statutsDossiers: StatutDossierAllocations[];
  dernierNumeroMatricule: number; // ex: 14 -> next is 15
}

// ==========================================
// MODULE DAF : FINANCES, DÉPENSES & TRÉSORERIE
// ==========================================

export type CategorieDepense =
  | 'Cotisations CNPS & Sécurité Sociale'
  | 'Loyer & Charges locatives'
  | 'Fournitures de bureau & Imprimés'
  | 'Carburant & Déplacements'
  | 'Primes & Salaires personnel'
  | 'Communication, Internet & Téléphonie'
  | 'Entretien, Réparations & Équipements'
  | 'Frais bancaires & Tenue de compte'
  | 'Restauration & Réceptions'
  | 'Autre dépense d\'exploitation';

export const CATEGORIES_DEPENSES: CategorieDepense[] = [
  'Cotisations CNPS & Sécurité Sociale',
  'Fournitures de bureau & Imprimés',
  'Loyer & Charges locatives',
  'Carburant & Déplacements',
  'Primes & Salaires personnel',
  'Communication, Internet & Téléphonie',
  'Entretien, Réparations & Équipements',
  'Frais bancaires & Tenue de compte',
  'Restauration & Réceptions',
  'Autre dépense d\'exploitation',
];

export const BANQUES_PARTENAIRES: string[] = [
  'BICICI',
  'Ecobank Côte d\'Ivoire',
  'SGCI (Société Générale)',
  'BOA CI (Bank of Africa)',
  'NSIA Banque',
  'BNI (Banque Nationale d\'Investissement)',
  'Coris Bank',
  'Autre institution bancaire',
];

export const OPERATEURS_MOBILE: OperateurMobile[] = [
  'Orange Money',
  'MTN MoMo',
  'Moov Money',
  'Wave',
];

export interface DepenseCourante {
  id: string;
  date: string; // YYYY-MM-DD
  categorie: CategorieDepense;
  motif: string;
  montant: number; // en FCFA
  modePaiement: 'Espèces / Caisse' | 'Virement bancaire' | 'Chèque' | 'Orange Money' | 'Wave' | 'MTN MoMo' | 'Moov Money';
  beneficiaire: string;
  numeroPiece: string; // Facture, Reçu, Bon de caisse
  statut: 'Payé' | 'En attente';
  enregistrePar: string;
  observations?: string;
  createdAt: string;
  // Origine de provenance des fonds :
  // 1. Exploitation : Uniquement les montants relatifs aux cotisations CNPS
  // 2. Apport personnel du PCA : Tout le reste des dépenses
  origineFonds?: 'Exploitation (Cotisations CNPS)' | 'Apport personnel du PCA';
}

export interface VersementBancaire {
  id: string;
  date: string; // YYYY-MM-DD
  banque: string; // ex: 'Ecobank Côte d\'Ivoire', 'BOA CI', etc.
  numeroCompte?: string;
  numeroBordereau: string;
  montant: number; // en FCFA
  sourceFonds: 'Recettes Cotisations Adhérents' | 'Retraits Mobile Money' | 'Fonds propres / Apport' | 'Autre';
  deposant: string;
  enregistrePar: string;
  statut: 'Validé' | 'En attente de relevé';
  observations?: string;
  /** repères du suivi chronologique, calculés par le serveur (GET /versements) */
  reperes?: { precedent: import('./api/models').PointArret; actuel: import('./api/models').PointArret };
  createdAt: string;

  // --- Suivi chronologique & Point d'arrêt des cotisations ---
  // Repère du versement précédent (où s'est arrêté le versement précédent)
  arretPrecedentDate?: string;          // Date d'arrêt de la cotisation du versement précédent
  arretPrecedentNom?: string;           // Nom de l'adhérent où s'est arrêté le versement précédent
  arretPrecedentMatricule?: string;     // Matricule de l'adhérent précédent
  arretPrecedentMontant?: number;       // Montant de la cotisation du point d'arrêt précédent (FCFA)
  arretPrecedentBordereau?: string;     // N° bordereau du versement précédent
  arretPrecedentCotisationId?: string;  // ID de la cotisation repère précédente

  // Point d'arrêt de ce versement (dernière cotisation incluse dans ce versement)
  arretCotisationDate?: string;         // Date de la dernière cotisation incluse
  arretCotisationNom?: string;          // Nom de l'adhérent où s'arrête ce versement
  arretCotisationMatricule?: string;    // Matricule de l'adhérent
  arretCotisationMontant?: number;      // Montant de cette dernière cotisation
  arretCotisationId?: string;           // ID de cette cotisation d'arrêt
  arretCotisationRef?: string;          // N° de reçu / référence de la cotisation d'arrêt

  // Tranche de cotisations couverte par ce versement
  nbCotisationsIncluses?: number;       // Nombre de cotisations couvertes
  cumulCotisationsIncluses?: number;    // Total en FCFA des cotisations de la tranche
}

export type OperateurMobile = 'Orange Money' | 'MTN MoMo' | 'Moov Money' | 'Wave';

export type TypeFraisMobileMoney =
  | 'Frais de retrait marchand'
  | 'Commission prélevée sur encaissement'
  | 'Frais de transfert opérateur'
  | 'Frais de compte pro';

export interface FraisMobileMoney {
  id: string;
  date: string; // YYYY-MM-DD
  operateur: OperateurMobile;
  typeFrais: TypeFraisMobileMoney;
  montantTransaction: number; // Montant brut collecté ou retiré
  fraisPreleves: number; // Montant des frais prélevés par l'opérateur en FCFA
  montantNet: number; // montantTransaction - fraisPreleves
  referenceTransaction: string; // N° SMS / Réf transaction opérateur
  cotisationIdLiee?: string;
  adherentConcerne?: string;
  enregistrePar: string;
  observations?: string;
  createdAt: string;
}

// ==========================================
// MODULE DIRECTION (DG & DGA) : AGENDA, PARTENAIRES & NOTES
// ==========================================

export type SecteurPartenaire =
  | 'Institution publique / Ministère'
  | 'Caisse Sociale (CNPS)'
  | 'Banque & Microfinance'
  | 'Opérateur Télécom & Mobile Money'
  | 'Organisation Professionnelle / Syndicat'
  | 'Filière Agricole & Coopérative'
  | 'Bailleur de fonds / ONG'
  | 'Partenaire Technique & Logistique'
  | 'Autre';

export const SECTEURS_PARTENAIRES: SecteurPartenaire[] = [
  'Organisation Professionnelle / Syndicat',
  'Institution publique / Ministère',
  'Caisse Sociale (CNPS)',
  'Banque & Microfinance',
  'Opérateur Télécom & Mobile Money',
  'Filière Agricole & Coopérative',
  'Bailleur de fonds / ONG',
  'Partenaire Technique & Logistique',
  'Autre',
];

export type StatutPartenariat =
  | 'Prospection préliminaire'
  | 'Premier contact établi'
  | 'Négociations en cours'
  | 'Accord de principe'
  | 'Convention signée / Actif'
  | 'En veille / Suspendu';

export const STATUTS_PARTENARIAT: StatutPartenariat[] = [
  'Prospection préliminaire',
  'Premier contact établi',
  'Négociations en cours',
  'Accord de principe',
  'Convention signée / Actif',
  'En veille / Suspendu',
];

export type DegrePriorite = 'Stratégique (P1)' | 'Prioritaire (P2)' | 'Standard (P3)';

export interface PartenaireDirection {
  id: string;
  nomOrganisation: string;
  sigle?: string;
  secteur: SecteurPartenaire;
  personneContact: string;
  titreContact: string;
  telephone: string;
  email?: string;
  adresse?: string;
  statut: StatutPartenariat;
  priorite: DegrePriorite;
  potentielSynergie: string; // Objectifs attendus / projets communs
  datePremierContact?: string;
  enregistrePar: string;
  notesHistorique?: string;
  createdAt: string;
  updatedAt: string;
}

export type StatutRendezVous = 'Prévu' | 'Confirmé' | 'Tenu' | 'Reporté' | 'Annulé';

export const STATUTS_RENDEZ_VOUS: StatutRendezVous[] = [
  'Prévu',
  'Confirmé',
  'Tenu',
  'Reporté',
  'Annulé',
];

export type ModaliteRdv =
  | 'Siège COSITI'
  | 'Bureaux du partenaire'
  | 'Visioconférence'
  | 'Appel téléphonique'
  | 'Sur le terrain';

export interface RendezVousDirection {
  id: string;
  titre: string; // Objet du rendez-vous
  partenaireId?: string;
  nomInterlocuteurOuPartenaire: string;
  date: string; // YYYY-MM-DD
  heure: string; // HH:MM
  dureeEstimee?: string; // ex: '1h00', '45 min'
  modalite: ModaliteRdv;
  lieuPrecision?: string; // Adresse ou lien visio
  participantsDirection: string; // ex: 'DG (M. KONÉ)', 'DGA (Mme DIABATÉ)', 'DG & DGA', etc.
  responsablePrincipal: 'DG' | 'DGA' | 'DAF';
  statut: StatutRendezVous;
  ordreDuJour: string;
  compteRendu?: string; // Notes après réunion
  engagementsEtActions?: string; // Qui fait quoi, prochaines étapes
  dateRappel?: string;
  enregistrePar: string;
  createdAt: string;
  updatedAt: string;
}

export type CategorieNoteDirection =
  | 'Stratégie & Partenariats'
  | 'Négociation & Accords'
  | 'Gouvernance & Décisions'
  | 'Vigilance Financière & DAF'
  | 'Réglementation & CNPS'
  | 'Mémorandum interne Direction';

export const CATEGORIES_NOTES_DIRECTION: CategorieNoteDirection[] = [
  'Stratégie & Partenariats',
  'Négociation & Accords',
  'Gouvernance & Décisions',
  'Vigilance Financière & DAF',
  'Réglementation & CNPS',
  'Mémorandum interne Direction',
];

export interface NoteSpecifiqueDirection {
  id: string;
  titre: string;
  date: string; // YYYY-MM-DD
  categorie: CategorieNoteDirection;
  partenaireLie?: string;
  rendezVousLie?: string;
  contenu: string;
  pointsCles: string[]; // Points essentiels à retenir
  prochaineEcheance?: string;
  niveauConfidentialite: 'Confidentiel Direction (DG / DGA)' | 'Direction Élargie';
  auteur: string; // Nom ou rôle de l'auteur
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// MODULE RAPPORTS DE RÉUNION & PROCÈS-VERBAUX
// ==========================================

export type TypeReunion =
  | 'Conseil d\'Administration'
  | 'Comité de Direction (DG / DGA / DAF)'
  | 'Réunion de Coordination des Gestionnaires'
  | 'Assemblée Générale Ordinaire / Extraordinaire'
  | 'Comité de Suivi & Audit'
  | 'Comité de Trésorerie & Recouvrement'
  | 'Autre Réunion';

export const TYPES_REUNIONS: TypeReunion[] = [
  'Conseil d\'Administration',
  'Comité de Direction (DG / DGA / DAF)',
  'Réunion de Coordination des Gestionnaires',
  'Assemblée Générale Ordinaire / Extraordinaire',
  'Comité de Suivi & Audit',
  'Comité de Trésorerie & Recouvrement',
  'Autre Réunion',
];

export interface DecisionReunion {
  id: string;
  description: string;
  responsable: string;
  echeance: string; // YYYY-MM-DD
  statut: 'À faire' | 'En cours' | 'Réalisé';
}

export interface RapportReunion {
  id: string;
  titre: string;
  typeReunion: TypeReunion;
  date: string; // YYYY-MM-DD
  heureDebut: string; // HH:mm
  heureFin?: string; // HH:mm
  lieu: string;
  presidentSeance: string;
  secretaireSeance: string;
  participantsPresents: string; // Liste textuelle ou avec virgules
  participantsAbsents?: string;
  ordreDuJour: string; // Ordre du jour textuel
  syntheseDiscussions: string; // Compte-rendu détaillé des échanges
  decisions: DecisionReunion[];
  prochaineReunionDate?: string;
  statut: 'Brouillon' | 'Validé & Signé' | 'Diffusé';
  redigePar: string;
  piecesJointesOuNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// MODULE RAPPORTS DES AGENTS DE TERRAIN (SAISIE CAISSIÈRE)
// ==========================================

export type TypeMissionAgent =
  | 'Tournée de collecte journalière'
  | 'Campagne de relance des impayés'
  | 'Prospection & Nouvelles adhésions'
  | 'Recouvrement spécial'
  | 'Vérification & Enquête de terrain';

export const TYPES_MISSIONS_AGENTS: TypeMissionAgent[] = [
  'Tournée de collecte journalière',
  'Campagne de relance des impayés',
  'Prospection & Nouvelles adhésions',
  'Recouvrement spécial',
  'Vérification & Enquête de terrain',
];

export type ConformiteCaisse =
  | 'Conforme (Fonds reçus complets)'
  | 'Écart constaté (À justifier)'
  | 'En attente de vérification DAF';

export interface RapportAgentTerrain {
  id: string;
  dateRapport: string; // YYYY-MM-DD
  gestionnaireId?: string;
  agentNom: string;
  agentTelephone?: string;
  zoneSecteur: string;
  typeMission: TypeMissionAgent | string;
  adherentsVisites: number;
  adherentsCotisants: number;
  nouvellesAdhesions: number;
  montantEspecesRemis: number; // Somme liquide remise en caisse
  montantMobileMoneyDeclare: number; // Somme perçue via Wave / OM / MoMo
  montantTotalCollecte: number; // Especes + Mobile Money
  totalCollecte?: number; // Alias pour montantTotalCollecte
  conformiteCaisse: ConformiteCaisse | 'Conforme (Fonds complets)' | 'Écart constaté (À justifier)';
  ecartMontant?: number; // Montant de l'écart éventuel
  justificationEcart?: string;
  explicationEcart?: string; // Alias pour justificationEcart
  difficultesRencontrees?: string;
  difficultesTerrain?: string; // Alias
  actionsDemain?: string;
  actionsPrioritaires?: string; // Alias
  observations?: string;
  commentairesCaissiere?: string; // Observations de la caissière principale
  saisiPar: string; // Nom de la caissière principale
  dateHeureSaisie?: string;
  statutValidation: 'Enregistré par Caissière' | 'Enregistré en caisse' | 'Vérifié DAF' | 'Validé Direction';
  visaDaf?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// MODULE PAIE & SALAIRES (ESPACE DAF)
// Conforme au Code du Travail, CNPS, CMU et CGI (Côte d'Ivoire)
// ==========================================

export type TrancheSalarialeLoi =
  | 'MOINS_DE_60K' // Moins de 60 000 FCFA : Exonération fiscale totale de plein droit (0% ITS)
  | 'EGAL_60K'     // Égal à 60 000 FCFA : Seuil charnière / franchise fiscale (0% ITS), charges sociales de base
  | 'PLUS_DE_60K';  // Plus de 60 000 FCFA : Barème progressif ITS et cotisations sociales complètes

export type DepartementEmploye =
  | 'Finances & Comptabilité'
  | 'Caisse & Enregistrement'
  | 'Opérations & Recouvrement'
  | 'Direction Générale'
  | 'Logistique & Services Généraux'
  | 'Autre';

export type TypeContratEmploye = 'CDI' | 'CDD' | 'Stage' | 'Prestation / Temporaire';

export interface Employe {
  /** tranche légale calculée par le serveur à la lecture */
  trancheLoi?: { tranche: TrancheSalarialeLoi; libelle: string; explication: string };
  id: string;
  matricule: string; // Ex: 'EMP-001'
  nom: string;
  prenom: string;
  sexe: Sexe;
  poste: string;
  departement: DepartementEmploye;
  typeContrat: TypeContratEmploye;
  dateEmbauche: string; // YYYY-MM-DD
  numeroCnps?: string;
  numeroCmu?: string;
  salaireBase: number; // Salaire de base contractuel en FCFA
  sursalaire?: number; // Sursalaire conventionnel
  indemniteTransport: number; // Forfait transport (exonéré jusqu'à 30 000 FCFA par la loi)
  indemniteLogement?: number;
  primesFixes?: number; // Prime de responsabilité, caisse, etc.
  nombrePartsFiscales: number; // Parts IGR (ex: 1 = célibataire, 1.5 = marié sans enfant, etc.)
  modePaiement: ModePaiement | 'Virement bancaire' | 'Chèque' | 'Espèces' | 'Wave' | 'Orange Money';
  banqueNom?: string;
  numeroCompteBancaire?: string;
  telephone: string;
  email?: string;
  actif: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type StatutBulletinPaie = 'Brouillon' | 'Validé DAF' | 'Payé';

export interface BulletinPaie {
  /** calculés par le serveur à la lecture : part patronale CNPS (PVID + PF + AT/MP) et total à verser à la CNPS */
  totalCnpsPatronale?: number;
  totalCotisationsCnps?: number;
  id: string;
  bulletinNumero: string; // Ex: 'BP-2026-03-001'
  employeId: string;
  mois: string; // YYYY-MM (ex: '2026-03')
  periodeLibelle: string; // Ex: 'Mars 2026'
  dateEdition: string; // YYYY-MM-DD
  datePaiement?: string;
  statut: StatutBulletinPaie;

  // Snapshot informations employé à la date d'émission
  employeNomComplet: string;
  employeMatricule: string;
  employePoste: string;
  employeDepartement: string;
  employeDateEmbauche: string;
  employeNumeroCnps?: string;
  employeNumeroCmu?: string;
  employePartsFiscales: number;
  modePaiement: string;
  banqueVirement?: string;
  compteVirement?: string;

  // Tranche légale déterminée automatiquement
  trancheLoi: TrancheSalarialeLoi;
  trancheLibelle: string;
  explicationLegale: string;

  // Temps de travail
  heuresTravaillees: number; // Standard 173.33 h/mois
  joursTravailles: number; // 30 jours conventionnels

  // 1. GAINS & ÉLÉMENTS DU SALAIRE BRUT
  salaireBase: number;
  sursalaire: number;
  primeAnciennete: number;
  primeRendement: number;
  indemniteTransport: number; // Dont max 30 000 exonéré
  indemniteLogement: number;
  autresPrimes: number;
  totalGainsBruts: number;
  salaireBrutImposable: number; // Total gains bruts - part transport exonérée

  // 2. RETENUES SOCIALES SALARIALES (Régime Camerounais - CNPS Cameroun)
  cnpsPvidSalariale: number; // 4.20% (Pensions Vieillesse, Invalidité, Décès plafonné à 750 000 FCFA)
  cnpsRetraiteSalariale: number; // Alias de compatibilité (4.20%)
  cmuSalariale: number; // 0 FCFA (spécifique CI, maintenu pour compatibilité)
  totalRetenuesSocialesSalariales: number;

  // 3. RETENUES FISCALES & PARAFISCALES SALARIALES (CGI Cameroun & DGI)
  // Règle loi : Moins de 60 000 = 0 FCFA | Égal 60 000 = Franchise IRPP 0 F | Plus de 60 000 = Barème progressif IRPP
  irppSalariale: number; // IRPP Traitements et Salaires (avec abattement frais pro 30% et 500k/an)
  cacSalariale: number; // Centimes Additionnels Communaux (10% de l'IRPP)
  cfcSalariale: number; // Crédit Foncier du Cameroun Salarial (1.00%)
  tdlSalariale: number; // Taxe de Développement Local Cameroun (tranche barème)
  ravSalariale: number; // Redevance Audio-Visuelle CRTV
  itsSalariale: number; // Alias de compatibilité (IRPP)
  cnSalariale: number;  // Alias de compatibilité (CAC)
  igrSalariale: number; // Alias de compatibilité
  totalRetenuesFiscalesSalariales: number;

  // 4. AUTRES RETENUES / DÉDUCTIONS
  acomptesAvances: number;
  retenuesDiverses: number; // Prêts, cotisations associatives, etc.
  totalAutresRetenues: number;

  // 5. TOTAUX & NET À PAYER
  totalRetenuesSalariales: number;
  netImposable: number;
  netAPayer: number;
  netAPayerEnLettres: string;

  // 6. CHARGES PATRONALES (Part Employeur - Régime Camerounais)
  cnpsPvidPatronale: number; // 4.20% (Pensions plafonné à 750 000 FCFA)
  cnpsRetraitePatronale: number; // Alias (4.20%)
  cnpsPfPatronale: number; // 7.00% (Prestations Familiales plafonné à 750 000 FCFA)
  cnpsPrestationsFamiliales: number; // Alias (7.00%)
  cnpsAtmpPatronale: number; // 1.75% (Accidents du Travail Groupe A)
  cnpsAccidentTravail: number; // Alias (1.75%)
  fnePatronale: number; // 1.00% Fonds National de l'Emploi
  cfcPatronale: number; // 1.50% Crédit Foncier du Cameroun
  cmuPatronale: number; // 0 FCFA (compatibilité)
  fdfpPatronale: number; // Alias (FNE + CFC patronal)
  totalChargesPatronales: number;
  coutTotalEmployeur: number; // totalGainsBruts + totalChargesPatronales

  // 7. RATTACHEMENT BÉNÉFICIAIRE (Personnel ou Adhérent CNPS)
  typeBeneficiaire?: 'EMPLOYE' | 'ADHERENT_CNPS';
  adherentId?: string;
  adherentMatricule?: string;
  adherentNumeroCnps?: string;
  sansEnfant?: boolean;

  // 8. VISAS & AUDIT
  validePar?: string;
  dateValidation?: string;
  notesCommentaires?: string;
  depenseAssocieeId?: string; // Si transféré dans le journal des dépenses DAF
  createdAt: string;
  updatedAt: string;
}



