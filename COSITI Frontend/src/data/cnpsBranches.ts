import { PieceDossier } from '../types';

export type BrancheCnps =
  | 'PRESTATIONS_FAMILIALES'
  | 'RISQUES_PROFESSIONNELS'
  | 'PVID';

export interface OffreCnps {
  id: string;
  branche: BrancheCnps;
  nom: string;
  description: string;
  delaiTraitement: string;
  montantReference: string;
  piecesDefaut: { id: string; nom: string; obligatoire: boolean }[];
}

export interface BrancheCnpsConfig {
  id: BrancheCnps;
  code: string;
  nom: string;
  titreCourt: string;
  description: string;
  couleurBg: string;
  couleurBordure: string;
  couleurTexte: string;
  couleurBadge: string;
  offres: OffreCnps[];
}

export const BRANCHES_CNPS: BrancheCnpsConfig[] = [
  {
    id: 'PRESTATIONS_FAMILIALES',
    code: 'PF',
    nom: 'Prestations Familiales',
    titreCourt: 'Famille & Maternité',
    description:
      'Allocations familiales pour enfants à charge, indemnités de maternité pour femmes travailleuses indépendantes, allocations prénatales et primes de naissance.',
    couleurBg: 'bg-rose-50',
    couleurBordure: 'border-rose-200',
    couleurTexte: 'text-rose-900',
    couleurBadge: 'bg-rose-100 text-rose-800 border-rose-200',
    offres: [
      {
        id: 'pf-alloc-fam',
        branche: 'PRESTATIONS_FAMILIALES',
        nom: 'Allocations Familiales (Enfants scolarisés & à charge)',
        description:
          'Versement périodique pour l\'entretien et l\'éducation des enfants à charge légitimes ou reconnus.',
        delaiTraitement: '15 à 30 jours après dépôt complet',
        montantReference: '2 500 à 5 000 FCFA / enfant / mois',
        piecesDefaut: [
          { id: 'pf-1', nom: 'Extrait d\'acte de naissance de l\'adhérent', obligatoire: true },
          { id: 'pf-2', nom: 'Photocopie CNI de l\'adhérent', obligatoire: true },
          { id: 'pf-3', nom: 'Attestation d\'immatriculation CNPS', obligatoire: true },
          { id: 'pf-4', nom: 'Extraits d\'acte de naissance des enfants à charge', obligatoire: true },
          { id: 'pf-5', nom: 'Certificats de scolarité ou d\'apprentissage en cours de validité', obligatoire: true },
          { id: 'pf-6', nom: 'Certificat de vie et d\'entretien collectif', obligatoire: true },
          { id: 'pf-7', nom: 'Certificat de mariage légal (si marié)', obligatoire: false },
          { id: 'pf-8', nom: '2 photos d\'identité récentes de l\'assuré', obligatoire: true },
        ],
      },
      {
        id: 'pf-mat-indem',
        branche: 'PRESTATIONS_FAMILIALES',
        nom: 'Indemnités Journalières de Maternité (Travailleuses indépendantes)',
        description:
          'Compensation de perte de revenu pendant l\'arrêt de travail lié à la maternité (14 semaines).',
        delaiTraitement: '21 jours après déclaration de grossesse',
        montantReference: '100% du gain journalier de cotisation',
        piecesDefaut: [
          { id: 'mat-1', nom: 'Attestation d\'immatriculation CNPS à jour', obligatoire: true },
          { id: 'mat-2', nom: 'Certificat médical de grossesse (date présumée accouchement)', obligatoire: true },
          { id: 'mat-3', nom: 'Déclaration formelle d\'interruption d\'activité', obligatoire: true },
          { id: 'mat-4', nom: 'RIB ou coordonnées Mobile Money pour virement', obligatoire: true },
          { id: 'mat-5', nom: 'Certificat d\'accouchement (après naissance)', obligatoire: true },
        ],
      },
      {
        id: 'pf-alloc-prena',
        branche: 'PRESTATIONS_FAMILIALES',
        nom: 'Allocations Prénatales (Suivi médical obligatoire)',
        description:
          'Prime accordée en plusieurs tranches sur présentation des examens médicaux de grossesse.',
        delaiTraitement: '10 jours après validation des visites médicales',
        montantReference: 'Forfait 9 mois de suivi médical',
        piecesDefaut: [
          { id: 'pren-1', nom: 'Carnet de consultations prénatales homologué', obligatoire: true },
          { id: 'pren-2', nom: 'Certificats des 3 visites médicales obligatoires', obligatoire: true },
          { id: 'pren-3', nom: 'Carte d\'assuré CNPS valide', obligatoire: true },
        ],
      },
      {
        id: 'pf-prime-naiss',
        branche: 'PRESTATIONS_FAMILIALES',
        nom: 'Prime à la Naissance & Frais d\'accouchement',
        description:
          'Aide financière forfaitaire accordée lors de la naissance d\'un enfant viable déclaré à l\'état civil.',
        delaiTraitement: '15 jours suivant le dépôt de l\'acte de naissance',
        montantReference: 'Prime forfaitaire CNPS',
        piecesDefaut: [
          { id: 'prim-1', nom: 'Extrait d\'acte de naissance du nouveau-né (- 3 mois)', obligatoire: true },
          { id: 'prim-2', nom: 'Certificat médical d\'accouchement établi par la sage-femme / médecin', obligatoire: true },
          { id: 'prim-3', nom: 'Copie de la CNI de la mère et du père adhérent', obligatoire: true },
        ],
      },
    ],
  },
  {
    id: 'RISQUES_PROFESSIONNELS',
    code: 'RP',
    nom: 'Risques Professionnels',
    titreCourt: 'Accidents & Soins',
    description:
      'Prise en charge intégrale des accidents du travail, maladies professionnelles, frais médicaux et chirurgicaux, rééducation et rentes d\'incapacité.',
    couleurBg: 'bg-amber-50',
    couleurBordure: 'border-amber-200',
    couleurTexte: 'text-amber-900',
    couleurBadge: 'bg-amber-100 text-amber-900 border-amber-200',
    offres: [
      {
        id: 'rp-accident-travail',
        branche: 'RISQUES_PROFESSIONNELS',
        nom: 'Accident du Travail & Trajet (Déclaration et prise en charge)',
        description:
          'Prise en charge d\'urgence de tout accident survenu sur le lieu d\'activité ou sur le trajet direct.',
        delaiTraitement: 'Déclaration sous 48h obligatoire',
        montantReference: 'Prise en charge médicale à 100%',
        piecesDefaut: [
          { id: 'at-1', nom: 'Formulaire officiel de déclaration d\'accident du travail (DAT)', obligatoire: true },
          { id: 'at-2', nom: 'Certificat médical initial constatant les lésions', obligatoire: true },
          { id: 'at-3', nom: 'Rapport d\'enquête ou témoignages circonstanciés (COSITI)', obligatoire: true },
          { id: 'at-4', nom: 'Reçus et factures détaillées de soins d\'urgence', obligatoire: true },
          { id: 'at-5', nom: 'Carte d\'immatriculation CNPS de l\'adhérent', obligatoire: true },
        ],
      },
      {
        id: 'rp-maladie-pro',
        branche: 'RISQUES_PROFESSIONNELS',
        nom: 'Maladie Professionnelle (Reconnaissance et soins)',
        description:
          'Affection liée aux conditions de travail (inhalation de poussières, postures, produits chimiques).',
        delaiTraitement: '30 jours d\'expertise médicale',
        montantReference: 'Prise en charge intégrale des soins et bilans',
        piecesDefaut: [
          { id: 'mp-1', nom: 'Déclaration médicale de maladie professionnelle', obligatoire: true },
          { id: 'mp-2', nom: 'Rapport d\'exposition au risque dans l\'activité informelle', obligatoire: true },
          { id: 'mp-3', nom: 'Examens biologiques ou radiologiques de confirmation', obligatoire: true },
          { id: 'mp-4', nom: 'Historique des cotisations COSITI à jour', obligatoire: true },
        ],
      },
      {
        id: 'rp-frais-medicaux',
        branche: 'RISQUES_PROFESSIONNELS',
        nom: 'Prise en Charge des Soins Médicaux, Pharmaceutiques & Prothèses',
        description:
          'Remboursement ou prise en charge directe des médicaments, appareillages, rééducation motrice.',
        delaiTraitement: '14 jours après validation des ordonnances',
        montantReference: 'Remboursement sur justificatifs validés',
        piecesDefaut: [
          { id: 'fm-1', nom: 'Prescriptions et ordonnances médicales originales', obligatoire: true },
          { id: 'fm-2', nom: 'Factures normalisées certifiées acquittées', obligatoire: true },
          { id: 'fm-3', nom: 'Rapport du médecin traitant ou spécialiste', obligatoire: true },
        ],
      },
      {
        id: 'rp-rente-incapacite',
        branche: 'RISQUES_PROFESSIONNELS',
        nom: 'Rente d\'Incapacité Permanente ou de Survivants',
        description:
          'Rente viagère ou capital forfaitaire versé en cas de réduction définitive de la capacité de travail ou décès.',
        delaiTraitement: 'Commission médicale CNPS',
        montantReference: 'Pourcentage fixé par le barème d\'invalidité',
        piecesDefaut: [
          { id: 'ri-1', nom: 'Certificat médical de consolidation ou guérison avec séquelles', obligatoire: true },
          { id: 'ri-2', nom: 'Décision du médecin-conseil de la CNPS fixant le taux d\'IPP', obligatoire: true },
          { id: 'ri-3', nom: 'Acte de décès et certificat d\'hérédité (si rente de survivants)', obligatoire: false },
          { id: 'ri-4', nom: 'Dossier administratif complet COSITI', obligatoire: true },
        ],
      },
    ],
  },
  {
    id: 'PVID',
    code: 'PVID',
    nom: 'PVID (Pension Vieillesse, Invalidité & Décès)',
    titreCourt: 'Retraite & Prévoyance',
    description:
      'Pensions de vieillesse (retraite normale du travailleur indépendant), allocations uniques de départ, rentes d\'invalidité et pensions de réversion pour les ayants droit.',
    couleurBg: 'bg-indigo-50',
    couleurBordure: 'border-indigo-200',
    couleurTexte: 'text-indigo-900',
    couleurBadge: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    offres: [
      {
        id: 'pvid-retraite-normale',
        branche: 'PVID',
        nom: 'Pension de Vieillesse Normale (Retraite RSTI / CNPS)',
        description:
          'Pension viagère trimestrielle servie à l\'assuré ayant atteint l\'âge légal (60 ans) et cumulé le nombre requis de cotisations.',
        delaiTraitement: '45 à 60 jours d\'instruction',
        montantReference: 'Calcul selon les trimestres validés (minimum garanti)',
        piecesDefaut: [
          { id: 'ret-1', nom: 'Demande officielle de liquidation de pension de vieillesse', obligatoire: true },
          { id: 'ret-2', nom: 'Extrait d\'acte de naissance de l\'assuré (- 3 mois)', obligatoire: true },
          { id: 'ret-3', nom: 'Photocopie CNI ou passeport légalisé', obligatoire: true },
          { id: 'ret-4', nom: 'Relevé de carrière individuel et bordereaux de cotisations COSITI/CNPS', obligatoire: true },
          { id: 'ret-5', nom: 'Attestation de cessation ou d\'aménagement d\'activité', obligatoire: true },
          { id: 'ret-6', nom: 'RIB bancaire ou compte Mobile Money pour paiement des arrérages', obligatoire: true },
          { id: 'ret-7', nom: '3 photos d\'identité récentes de l\'assuré', obligatoire: true },
        ],
      },
      {
        id: 'pvid-alloc-unique',
        branche: 'PVID',
        nom: 'Allocation Unique de Vieillesse (Versement forfaitaire)',
        description:
          'Remboursement forfaitaire sous forme de capital unique pour l\'assuré n\'ayant pas atteint le minimum de trimestres cotisés.',
        delaiTraitement: '30 jours',
        montantReference: 'Versement unique des cotisations revalorisées',
        piecesDefaut: [
          { id: 'au-1', nom: 'Demande formelle d\'allocation unique de vieillesse', obligatoire: true },
          { id: 'au-2', nom: 'Extrait d\'acte de naissance et pièce d\'identité', obligatoire: true },
          { id: 'au-3', nom: 'Historique des cotisations COSITI certifié', obligatoire: true },
          { id: 'au-4', nom: 'RIB bancaire ou compte Mobile Money certifié', obligatoire: true },
        ],
      },
      {
        id: 'pvid-invalidite-premat',
        branche: 'PVID',
        nom: 'Pension d\'Invalidité Prématurée (Inaptitude médicale)',
        description:
          'Pension accordée avant l\'âge de la retraite à l\'adhérent frappé d\'une inaptitude médicale permanente à l\'exercice de son métier.',
        delaiTraitement: '30 jours après expertise médicale',
        montantReference: 'Pension calculée sur la moyenne des cotisations',
        piecesDefaut: [
          { id: 'inv-1', nom: 'Rapport médical circonstancié du médecin traitant sous pli confidentiel', obligatoire: true },
          { id: 'inv-2', nom: 'Avis conforme du médecin-conseil de la CNPS', obligatoire: true },
          { id: 'inv-3', nom: 'Relevé récapitulatif des cotisations validées', obligatoire: true },
          { id: 'inv-4', nom: 'Extrait d\'acte de naissance et pièce d\'identité', obligatoire: true },
        ],
      },
      {
        id: 'pvid-pension-reversion',
        branche: 'PVID',
        nom: 'Pension de Réversion & Capital Décès (Conjoints et orphelins)',
        description:
          'Paiement d\'un capital décès d\'urgence et service d\'une pension aux veufs/veuves et orphelins mineurs de l\'adhérent décédé.',
        delaiTraitement: '20 jours après déclaration de décès',
        montantReference: 'Capital décès immédiat + 50% de la pension au conjoint',
        piecesDefaut: [
          { id: 'rev-1', nom: 'Extrait d\'acte de décès de l\'adhérent assuré', obligatoire: true },
          { id: 'rev-2', nom: 'Certificat d\'hérédité légal délivré par le tribunal', obligatoire: true },
          { id: 'rev-3', nom: 'Acte de mariage régulier (conjoint survivant)', obligatoire: true },
          { id: 'rev-4', nom: 'Extraits d\'acte de naissance de tous les orphelins mineurs', obligatoire: true },
          { id: 'rev-5', nom: 'Certificats de scolarité des orphelins scolarisés', obligatoire: true },
          { id: 'rev-6', nom: 'Relevé d\'identité bancaire du conjoint tuteur', obligatoire: true },
        ],
      },
    ],
  },
];

export function getBrancheConfig(branche: BrancheCnps): BrancheCnpsConfig {
  return (
    BRANCHES_CNPS.find((b) => b.id === branche) || BRANCHES_CNPS[0]
  );
}

export function getAllOffres(): OffreCnps[] {
  return BRANCHES_CNPS.flatMap((b) => b.offres);
}

export function getOffreById(offreId: string): OffreCnps | undefined {
  return getAllOffres().find((o) => o.id === offreId);
}

export function getPiecesForOffre(offreIdOrNom: string): { id: string; nom: string; obligatoire: boolean }[] {
  const all = getAllOffres();
  const matched = all.find((o) => o.id === offreIdOrNom || o.nom === offreIdOrNom);
  if (matched) {
    return matched.piecesDefaut;
  }
  return BRANCHES_CNPS[0].offres[0].piecesDefaut;
}
