import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Adherent, Cotisation, DossierAllocations } from '../types';
import { formatFCFA, formatDateShort } from '../utils/helpers';
import { getUserPermissions } from '../utils/permissions';
import { useApiQuery } from '../api/hooks';
import type { EtatMensuel, Rapprochement } from '../api/models';
import {
  exportToExcel,
  exportMonthlyReportExcel,
  exportRapprochementBanqueCnpsExcel,
  exportEtatEncaissementsDecaissementsExcel,
} from '../utils/exportUtils';
import {
  generateReportPdf,
  generateEtatEncaissementsDecaissementsPdf,
} from '../utils/pdfReportGenerator';
import { RapportPrintModal } from './RapportPrintModal';
import { MySQLExportModal } from './MySQLExportModal';
import {
  FileText,
  FileSpreadsheet,
  Printer,
  Database,
  CheckCircle2,
  AlertTriangle,
  BadgeCheck,
  FolderHeart,
  CreditCard,
  Calendar,
  CalendarRange,
  Users,
  Search,
  Download,
  ExternalLink,
  Landmark,
  Shield,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Filter,
  TrendingDown,
  Wallet,
} from 'lucide-react';

const MOIS_LIST = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

type RapportType =
  | 'GLOBALE_ADHERENTS'
  | 'ADHERENTS_A_JOUR'
  | 'ADHERENTS_NON_A_JOUR'
  | 'SEUIL_15000_ATTEINT'
  | 'A_IMMATRICULER'
  | 'DEJA_IMMATRICULES'
  | 'DOSSIERS_A_CONSTITUER'
  | 'COTISATIONS_JOURNALIERES'
  | 'COTISATIONS_MENSUELLES'
  | 'FICHE_INDIVIDUELLE'
  | 'RAPPROCHEMENT_BANQUE_CNPS'
  | 'ENCAISSEMENTS_DECAISSEMENTS';

export const RapportsView: React.FC = () => {
  const { adherents, cotisations, dossiers, parametres, setActiveTab, banques, statsOf, currentUser, signataires } = useApp();

  const [selectedRapport, setSelectedRapport] = useState<RapportType>('GLOBALE_ADHERENTS');
  const [selectedAdherentId, setSelectedAdherentId] = useState<string>(
    adherents.length > 0 ? adherents[0].id : ''
  );
  const [selectedMois, setSelectedMois] = useState<string>('Mars');
  const [selectedAnnee, setSelectedAnnee] = useState<number>(new Date().getFullYear());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isMySQLModalOpen, setIsMySQLModalOpen] = useState(false);

  // Filtres spécifiques au rapport de rapprochement bancaire & réserve CNPS
  const [rapprochementPeriodeMode, setRapprochementPeriodeMode] = useState<'MOIS' | 'GLOBAL'>('MOIS');
  const [rapprochementBanqueFiltre, setRapprochementBanqueFiltre] = useState<string>('TOUTES');
  const [rapprochementBaseReserve, setRapprochementBaseReserve] = useState<'COTISATIONS_PERCUES' | 'SEUIL_15000'>('COTISATIONS_PERCUES');

  // Statistiques de cotisation de chaque adhérent : calculées par le serveur (GET /adherents?stats=true)
  const adherentsWithStats = adherents.map((adh) => ({
    adh,
    stats: statsOf(adh),
  }));

  const permissions = getUserPermissions(currentUser);

  // Rapprochement bancaire, réserve CNPS et flux de trésorerie : calculés par le serveur (GET /rapports/rapprochement).
  // FORMULE : Solde Réel en Banque = Fonds Versés en Banque - Réserve Cotisations CNPS
  const rapprochementPath = permissions.canManageFinances ? '/rapports/rapprochement' : null;
  const { data: rapp } = useApiQuery<Rapprochement>(rapprochementPath, {
    periode: rapprochementPeriodeMode,
    mois: rapprochementPeriodeMode === 'MOIS' ? selectedMois : undefined,
    annee: rapprochementPeriodeMode === 'MOIS' ? selectedAnnee : undefined,
    banque: rapprochementBanqueFiltre !== 'TOUTES' ? rapprochementBanqueFiltre : undefined,
    base: rapprochementBaseReserve === 'SEUIL_15000' ? 'SEUIL' : 'COTISATIONS_PERCUES',
  });

  // État mensuel (cotisations de la période concernée) : calculé par le serveur
  const { data: etatMois } = useApiQuery<EtatMensuel>(selectedRapport === 'COTISATIONS_MENSUELLES' ? '/rapports/etat-mensuel' : null, {
    mois: selectedMois,
    annee: selectedAnnee,
  });

  const versementsRapprochement = rapp?.fondsBanque.versements ?? [];
  const totalFondsBanque = rapp?.fondsBanque.total ?? 0;
  const adherentsReserveList = rapp?.reserveCnps.adherents ?? [];
  const totalReserveCnps = rapp?.reserveCnps.total ?? 0;
  const soldeReelBanque = rapp?.soldeReelBanque ?? 0;
  const tauxCouverture = rapp?.tauxCouverture ?? 0;

  // Encaissements et décaissements selon les deux origines :
  // 1. Exploitation : UNIQUEMENT les montants relatifs aux cotisations CNPS
  // 2. Apport personnel du PCA : tout le reste des dépenses
  const nbEncaissements = rapp?.flux.encaissements.nombre ?? 0;
  const totalEncaissementsFlux = rapp?.flux.encaissements.total ?? 0;
  const decaissementsExploitationCnpsList = rapp?.flux.decaissementsExploitation.depenses ?? [];
  const totalDecaissementsExploitationCnps = rapp?.flux.decaissementsExploitation.total ?? 0;
  const decaissementsApportPcaList = rapp?.flux.decaissementsApportPca.depenses ?? [];
  const totalDecaissementsApportPca = rapp?.flux.decaissementsApportPca.total ?? 0;
  const totalDecaissementsFlux = rapp?.flux.totalDecaissements ?? 0;
  const soldeNetFlux = rapp?.flux.soldeNet ?? 0;

  // Génération des données selon le rapport sélectionné
  let title = '';
  let description = '';
  let reportData: any[] = [];
  let tableHeaders: string[] = [];
  let tableRows: any[][] = [];

  switch (selectedRapport) {
    case 'GLOBALE_ADHERENTS':
      title = '1. Liste globale des adhérents COSITI';
      description = 'Répertoire complet de tous les membres enregistrés dans la coopérative';
      tableHeaders = ['Matricule', 'Nom & Prénoms', 'Sexe', 'Téléphone', 'Profession', 'Date Adhésion', 'Statut', 'Cumul Cotisé (FCFA)'];
      tableRows = adherentsWithStats.map(({ adh, stats }) => [
        adh.matricule,
        `${adh.nom} ${adh.prenom}`,
        adh.sexe,
        adh.telephone,
        adh.profession,
        formatDateShort(adh.dateAdhesion),
        adh.statut,
        formatFCFA(stats.totalCumule),
      ]);
      reportData = adherentsWithStats.map(({ adh, stats }) => ({
        Matricule: adh.matricule,
        Nom: adh.nom,
        Prénom: adh.prenom,
        Sexe: adh.sexe,
        Téléphone: adh.telephone,
        Profession: adh.profession,
        DateAdhésion: adh.dateAdhesion,
        Statut: adh.statut,
        CumulCotisé: stats.totalCumule,
      }));
      break;

    case 'ADHERENTS_A_JOUR':
      title = '2. Liste des adhérents à jour de leurs cotisations';
      description = 'Adhérents dont la couverture journalière est conforme à la date actuelle';
      const aJourList = adherentsWithStats.filter(({ stats }) => stats.statutCotisation === 'À jour');
      tableHeaders = ['Matricule', 'Nom & Prénoms', 'Téléphone', 'Tarif/Jour', 'Total Cumulé (FCFA)', 'Jours Couverts', 'Statut'];
      tableRows = aJourList.map(({ adh, stats }) => [
        adh.matricule,
        `${adh.nom} ${adh.prenom}`,
        adh.telephone,
        `${adh.tarifJournalier} F`,
        formatFCFA(stats.totalCumule),
        `${stats.nombreJoursCotises} j`,
        stats.statutCotisation,
      ]);
      reportData = aJourList.map(({ adh, stats }) => ({
        Matricule: adh.matricule,
        Nom: `${adh.nom} ${adh.prenom}`,
        Téléphone: adh.telephone,
        TarifJournalier: adh.tarifJournalier,
        TotalCumule: stats.totalCumule,
        JoursCotises: stats.nombreJoursCotises,
      }));
      break;

    case 'ADHERENTS_NON_A_JOUR':
      title = '3. Liste des adhérents non à jour de leurs cotisations';
      description = 'Adhérents accusant un retard de versement ou n’ayant aucun paiement';
      const nonAJourList = adherentsWithStats.filter(({ stats }) => stats.statutCotisation !== 'À jour');
      tableHeaders = ['Matricule', 'Nom & Prénoms', 'Téléphone', 'Dernier Versement', 'Jours Retard', 'Cumul Actuel (FCFA)', 'Statut'];
      tableRows = nonAJourList.map(({ adh, stats }) => [
        adh.matricule,
        `${adh.nom} ${adh.prenom}`,
        adh.telephone,
        stats.dernierPaiement ? formatDateShort(stats.dernierPaiement.datePaiement) : 'Jamais cotisé',
        `${stats.joursRetard} jours`,
        formatFCFA(stats.totalCumule),
        stats.statutCotisation,
      ]);
      reportData = nonAJourList.map(({ adh, stats }) => ({
        Matricule: adh.matricule,
        Nom: `${adh.nom} ${adh.prenom}`,
        Téléphone: adh.telephone,
        DernierVersement: stats.dernierPaiement?.datePaiement || 'Aucun',
        JoursRetard: stats.joursRetard,
        TotalCumule: stats.totalCumule,
      }));
      break;

    case 'SEUIL_15000_ATTEINT':
      title = '4. Liste des adhérents ayant atteint le seuil de 15 000 FCFA';
      description = 'Membres éligibles aux prestations sociales ayant cotisé 15 000 FCFA ou plus';
      const seuilList = adherentsWithStats.filter(({ stats }) => stats.seuilAtteint);
      tableHeaders = ['Matricule', 'Nom & Prénoms', 'Profession', 'Téléphone', 'Cumul Cotisé (FCFA)', 'Statut Immatriculation', 'N° CNPS'];
      tableRows = seuilList.map(({ adh, stats }) => [
        adh.matricule,
        `${adh.nom} ${adh.prenom}`,
        adh.profession,
        adh.telephone,
        formatFCFA(stats.totalCumule),
        adh.statutImmatriculation,
        adh.numeroCnps || 'En attente',
      ]);
      reportData = seuilList.map(({ adh, stats }) => ({
        Matricule: adh.matricule,
        Nom: `${adh.nom} ${adh.prenom}`,
        Profession: adh.profession,
        Téléphone: adh.telephone,
        TotalCumule: stats.totalCumule,
        StatutImmatriculation: adh.statutImmatriculation,
        NumeroCnps: adh.numeroCnps || '',
      }));
      break;

    case 'A_IMMATRICULER':
      title = '5. Liste des adhérents prioritaires à immatriculer';
      description = 'Adhérents ayant franchi le seuil de 15 000 FCFA mais pas encore enregistrés à la CNPS';
      const aImmat = adherentsWithStats.filter(
        ({ adh, stats }) => stats.seuilAtteint && adh.statutImmatriculation !== 'Immatriculé'
      );
      tableHeaders = ['Matricule', 'Nom & Prénoms', 'CNI', 'Téléphone', 'Cumul Atteint (FCFA)', 'Date Adhésion', 'Action'];
      tableRows = aImmat.map(({ adh, stats }) => [
        adh.matricule,
        `${adh.nom} ${adh.prenom}`,
        adh.cni || 'Non renseignée',
        adh.telephone,
        formatFCFA(stats.totalCumule),
        formatDateShort(adh.dateAdhesion),
        'À déclarer CNPS',
      ]);
      reportData = aImmat.map(({ adh, stats }) => ({
        Matricule: adh.matricule,
        Nom: `${adh.nom} ${adh.prenom}`,
        CNI: adh.cni,
        Téléphone: adh.telephone,
        Cumul: stats.totalCumule,
        DateAdhésion: adh.dateAdhesion,
      }));
      break;

    case 'DEJA_IMMATRICULES':
      title = '6. Liste des adhérents déjà immatriculés à la CNPS';
      description = 'Adhérents dotés d’un numéro d’immatriculation officiel de sécurité sociale';
      const dejaImmat = adherentsWithStats.filter(({ adh }) => adh.statutImmatriculation === 'Immatriculé');
      tableHeaders = ['Matricule', 'Nom & Prénoms', 'Numéro CNPS', 'Date Immatriculation', 'Téléphone', 'Cumul Cotisé (FCFA)'];
      tableRows = dejaImmat.map(({ adh, stats }) => [
        adh.matricule,
        `${adh.nom} ${adh.prenom}`,
        adh.numeroCnps || 'N/A',
        adh.dateImmatriculation ? formatDateShort(adh.dateImmatriculation) : '—',
        adh.telephone,
        formatFCFA(stats.totalCumule),
      ]);
      reportData = dejaImmat.map(({ adh, stats }) => ({
        Matricule: adh.matricule,
        Nom: `${adh.nom} ${adh.prenom}`,
        NumeroCnps: adh.numeroCnps,
        DateImmatriculation: adh.dateImmatriculation,
        Téléphone: adh.telephone,
        TotalCumule: stats.totalCumule,
      }));
      break;

    case 'DOSSIERS_A_CONSTITUER':
      title = '7. Dossiers d’allocations familiales à constituer / compléter';
      description = 'Adhérents immatriculés dont le dossier de prestations n’est pas encore complet ou validé (prise en compte des travailleurs sans enfant)';
      tableHeaders = ['Matricule', 'Nom & Prénoms', 'Statut Dossier', 'Pièces Fournies', 'Certificats Scolarité', 'Situation Enfants', 'Date Transmission'];
      tableRows = dossiers.map((dos) => {
        const isSansEnfant = dos.sansEnfant || dos.statut === 'Sans enfant (Non éligible allocations)';
        return [
          dos.matricule,
          dos.adherentNomPrenom,
          dos.statut,
          isSansEnfant
            ? 'Exonéré (Sans enfant)'
            : `${dos.pieces.filter((p) => p.recu).length}/${dos.pieces.length}`,
          isSansEnfant
            ? 'Non requis'
            : dos.certificatsScolariteFournis ? 'Fournis' : 'Manquants',
          isSansEnfant
            ? 'Sans enfant à charge'
            : `${dos.nombreEnfants || 0} enfant(s)`,
          dos.dateTransmission ? formatDateShort(dos.dateTransmission) : 'Non transmis',
        ];
      });
      reportData = dossiers.map((d) => {
        const isSansEnfant = d.sansEnfant || d.statut === 'Sans enfant (Non éligible allocations)';
        return {
          Matricule: d.matricule,
          Adhérent: d.adherentNomPrenom,
          StatutDossier: d.statut,
          SituationEnfants: isSansEnfant ? 'Sans enfant à charge (exonéré)' : `${d.nombreEnfants || 0} enfant(s)`,
          NombreEnfants: isSansEnfant ? 0 : d.nombreEnfants,
          CertificatsScolarité: isSansEnfant ? 'NON REQUIS' : (d.certificatsScolariteFournis ? 'OUI' : 'NON'),
          DateTransmission: d.dateTransmission || '',
        };
      });
      break;

    case 'COTISATIONS_JOURNALIERES':
      title = '8. État récapitulatif des cotisations journalières';
      description = 'Enregistrement de tous les encaissements journaliers avec ventilation par mode';
      tableHeaders = ['Date', 'Matricule', 'Adhérent', 'Montant (FCFA)', 'Mode de paiement', 'Référence', 'Agent'];
      tableRows = cotisations.map((c) => [
        formatDateShort(c.datePaiement),
        c.matricule,
        c.adherentNomPrenom,
        formatFCFA(c.montant),
        c.modePaiement,
        c.reference || '—',
        c.agentEnregistreur,
      ]);
      reportData = cotisations.map((c) => ({
        Date: c.datePaiement,
        Matricule: c.matricule,
        Adhérent: c.adherentNomPrenom,
        Montant: c.montant,
        Mode: c.modePaiement,
        Référence: c.reference,
        Agent: c.agentEnregistreur,
      }));
      break;

    case 'COTISATIONS_MENSUELLES':
      title = `9. État récapitulatif mensuel des cotisations (${selectedMois} ${selectedAnnee})`;
      description = 'Synthèse financière filtrée par mois et année avec totaux consolidés';
      const cotisMois = etatMois?.cotisations.liste ?? [];
      tableHeaders = ['Date Paiement', 'Matricule', 'Adhérent', 'Montant (FCFA)', 'Mode', 'Référence', 'Agent'];
      tableRows = cotisMois.map((c) => [
        formatDateShort(c.datePaiement),
        c.matricule,
        c.adherentNomPrenom,
        formatFCFA(c.montant),
        c.modePaiement,
        c.reference || '—',
        c.agentEnregistreur,
      ]);
      reportData = cotisMois.map((c) => ({
        Date: c.datePaiement,
        Matricule: c.matricule,
        Adhérent: c.adherentNomPrenom,
        Montant: c.montant,
        Mode: c.modePaiement,
      }));
      break;

    case 'FICHE_INDIVIDUELLE':
      const targetAdh = adherents.find((a) => a.id === selectedAdherentId) || adherents[0];
      const targetStats = targetAdh ? statsOf(targetAdh) : null;
      const targetCotis = cotisations.filter((c) => c.adherentId === targetAdh?.id);

      title = `10. Fiche individuelle d'adhérent : ${targetAdh?.matricule || ''}`;
      description = `Relevé complet de cotisations pour ${targetAdh?.nom} ${targetAdh?.prenom}`;
      tableHeaders = ['Date', 'Montant (FCFA)', 'Mois', 'Mode de paiement', 'Référence', 'Agent'];
      tableRows = targetCotis.map((c) => [
        formatDateShort(c.datePaiement),
        formatFCFA(c.montant),
        `${c.mois} ${c.annee}`,
        c.modePaiement,
        c.reference || '—',
        c.agentEnregistreur,
      ]);
      reportData = targetCotis.map((c) => ({
        Matricule: targetAdh?.matricule,
        Nom: targetAdh?.nom,
        Date: c.datePaiement,
        Montant: c.montant,
        Mode: c.modePaiement,
      }));
      break;

    case 'RAPPROCHEMENT_BANQUE_CNPS': {
      const periodeLibelle =
        rapprochementPeriodeMode === 'MOIS'
          ? `${selectedMois} ${selectedAnnee}`
          : 'Toutes Périodes Confondues (Cumul Global)';
      const banqueLibelle =
        rapprochementBanqueFiltre !== 'TOUTES' ? ` — ${rapprochementBanqueFiltre}` : ' — Toutes Banques';

      title = `11. Solde Réel en Banque après Déduction Réserve CNPS (${periodeLibelle}${banqueLibelle})`;
      description = `Rapprochement officiel de trésorerie bancaire : Fonds versés en banque déduits exclusivement de la réserve sanctuarisée pour les cotisations CNPS`;
      tableHeaders = ['Poste Comptable & Financier', 'Montant (FCFA)', 'Observations & Conformité Réglementaire'];
      tableRows = [
        [
          '1. TOTAL DES FONDS VERSÉS EN BANQUE (BORDEREAUX)',
          formatFCFA(totalFondsBanque),
          `${versementsRapprochement.length} remise(s) bancaire(s) enregistrée(s)${rapprochementBanqueFiltre !== 'TOUTES' ? ` sur ${rapprochementBanqueFiltre}` : ''}`,
        ],
        [
          '2. DÉDUCTION : FONDS RÉSERVÉS AUX COTISATIONS CNPS',
          `-${formatFCFA(totalReserveCnps)}`,
          `${adherentsReserveList.length} adhérent(s) • Fonds sanctuarisés exclusivement pour le reversement des cotisations CNPS`,
        ],
        [
          '3. SOLDE RÉEL DISPONIBLE EN BANQUE (HORS CNPS)',
          formatFCFA(soldeReelBanque),
          soldeReelBanque >= 0
            ? 'Trésorerie nette disponible excédentaire (Réserve CNPS 100% couverte en banque)'
            : 'ATTENTION : Déficit de couverture bancaire de la réserve CNPS',
        ],
        [
          'Taux de couverture de la Réserve CNPS en Banque',
          `${tauxCouverture.toFixed(1)} %`,
          tauxCouverture >= 100
            ? 'Couverture intégrale conforme (Fonds bancaires supérieurs à la réserve CNPS)'
            : 'Versement bancaire complémentaire requis pour garantir la réserve CNPS',
        ],
      ];
      reportData = [
        { Rubrique: '1. TOTAL DES FONDS VERSÉS EN BANQUE (BORDEREAUX)', Montant: totalFondsBanque, Observations: `${versementsRapprochement.length} bordereaux` },
        { Rubrique: '2. DÉDUCTION : FONDS RÉSERVÉS AUX COTISATIONS CNPS', Montant: -totalReserveCnps, Observations: `${adherentsReserveList.length} adhérents couverts` },
        { Rubrique: '3. SOLDE RÉEL DISPONIBLE EN BANQUE (HORS CNPS)', Montant: soldeReelBanque, Observations: soldeReelBanque >= 0 ? 'Trésorerie nette libre disponible' : 'Déficit de couverture' },
        { Rubrique: 'Taux de couverture de la Réserve CNPS en Banque', Montant: `${tauxCouverture.toFixed(1)} %`, Observations: 'Ratio bancaire / CNPS' },
      ];
      break;
    }

    case 'ENCAISSEMENTS_DECAISSEMENTS': {
      const periodeLibelle =
        rapprochementPeriodeMode === 'MOIS'
          ? `${selectedMois} ${selectedAnnee}`
          : 'Toutes Périodes Confondues (Cumul Global)';

      title = `12. État Officiel des Encaissements et Décaissements (${periodeLibelle})`;
      description = `Ventilation réglementaire des décaissements selon leurs deux origines : (1) Exploitation (Uniquement Cotisations CNPS)  •  (2) Apport Personnel du PCA (Toutes les autres charges)`;
      tableHeaders = ['Poste de Flux & Nature Comptable', 'Origine de Financement des Fonds', 'Montant (FCFA)', 'Observations Réglementaires'];
      tableRows = [
        [
          '1. TOTAL DES ENCAISSEMENTS',
          'Ressources Exploitation (Cotisations Adhérents)',
          `+${formatFCFA(totalEncaissementsFlux)}`,
          `${nbEncaissements} versement(s) cotisations perçu(s)`,
        ],
        [
          '2. DÉCAISSEMENTS EXPLOITATION (COTISATIONS CNPS)',
          'Fonds d\'Exploitation (Uniquement Cotisations CNPS)',
          `-${formatFCFA(totalDecaissementsExploitationCnps)}`,
          `${decaissementsExploitationCnpsList.length} décaissement(s) • Droits de sécurité sociale sanctuarisés`,
        ],
        [
          '3. DÉCAISSEMENTS SUR APPORT DU PCA (AUTRES CHARGES)',
          `Apport Personnel du PCA${signataires.pca ? ` (${signataires.pca})` : ''}`,
          `-${formatFCFA(totalDecaissementsApportPca)}`,
          `${decaissementsApportPcaList.length} charge(s) de gestion prises en charge par l\'apport personnel du PCA`,
        ],
        [
          'TOTAL DES DÉCAISSEMENTS CUMULÉS (2 + 3)',
          'Exploitation CNPS + Apport PCA',
          `-${formatFCFA(totalDecaissementsFlux)}`,
          'Total des sorties de trésorerie consolidées',
        ],
        [
          'SOLDE NET DE TRÉSORERIE DE PÉRIODE (1 - DÉCAISSEMENTS)',
          'Position nette consolidée',
          `${soldeNetFlux >= 0 ? '+' : ''}${formatFCFA(soldeNetFlux)}`,
          soldeNetFlux >= 0
            ? 'Excédent net disponible'
            : 'Déficit de période (Couvert par l\'apport du PCA)',
        ],
      ];
      reportData = [
        { Rubrique: '1. TOTAL DES ENCAISSEMENTS', Origine: 'Exploitation (Cotisations)', Montant: totalEncaissementsFlux, Details: `${nbEncaissements} versements` },
        { Rubrique: '2. DÉCAISSEMENTS EXPLOITATION', Origine: 'Exploitation (Uniquement Cotisations CNPS)', Montant: -totalDecaissementsExploitationCnps, Details: `${decaissementsExploitationCnpsList.length} opérations` },
        { Rubrique: '3. DÉCAISSEMENTS SUR APPORT PCA', Origine: 'Apport Personnel du PCA', Montant: -totalDecaissementsApportPca, Details: `${decaissementsApportPcaList.length} charges` },
        { Rubrique: 'TOTAL DES DÉCAISSEMENTS', Origine: 'Exploitation CNPS + Apport PCA', Montant: -totalDecaissementsFlux, Details: 'Décaissements consolidés' },
        { Rubrique: 'SOLDE NET DE TRÉSORERIE', Origine: 'Position nette', Montant: soldeNetFlux, Details: soldeNetFlux >= 0 ? 'Excédent' : 'Déficit' },
      ];
      break;
    }
  }

  const handleExport = () => {
    if (selectedRapport === 'COTISATIONS_MENSUELLES') {
      if (etatMois) exportMonthlyReportExcel({ etat: etatMois, parametres });
    } else if (selectedRapport === 'RAPPROCHEMENT_BANQUE_CNPS') {
      exportRapprochementBanqueCnpsExcel({
        periode:
          rapprochementPeriodeMode === 'MOIS'
            ? `${selectedMois}_${selectedAnnee}`
            : 'Cumul_Global',
        parametres,
        totalFondsBanque,
        totalReserveCnps,
        soldeReelBanque,
        tauxCouverture,
        versementsList: versementsRapprochement,
        adherentsReserveList,
      });
    } else if (selectedRapport === 'ENCAISSEMENTS_DECAISSEMENTS') {
      exportEtatEncaissementsDecaissementsExcel({
        periode:
          rapprochementPeriodeMode === 'MOIS'
            ? `${selectedMois} ${selectedAnnee}`
            : 'Cumul Global',
        parametres,
        totalEncaissements: totalEncaissementsFlux,
        totalDecaissements: totalDecaissementsFlux,
        totalDecaissementsExploitationCnps,
        decaissementsExploitationDetails: decaissementsExploitationCnpsList.map((d) => ({
          date: d.date,
          piece: d.numeroPiece,
          motif: d.motif,
          montant: d.montant,
          beneficiaire: d.beneficiaire,
          mode: d.modePaiement,
        })),
        totalDecaissementsApportPca,
        decaissementsApportPcaDetails: decaissementsApportPcaList.map((d) => ({
          date: d.date,
          piece: d.numeroPiece,
          motif: d.motif,
          montant: d.montant,
          beneficiaire: d.beneficiaire,
          mode: d.modePaiement,
          categorie: d.categorie,
        })),
        soldeNet: soldeNetFlux,
      });
    } else {
      exportToExcel(reportData, `Rapport_COSITI_${selectedRapport}`);
    }
  };

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      if (selectedRapport === 'ENCAISSEMENTS_DECAISSEMENTS') {
        const ok = generateEtatEncaissementsDecaissementsPdf({
          periode:
            rapprochementPeriodeMode === 'MOIS'
              ? `${selectedMois} ${selectedAnnee}`
              : 'Cumul Global',
          totalEncaissements: totalEncaissementsFlux,
          totalDecaissements: totalDecaissementsFlux,
          totalDecaissementsExploitationCnps,
          decaissementsExploitationDetails: decaissementsExploitationCnpsList.map((d) => ({
            date: d.date,
            piece: d.numeroPiece,
            motif: d.motif,
            montant: d.montant,
            beneficiaire: d.beneficiaire,
            mode: d.modePaiement,
          })),
          totalDecaissementsApportPca,
          decaissementsApportPcaDetails: decaissementsApportPcaList.map((d) => ({
            date: d.date,
            piece: d.numeroPiece,
            motif: d.motif,
            montant: d.montant,
            beneficiaire: d.beneficiaire,
            mode: d.modePaiement,
            categorie: d.categorie,
          })),
          soldeNet: soldeNetFlux,
          parametres,
          signataires,
          fileName: `Etat_Encaissements_Decaissements_${rapprochementPeriodeMode === 'MOIS' ? `${selectedMois}_${selectedAnnee}` : 'Cumul_Global'}`,
        });

        if (ok) {
          setToastMessage(
            `L'État certifié des Encaissements et Décaissements (PDF) a été généré et téléchargé dans vos Téléchargements.`
          );
        } else {
          setToastMessage('Une erreur est survenue lors de la création du document PDF.');
        }
        return;
      }

      const ok = generateReportPdf({
        title,
        description,
        headers: tableHeaders,
        rows: tableRows,
        parametres,
        fileName: `Rapport_COSITI_${selectedRapport}`,
      });

      if (ok) {
        setToastMessage(`Le document PDF officiel "${title}" a été généré et téléchargé dans vos Téléchargements.`);
      } else {
        setToastMessage('Une erreur est survenue lors de la génération du document PDF.');
      }
    } catch (err) {
      console.error('Erreur PDF:', err);
      setToastMessage('Erreur lors de la création du document PDF.');
    } finally {
      setIsGeneratingPdf(false);
      setTimeout(() => {
        setToastMessage(null);
      }, 7000);
    }
  };

  const handlePrint = () => {
    // Ouvre immédiatement l'interface d'aperçu avant impression et d'export officiel
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Rapports & États Statistiques Réglementaires
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Génération instantanée des 10 états officiels avec export Excel, téléchargement PDF et impression
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Exporter les données du rapport en fichier Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exporter Excel</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
            title="Générer et télécharger directement le document officiel au format PDF"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'Génération...' : 'Télécharger PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={isGeneratingPdf}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Lancer l'impression et enregistrer en PDF officiel"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Imprimer / PDF</span>
          </button>

          <button
            onClick={() => setIsMySQLModalOpen(true)}
            className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Exporter l'intégralité des données actives pour une base de données MySQL (.sql / .zip)"
          >
            <Database className="w-4 h-4" />
            <span>Export MySQL</span>
          </button>
        </div>
      </div>

      {/* Notification Toast de confirmation */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-xl flex items-center justify-between text-xs shadow-xs print:hidden animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Succès : </span>
              <span>{toastMessage}</span>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Vérifiez votre dossier "Téléchargements". Le fichier PDF a été sauvegardé sur votre appareil.
              </p>
            </div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="px-2 py-1 text-emerald-800 hover:bg-emerald-200/60 rounded text-xs font-bold transition-colors ml-3"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Grille de sélection des 12 Rapports */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 print:hidden">
        {[
          { id: 'GLOBALE_ADHERENTS', label: '1. Liste globale adhérents' },
          { id: 'ADHERENTS_A_JOUR', label: '2. Adhérents à jour' },
          { id: 'ADHERENTS_NON_A_JOUR', label: '3. Adhérents non à jour' },
          { id: 'SEUIL_15000_ATTEINT', label: '4. Seuil 15 000 F atteint' },
          { id: 'A_IMMATRICULER', label: '5. À immatriculer CNPS' },
          { id: 'DEJA_IMMATRICULES', label: '6. Déjà immatriculés' },
          { id: 'DOSSIERS_A_CONSTITUER', label: '7. Dossiers Allocations' },
          { id: 'COTISATIONS_JOURNALIERES', label: '8. Cotisations du jour' },
          { id: 'COTISATIONS_MENSUELLES', label: '9. Cotisations du mois' },
          { id: 'FICHE_INDIVIDUELLE', label: '10. Fiche individuelle' },
          { id: 'RAPPROCHEMENT_BANQUE_CNPS', label: '11. Solde Réel Banque (Hors CNPS)' },
          { id: 'ENCAISSEMENTS_DECAISSEMENTS', label: '12. Encaissements & Décaissements' },
        ].map((rep) => (
          <button
            key={rep.id}
            onClick={() => setSelectedRapport(rep.id as RapportType)}
            className={`p-2.5 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer ${
              selectedRapport === rep.id
                ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs ring-2 ring-emerald-500/20'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {rep.label}
          </button>
        ))}
      </div>

      {/* Filtres contextuels selon rapport (Mois ou Adhérent) */}
      {selectedRapport === 'COTISATIONS_MENSUELLES' && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden text-xs">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-slate-700">Sélectionner la période :</span>
            <select
              value={selectedMois}
              onChange={(e) => setSelectedMois(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
            >
              {MOIS_LIST.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={selectedAnnee}
              onChange={(e) => setSelectedAnnee(parseInt(e.target.value, 10))}
              className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('etats-mensuels')}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-lg font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <CalendarRange className="w-3.5 h-3.5 text-emerald-700" />
              <span>Ouvrir l'Espace Clôture Mensuelle Dédié</span>
              <ExternalLink className="w-3 h-3 text-emerald-600" />
            </button>
          </div>
        </div>
      )}

      {/* Filtres & KPIs spécifiques au Rapport 11 : Rapprochement Banque & Réserve CNPS */}
      {selectedRapport === 'RAPPROCHEMENT_BANQUE_CNPS' && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRapprochementPeriodeMode('MOIS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rapprochementPeriodeMode === 'MOIS'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mois sélectionné
                </button>
                <button
                  type="button"
                  onClick={() => setRapprochementPeriodeMode('GLOBAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rapprochementPeriodeMode === 'GLOBAL'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cumul Global (Toutes Périodes)
                </button>
              </div>

              {rapprochementPeriodeMode === 'MOIS' && (
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedMois}
                    onChange={(e) => setSelectedMois(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                  >
                    {MOIS_LIST.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={selectedAnnee}
                    onChange={(e) => setSelectedAnnee(parseInt(e.target.value, 10))}
                    className="w-20 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
              )}

              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-slate-600">Banque :</span>
                <select
                  value={rapprochementBanqueFiltre}
                  onChange={(e) => setRapprochementBanqueFiltre(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <option value="TOUTES">Toutes les banques</option>
                  {(banques || []).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-slate-600">Base réserve :</span>
                <select
                  value={rapprochementBaseReserve}
                  onChange={(e) => setRapprochementBaseReserve(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                >
                  <option value="COTISATIONS_PERCUES">Cotisations perçues (Sanctuarisation 100%)</option>
                  <option value="SEUIL_15000">Seuil 15 000 F / Éligibles CNPS</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('etats-mensuels')}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-lg font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Landmark className="w-3.5 h-3.5 text-emerald-700" />
              <span>Voir dans Clôture Mensuelle</span>
              <ExternalLink className="w-3 h-3 text-emerald-600" />
            </button>
          </div>

          {/* 3 Cartes KPIs synthétiques */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-blue-800 block">
                Total Fonds Versés en Banque
              </span>
              <span className="text-lg font-extrabold text-blue-900 mt-0.5 block">
                {formatFCFA(totalFondsBanque)}
              </span>
              <span className="text-[10px] text-blue-700 mt-0.5 block">
                {versementsRapprochement.length} bordereau(x) de remise bancaire
              </span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">
                Déduction : Réserve Cotisations CNPS
              </span>
              <span className="text-lg font-extrabold text-amber-900 mt-0.5 block">
                - {formatFCFA(totalReserveCnps)}
              </span>
              <span className="text-[10px] text-amber-700 mt-0.5 block">
                {adherentsReserveList.length} adhérent(s) • Fonds sanctuarisés
              </span>
            </div>

            <div className={`p-3 border rounded-xl ${
              soldeReelBanque >= 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <span className="text-[10px] uppercase font-bold block">
                Solde Réel Disponible en Banque
              </span>
              <span className="text-lg font-extrabold mt-0.5 block">
                {formatFCFA(soldeReelBanque)}
              </span>
              <span className="text-[10px] font-semibold mt-0.5 block">
                {soldeReelBanque >= 0
                  ? `Trésorerie nette libre • Couverture CNPS : ${tauxCouverture.toFixed(1)}%`
                  : `Déficit de couverture de la réserve CNPS`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filtres & KPIs spécifiques au Rapport 12 : Encaissements & Décaissements (Exploitation vs Apport PCA) */}
      {selectedRapport === 'ENCAISSEMENTS_DECAISSEMENTS' && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRapprochementPeriodeMode('MOIS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rapprochementPeriodeMode === 'MOIS'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mois sélectionné
                </button>
                <button
                  type="button"
                  onClick={() => setRapprochementPeriodeMode('GLOBAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rapprochementPeriodeMode === 'GLOBAL'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cumul Global (Toutes Périodes)
                </button>
              </div>

              {rapprochementPeriodeMode === 'MOIS' && (
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedMois}
                    onChange={(e) => setSelectedMois(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                  >
                    {MOIS_LIST.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={selectedAnnee}
                    onChange={(e) => setSelectedAnnee(parseInt(e.target.value, 10))}
                    className="w-20 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadPdf}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                title="Exporter immédiatement le document officiel au format PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger PDF Officiel</span>
              </button>
            </div>
          </div>

          {/* Note explicative des deux origines */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 flex items-start space-x-2.5">
            <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Gouvernance financière des décaissements :</span>
              <p className="mt-0.5 text-[11px] text-amber-800">
                Les décaissements sont scindés en deux origines de provenance des fonds : 
                <strong> (1) Exploitation</strong> (UNIQUEMENT les montants relatifs aux cotisations CNPS) et 
                <strong> (2) Apport personnel du PCA</strong> (l'ensemble des autres dépenses et charges d'exploitation de la coopérative est pris en charge personnellement par le PCA{signataires.pca ? ` ${signataires.pca}` : ''}).
              </p>
            </div>
          </div>

          {/* 3 Cartes KPIs synthétiques */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                Total Encaissements
              </span>
              <span className="text-lg font-extrabold text-emerald-900 mt-0.5 block">
                + {formatFCFA(totalEncaissementsFlux)}
              </span>
              <span className="text-[10px] text-emerald-700 mt-0.5 block">
                {nbEncaissements} versement(s) cotisations perçu(s)
              </span>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-rose-800">
                  Total Décaissements
                </span>
                <span className="text-base font-extrabold text-rose-900">
                  - {formatFCFA(totalDecaissementsFlux)}
                </span>
              </div>
              <div className="text-[10px] text-slate-600 pt-1 border-t border-rose-200/60 space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-blue-800 font-semibold">• Exploitation (CNPS) :</span>
                  <span className="font-bold text-blue-900">- {formatFCFA(totalDecaissementsExploitationCnps)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-800 font-semibold">• Apport du PCA :</span>
                  <span className="font-bold text-amber-900">- {formatFCFA(totalDecaissementsApportPca)}</span>
                </div>
              </div>
            </div>

            <div className={`p-3 border rounded-xl ${
              soldeNetFlux >= 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <span className="text-[10px] uppercase font-bold block">
                Solde Net de Trésorerie
              </span>
              <span className="text-lg font-extrabold mt-0.5 block">
                {soldeNetFlux >= 0 ? '+' : ''}{formatFCFA(soldeNetFlux)}
              </span>
              <span className="text-[10px] font-semibold mt-0.5 block">
                {soldeNetFlux >= 0
                  ? 'Excédent net consolidé'
                  : 'Déficit pris en charge par l\'apport du PCA'}
              </span>
            </div>
          </div>
        </div>
      )}

      {selectedRapport === 'FICHE_INDIVIDUELLE' && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4 print:hidden text-xs">
          <span className="font-bold text-slate-700">Sélectionner l'adhérent :</span>
          <select
            value={selectedAdherentId}
            onChange={(e) => setSelectedAdherentId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium max-w-md"
          >
            {adherents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.matricule} — {a.nom} {a.prenom} ({a.profession})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Rendu imprimable du rapport */}
      <div id="rapport-print-area" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        {/* En-tête officiel imprimable */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white font-black text-lg flex items-center justify-center shrink-0">
                {parametres?.sigle ? parametres.sigle.slice(0, 1) : 'C'}
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono font-extrabold text-emerald-800 tracking-wider block">
                  {parametres?.nomOrganisation || 'COSITI'} ({parametres?.sigle || 'COSITI'})
                </span>
                <h2 className="text-base font-extrabold text-slate-900 mt-0.5">{title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                <div className="text-[10px] text-slate-400 mt-1 hidden print:block">
                  {parametres?.adresse || 'Abidjan, Côte d\'Ivoire'} • Tél : {parametres?.telephone || '+225 05 45 67 89 01'} • {parametres?.email || 'contact@cositi-ci.org'}
                </div>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400 shrink-0">
              <div className="font-semibold text-slate-600">Document Certifié Conforme</div>
              <div>Édité le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="font-bold text-emerald-700">Total lignes : {tableRows.length}</div>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                {tableHeaders.map((h, i) => (
                  <th key={i} className="px-3 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={tableHeaders.length} className="p-8 text-center text-slate-400">
                    Aucun élément à afficher pour ce rapport.
                  </td>
                </tr>
              ) : (
                tableRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-slate-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Détails spécifiques au Rapport 12 : Décaissements Exploitation vs Apport PCA */}
        {selectedRapport === 'ENCAISSEMENTS_DECAISSEMENTS' && (
          <div className="space-y-6 pt-4 border-t border-slate-200">
            {/* Section A : Exploitation CNPS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-blue-50/80 px-3 py-2 rounded-xl border border-blue-200">
                <span className="font-extrabold text-blue-900 text-xs flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                  <span>Section A : Décaissements d'Exploitation — Uniquement Cotisations CNPS ({decaissementsExploitationCnpsList.length})</span>
                </span>
                <span className="font-extrabold text-blue-900 text-xs">
                  Total : {formatFCFA(totalDecaissementsExploitationCnps)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">N° Pièce</th>
                      <th className="px-3 py-2">Motif / Reversement CNPS</th>
                      <th className="px-3 py-2">Bénéficiaire</th>
                      <th className="px-3 py-2">Mode</th>
                      <th className="px-3 py-2 text-right">Montant Décaissé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {decaissementsExploitationCnpsList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-slate-400 italic">
                          Aucun décaissement relatif aux cotisations CNPS enregistré sur cette période.
                        </td>
                      </tr>
                    ) : (
                      decaissementsExploitationCnpsList.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-700">{formatDateShort(d.date)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{d.numeroPiece || '—'}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">{d.motif}</td>
                          <td className="px-3 py-2 text-slate-700">{d.beneficiaire || 'CNPS'}</td>
                          <td className="px-3 py-2 text-slate-600">{d.modePaiement}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-blue-800">
                            {formatFCFA(d.montant)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section B : Apport Personnel du PCA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-amber-50/80 px-3 py-2 rounded-xl border border-amber-200">
                <span className="font-extrabold text-amber-900 text-xs flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
                  <span>Section B : Décaissements sur Apport Personnel du PCA — Tout le reste ({decaissementsApportPcaList.length})</span>
                </span>
                <span className="font-extrabold text-amber-900 text-xs">
                  Total : {formatFCFA(totalDecaissementsApportPca)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">N° Pièce</th>
                      <th className="px-3 py-2">Catégorie</th>
                      <th className="px-3 py-2">Motif / Charge</th>
                      <th className="px-3 py-2">Bénéficiaire</th>
                      <th className="px-3 py-2">Mode</th>
                      <th className="px-3 py-2 text-right">Montant Décaissé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {decaissementsApportPcaList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 text-center text-slate-400 italic">
                          Aucune autre charge de gestion enregistrée sur apport PCA sur cette période.
                        </td>
                      </tr>
                    ) : (
                      decaissementsApportPcaList.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-700">{formatDateShort(d.date)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{d.numeroPiece || '—'}</td>
                          <td className="px-3 py-2 text-slate-600 font-semibold">{d.categorie}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">{d.motif}</td>
                          <td className="px-3 py-2 text-slate-700">{d.beneficiaire}</td>
                          <td className="px-3 py-2 text-slate-600">{d.modePaiement}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-amber-800">
                            {formatFCFA(d.montant)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Détails spécifiques au Rapport 11 : Bordereaux Versements & Réserve CNPS */}
        {selectedRapport === 'RAPPROCHEMENT_BANQUE_CNPS' && (
          <div className="space-y-6 pt-4 border-t border-slate-200">
            {/* Bordereaux de versements */}
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-blue-50/80 px-3 py-2 rounded-xl border border-blue-200">
                <span className="font-extrabold text-blue-900 text-xs">
                  1. Bordereaux de Remise des Fonds Versés en Banque ({versementsRapprochement.length})
                </span>
                <span className="font-extrabold text-blue-900 text-xs">
                  Total : {formatFCFA(totalFondsBanque)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Banque Partenaire</th>
                      <th className="px-3 py-2">N° Bordereau</th>
                      <th className="px-3 py-2">N° Compte</th>
                      <th className="px-3 py-2">Déposant</th>
                      <th className="px-3 py-2 text-right">Montant Versé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {versementsRapprochement.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-slate-400 italic">
                          Aucun versement bancaire enregistré sur cette sélection.
                        </td>
                      </tr>
                    ) : (
                      versementsRapprochement.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-700">{formatDateShort(v.date)}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">{v.banque}</td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-700">{v.numeroBordereau}</td>
                          <td className="px-3 py-2 font-mono text-slate-500">{v.numeroCompte || '—'}</td>
                          <td className="px-3 py-2 text-slate-600">{v.deposant}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-blue-800">
                            {formatFCFA(v.montant)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Réserve Nominative CNPS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-amber-50/80 px-3 py-2 rounded-xl border border-amber-200">
                <span className="font-extrabold text-amber-900 text-xs">
                  2. Ventilation Nominative de la Réserve Cotisations CNPS ({adherentsReserveList.length} adhérents)
                </span>
                <span className="font-extrabold text-amber-900 text-xs">
                  Total : {formatFCFA(totalReserveCnps)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Matricule</th>
                      <th className="px-3 py-2">Nom & Prénoms</th>
                      <th className="px-3 py-2">N° CNPS</th>
                      <th className="px-3 py-2">Statut CNPS</th>
                      <th className="px-3 py-2 text-right">Cotisations</th>
                      <th className="px-3 py-2 text-right">Réserve CNPS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adherentsReserveList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-slate-400 italic">
                          Aucun montant de cotisation affecté à la réserve CNPS pour cette période.
                        </td>
                      </tr>
                    ) : (
                      adherentsReserveList.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono font-bold text-slate-900">{a.matricule}</td>
                          <td className="px-3 py-2 font-bold text-slate-800">{a.nomComplet}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{a.numeroCnps || 'En attente'}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {a.statutCnps}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-700">
                            {formatFCFA(a.cotisationsPercues)}
                          </td>
                          <td className="px-3 py-2 text-right font-extrabold text-amber-800">
                            {formatFCFA(a.montantReserve)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal d'Aperçu avant Impression & Export Officiel A4 */}
      <RapportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={title}
        description={description}
        tableHeaders={tableHeaders}
        tableRows={tableRows}
        reportData={reportData}
        selectedRapport={selectedRapport}
        parametres={parametres}
      />

      {/* Modal d'Exportation Base de Données MySQL */}
      <MySQLExportModal
        isOpen={isMySQLModalOpen}
        onClose={() => setIsMySQLModalOpen(false)}
      />
    </div>
  );
};
