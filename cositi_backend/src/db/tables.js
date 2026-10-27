import { frDateTime } from '../utils/ids.js';
import { determinerTrancheLoi } from '../utils/paie.js';
import { addMoney } from '../utils/money.js';

/**
 * Correspondance document (camelCase, types du front) <-> table MySQL (snake_case, dump database_mysql/).
 *
 * fields   : champ -> type   s=texte  i=entier  n=décimal  b=booléen  d=date  t=datetime(UTC)  j=JSON  jt=JSON stocké en VARCHAR
 * columns  : surcharges de nom de colonne (par défaut : snake_case du champ)
 * overflow : colonne JSON qui reçoit tous les champs non mappés (relue et refusionnée à la lecture)
 * ignore   : champs dérivés, jamais stockés
 * computed : champs recalculés à la lecture
 * intId    : clé primaire entière auto-incrémentée (l'API expose l'id sous forme de chaîne)
 */
export const TABLES = {
  parametres: {
    table: 'parametres',
    intId: true,
    fixedIds: { main: 1 },
    fields: {
      id: 's', nomOrganisation: 's', sigle: 's', slogan: 's', adresse: 's', telephone: 's', email: 's',
      seuilImmatriculation: 'n', montantsCotisationDefauts: 'jt', joursVerification: 'jt',
      seuilJoursRetardAlerte: 'i', codeConfirmationHash: 's', dernierNumeroMatricule: 'i',
    },
    columns: { joursVerification: 'jours_verification_cycle' },
    ignore: ['joursVerificationCycle', 'statutsAdherents', 'statutsDossiers'],
  },
  utilisateurs: {
    table: 'utilisateurs',
    fields: {
      id: 's', nom: 's', email: 's', role: 's', typeAcces: 's', titreComplet: 's', poste: 's', descriptionAcces: 's',
      telephone: 's', actif: 'b', dernierAcces: 's', passwordHash: 's', mustChangePassword: 'b',
      failedAttempts: 'i', lockedUntil: 't', tokenVersion: 'i', createdAt: 't', updatedAt: 't',
    },
    ignore: ['codePin', 'codeAcces', 'hasPin', 'pinHash'],
  },
  gestionnaires: {
    table: 'gestionnaires_portefeuille',
    fields: {
      id: 's', code: 's', nom: 's', prenom: 's', telephone: 's', email: 's', zoneSecteur: 's', statut: 's',
      objectifsRecouvrementMensuel: 'n', notes: 's', createdAt: 't', updatedAt: 't',
    },
  },
  adherents: {
    table: 'adherents',
    fields: {
      id: 's', matricule: 's', nom: 's', prenom: 's', sexe: 's', dateNaissance: 'd', lieuNaissance: 's', cni: 's',
      telephone: 's', adresse: 's', profession: 's', dateAdhesion: 'd', statut: 's', statutImmatriculation: 's',
      dateImmatriculation: 'd', numeroCnps: 's', observations: 's', tarifJournalier: 'n', gestionnaireId: 's',
      gestionnaireNom: 's', nombreEnfants: 'i', sansEnfant: 'b', salaireCotisableCnps: 'n', createdAt: 't', updatedAt: 't',
    },
  },
  cotisations: {
    table: 'cotisations',
    fields: {
      id: 's', adherentId: 's', matricule: 's', adherentNomPrenom: 's', datePaiement: 'd', montant: 'n', modePaiement: 's',
      reference: 's', mois: 's', annee: 'i', agentEnregistreur: 's', observations: 's', estRegularisation: 'b',
      typeRegularisation: 's', motifRegularisation: 's', montantAnterieurInitial: 'n', montantComplementaire: 'n',
      regularisePar: 's', dateRegularisation: 't', datePaiementEffective: 'd', periodeConcernee: 's', createdAt: 't',
    },
  },
  dossiers: {
    table: 'dossiers_allocations',
    fields: {
      id: 's', adherentId: 's', matricule: 's', adherentNomPrenom: 's', numeroCnps: 's', branche: 's', sousRubriqueOffre: 's',
      montantPrestation: 'n', dateImmatriculation: 'd', statut: 's', nombreEnfants: 'i', sansEnfant: 'b',
      certificatsScolariteFournis: 'b', dateDepot: 'd', dateTransmission: 'd', dateRelance: 'd', dateDecision: 'd',
      pieces: 'j', historique: 'j', observations: 's', createdAt: 't', updatedAt: 't',
    },
    columns: { pieces: 'pieces_json', historique: 'historique_json' },
  },
  journal: {
    table: 'journal_operations',
    fields: {
      id: 's', dateHeure: 't', utilisateur: 's', role: 's', typeOperation: 's', entite: 's', matricule: 's', description: 's',
      details: 's', utilisateurId: 's', adherentNom: 's', agentEnregistreur: 's', action: 's', codeSecuriteValide: 'b',
      anciennesInformations: 's', nouvellesInformations: 's', dateAffichage: 's',
    },
    ignore: ['date', 'adherentMatricule'],
    computed: {
      date: (d) => (d.dateHeure ? frDateTime(new Date(d.dateHeure)) : undefined),
      adherentMatricule: (d) => d.matricule,
    },
  },
  depenses: {
    table: 'depenses_courantes',
    fields: {
      id: 's', date: 'd', categorie: 's', motif: 's', montant: 'n', modePaiement: 's', beneficiaire: 's', numeroPiece: 's',
      statut: 's', enregistrePar: 's', observations: 's', origineFonds: 's', createdAt: 't', updatedAt: 't',
    },
    columns: { date: 'date_depense' },
  },
  versements: {
    table: 'versements_bancaires',
    fields: {
      id: 's', date: 'd', banque: 's', numeroCompte: 's', numeroBordereau: 's', montant: 'n', sourceFonds: 's', deposant: 's',
      enregistrePar: 's', statut: 's', observations: 's', arretPrecedentDate: 'd', arretPrecedentNom: 's',
      arretPrecedentMatricule: 's', arretPrecedentMontant: 'n', arretPrecedentBordereau: 's', arretPrecedentCotisationId: 's',
      arretCotisationDate: 'd', arretCotisationNom: 's', arretCotisationMatricule: 's', arretCotisationMontant: 'n',
      arretCotisationId: 's', arretCotisationRef: 's', nbCotisationsIncluses: 'i', cumulCotisationsIncluses: 'n',
      createdAt: 't', updatedAt: 't',
    },
    columns: { date: 'date_versement' },
  },
  frais_mobile_money: {
    table: 'frais_mobile_money',
    fields: {
      id: 's', date: 'd', operateur: 's', typeFrais: 's', montantTransaction: 'n', fraisPreleves: 'n', montantNet: 'n',
      referenceTransaction: 's', cotisationIdLiee: 's', adherentConcerne: 's', enregistrePar: 's', observations: 's',
      createdAt: 't', updatedAt: 't',
    },
    columns: { date: 'date_frais' },
  },
  banques: {
    table: 'banques_partenaires',
    intId: true,
    fields: { id: 's', nom: 's', actif: 'b', createdAt: 't' },
    columns: { nom: 'nom_banque' },
  },
  employes: {
    table: 'employes',
    fields: {
      id: 's', matricule: 's', nom: 's', prenom: 's', poste: 's', departement: 's', salaireBase: 'n', actif: 'b', sexe: 's',
      typeContrat: 's', dateEmbauche: 'd', numeroCnps: 's', numeroCmu: 's', sursalaire: 'n', indemniteTransport: 'n',
      indemniteLogement: 'n', primesFixes: 'n', nombrePartsFiscales: 'n', modePaiement: 's', banqueNom: 's',
      numeroCompteBancaire: 's', telephone: 's', email: 's', notes: 's', createdAt: 't', updatedAt: 't',
    },
    // tranche légale (exonération / pivot / assujetti) calculée par le serveur à la lecture
    ignore: ['trancheLoi'],
    computed: { trancheLoi: (d) => determinerTrancheLoi(d.salaireBase ?? 0) },
  },
  bulletins_paie: {
    table: 'bulletins_paie',
    overflow: 'details_json',
    fields: {
      id: 's', bulletinNumero: 's', employeId: 's', mois: 's', periodeLibelle: 's', salaireBase: 'n', totalGainsBruts: 'n',
      netAPayer: 'n', statut: 's', employeMatricule: 's', employeNomComplet: 's', typeBeneficiaire: 's', dateEdition: 'd',
      datePaiement: 'd', validePar: 's', dateValidation: 't', depenseAssocieeId: 's', createdAt: 't', updatedAt: 't',
      employePoste: 's', employeDepartement: 's', employeDateEmbauche: 'd', employeNumeroCnps: 's', employeNumeroCmu: 's',
      employePartsFiscales: 'n', modePaiement: 's', banqueVirement: 's', compteVirement: 's', trancheLoi: 's',
      trancheLibelle: 's', explicationLegale: 's', heuresTravaillees: 'n', joursTravailles: 'i', sursalaire: 'n',
      primeAnciennete: 'n', primeRendement: 'n', indemniteTransport: 'n', indemniteLogement: 'n', autresPrimes: 'n',
      salaireBrutImposable: 'n', cnpsPvidSalariale: 'n', cmuSalariale: 'n', totalRetenuesSocialesSalariales: 'n',
      irppSalariale: 'n', cacSalariale: 'n', cfcSalariale: 'n', tdlSalariale: 'n', ravSalariale: 'n',
      totalRetenuesFiscalesSalariales: 'n', acomptesAvances: 'n', retenuesDiverses: 'n', totalAutresRetenues: 'n',
      totalRetenuesSalariales: 'n', netImposable: 'n', netAPayerEnLettres: 's', cnpsPvidPatronale: 'n',
      cnpsPfPatronale: 'n', cnpsAtmpPatronale: 'n', fnePatronale: 'n', cfcPatronale: 'n', totalChargesPatronales: 'n',
      coutTotalEmployeur: 'n', adherentId: 's', adherentMatricule: 's', adherentNumeroCnps: 's', sansEnfant: 'b',
      notesCommentaires: 's',
    },
    // totaux de déclaration calculés à la lecture : part patronale CNPS (PVID + PF + AT/MP) et total à verser à la CNPS
    ignore: ['totalCnpsPatronale', 'totalCotisationsCnps'],
    computed: {
      totalCnpsPatronale: (d) =>
        addMoney(d.cnpsPvidPatronale ?? d.cnpsRetraitePatronale ?? 0, d.cnpsPfPatronale ?? d.cnpsPrestationsFamiliales ?? 0, d.cnpsAtmpPatronale ?? d.cnpsAccidentTravail ?? 0),
      totalCotisationsCnps: (d) =>
        addMoney(d.cnpsPvidSalariale ?? d.cnpsRetraiteSalariale ?? 0, d.cnpsPvidPatronale ?? d.cnpsRetraitePatronale ?? 0, d.cnpsPfPatronale ?? d.cnpsPrestationsFamiliales ?? 0, d.cnpsAtmpPatronale ?? d.cnpsAccidentTravail ?? 0),
    },
  },
  partenaires: {
    table: 'partenaires_direction',
    fields: {
      id: 's', nomOrganisation: 's', sigle: 's', secteur: 's', personneContact: 's', titreContact: 's', telephone: 's',
      email: 's', adresse: 's', statut: 's', priorite: 's', potentielSynergie: 's', datePremierContact: 'd',
      enregistrePar: 's', notesHistorique: 's', createdAt: 't', updatedAt: 't',
    },
  },
  rendez_vous: {
    table: 'rendez_vous_direction',
    fields: {
      id: 's', titre: 's', partenaireId: 's', nomInterlocuteurOuPartenaire: 's', date: 'd', heure: 's', dureeEstimee: 's',
      modalite: 's', lieuPrecision: 's', participantsDirection: 's', responsablePrincipal: 's', statut: 's',
      ordreDuJour: 's', compteRendu: 's', engagementsEtActions: 's', dateRappel: 'd', enregistrePar: 's',
      createdAt: 't', updatedAt: 't',
    },
    columns: { date: 'date_rdv' },
  },
  notes_direction: {
    table: 'notes_specifiques_direction',
    fields: {
      id: 's', titre: 's', date: 'd', categorie: 's', partenaireLie: 's', rendezVousLie: 's', contenu: 's', pointsCles: 'j',
      prochaineEcheance: 'd', niveauConfidentialite: 's', auteur: 's', createdAt: 't', updatedAt: 't',
    },
    columns: { date: 'date_note', pointsCles: 'points_cles_json' },
  },
  rapports_reunions: {
    table: 'rapports_reunions',
    fields: {
      id: 's', titre: 's', typeReunion: 's', date: 'd', heureDebut: 's', heureFin: 's', lieu: 's', presidentSeance: 's',
      secretaireSeance: 's', participantsPresents: 's', participantsAbsents: 's', ordreDuJour: 's', syntheseDiscussions: 's',
      decisions: 'j', prochaineReunionDate: 'd', statut: 's', redigePar: 's', piecesJointesOuNotes: 's',
      createdAt: 't', updatedAt: 't',
    },
    columns: { date: 'date_reunion', decisions: 'decisions_json' },
  },
  rapports_agents: {
    table: 'rapports_agents_terrain',
    fields: {
      id: 's', dateRapport: 'd', gestionnaireId: 's', agentNom: 's', agentTelephone: 's', zoneSecteur: 's', typeMission: 's',
      adherentsVisites: 'i', adherentsCotisants: 'i', nouvellesAdhesions: 'i', montantEspecesRemis: 'n',
      montantMobileMoneyDeclare: 'n', montantTotalCollecte: 'n', conformiteCaisse: 's', ecartMontant: 'n',
      justificationEcart: 's', difficultesRencontrees: 's', actionsDemain: 's', observations: 's', commentairesCaissiere: 's',
      saisiPar: 's', dateHeureSaisie: 's', statutValidation: 's', visaDaf: 's', createdAt: 't', updatedAt: 't',
    },
    // alias historiques du front (totalCollecte, explicationEcart...) : relus à partir des champs canoniques
    ignore: ['totalCollecte', 'explicationEcart', 'difficultesTerrain', 'actionsPrioritaires'],
    computed: {
      totalCollecte: (d) => d.montantTotalCollecte,
      explicationEcart: (d) => d.justificationEcart,
      difficultesTerrain: (d) => d.difficultesRencontrees,
      actionsPrioritaires: (d) => d.actionsDemain,
    },
  },
};

const snake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** Prépare les index de correspondance (champ <-> colonne) une seule fois. */
for (const def of Object.values(TABLES)) {
  def.byField = {};
  def.byColumn = {};
  for (const [field, type] of Object.entries(def.fields)) {
    const col = def.columns?.[field] || snake(field);
    def.byField[field] = { col, type };
    def.byColumn[col] = { field, type };
  }
}

export const COLLECTIONS = Object.keys(TABLES);
