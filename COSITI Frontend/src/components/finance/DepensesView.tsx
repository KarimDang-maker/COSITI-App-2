import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import {
  DepenseCourante,
  VersementBancaire,
  FraisMobileMoney,
  CategorieDepense,
  CATEGORIES_DEPENSES,
  BANQUES_PARTENAIRES,
  OPERATEURS_MOBILE,
  OperateurMobile,
  TypeFraisMobileMoney,
} from '../../types';
import {
  Landmark,
  Receipt,
  Smartphone,
  Plus,
  Search,
  Trash2,
  Edit3,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  X,
  AlertCircle,
  Building2,
  Wallet,
  Eye,
  ArrowRight,
  History,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { BanquesModal } from './BanquesModal';
import { VersementDetailModal } from './VersementDetailModal';
import { PaieView } from './PaieView';
import { useApiQuery } from '../../api/hooks';
import { ExcelEchangeModal } from '../ExcelEchangeModal';
import { ControleIntegritePanel } from './ControleIntegritePanel';
import type { PointArret, Rapprochement } from '../../api/models';
import { exportRapprochementBanqueCnpsExcel } from '../../utils/exportUtils';
import { generateEtatEncaissementsDecaissementsPdf } from '../../utils/pdfReportGenerator';

interface DepensesViewProps {
  onRequestPinConfirm?: (action: (pin: string) => void, title: string, desc: string) => void;
}

export const DepensesView: React.FC<DepensesViewProps> = ({ onRequestPinConfirm }) => {
  const {
    depenses,
    versements,
    fraisMobileMoney,
    cotisations,
    currentUser,
    addDepense,
    updateDepense,
    deleteDepense,
    addVersement,
    updateVersement,
    deleteVersement,
    addFraisMobileMoney,
    updateFraisMobileMoney,
    deleteFraisMobileMoney,
    adherents,
    banques,
    addBanque,
    parametres,
    finances,
    suiviVersements,
    signataires,
  } = useApp();
  const dialog = useDialog();

  const activeBanques = (banques && banques.length > 0) ? banques : BANQUES_PARTENAIRES;

  // Modales spécialisées
  const [isBanquesModalOpen, setIsBanquesModalOpen] = useState(false);
  const [selectedVersementDetail, setSelectedVersementDetail] = useState<VersementBancaire | null>(null);
  const [isQuickAddBankOpen, setIsQuickAddBankOpen] = useState(false);
  const [quickBankName, setQuickBankName] = useState('');

  // Onglet actif : 'depenses' | 'versements' | 'mobile_money' | 'paie' | 'bilan'
  const [activeSubTab, setActiveSubTab] = useState<'depenses' | 'versements' | 'mobile_money' | 'paie' | 'bilan'>('depenses');
  const [isExcelOpen, setIsExcelOpen] = useState(false);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState<string>('all');
  const [selectedBanque, setSelectedBanque] = useState<string>('all');
  const [selectedOperateur, setSelectedOperateur] = useState<string>('all');

  // Modal Dépense State
  const [isDepenseModalOpen, setIsDepenseModalOpen] = useState(false);
  const [editingDepense, setEditingDepense] = useState<DepenseCourante | null>(null);
  const [depenseForm, setDepenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    montant: '',
    motif: '',
    categorie: CATEGORIES_DEPENSES[0] || 'Fournitures de bureau & Imprimés',
    beneficiaire: '',
    modePaiement: 'Espèces / Caisse' as DepenseCourante['modePaiement'],
    numeroPiece: '',
    statut: 'Payé' as DepenseCourante['statut'],
    observations: '',
  });

  // Modal Versement Bancaire State
  const [isVersementModalOpen, setIsVersementModalOpen] = useState(false);
  const [editingVersement, setEditingVersement] = useState<VersementBancaire | null>(null);
  const [versementForm, setVersementForm] = useState({
    date: new Date().toISOString().split('T')[0],
    banque: activeBanques[0] || 'BICICI',
    numeroCompte: 'CI008 01112 00012345601 45',
    numeroBordereau: '',
    montant: '',
    sourceFonds: 'Recettes Cotisations Adhérents' as VersementBancaire['sourceFonds'],
    deposant: currentUser?.nom || 'DAF COSITI',
    statut: 'Validé' as VersementBancaire['statut'],
    observations: '',

    // Repère du versement précédent (où s'est arrêté le versement précédent)
    arretPrecedentDate: '',
    arretPrecedentNom: '',
    arretPrecedentMatricule: '',
    arretPrecedentMontant: '',
    arretPrecedentBordereau: '',
    arretPrecedentCotisationId: '',

    // Point d'arrêt de ce versement (dernière cotisation couverte)
    arretCotisationDate: new Date().toISOString().split('T')[0],
    arretCotisationNom: '',
    arretCotisationMatricule: '',
    arretCotisationMontant: '',
    arretCotisationId: '',
    arretCotisationRef: '',
    selectedCotisationId: '',
  });

  // Modal Frais Mobile Money State
  const [isFraisModalOpen, setIsFraisModalOpen] = useState(false);
  const [editingFrais, setEditingFrais] = useState<FraisMobileMoney | null>(null);
  const [fraisForm, setFraisForm] = useState({
    date: new Date().toISOString().split('T')[0],
    operateur: 'Orange Money' as OperateurMobile,
    montantTransaction: '',
    fraisPreleves: '',
    typeFrais: 'Frais de retrait marchand' as TypeFraisMobileMoney,
    referenceTransaction: '',
    adherentConcerne: '',
    observations: '',
  });

  // TOUS les totaux, soldes et ventilations viennent du serveur (GET /finances/synthese, /rapports/rapprochement,
  // /versements/suivi/en-attente) : aucun calcul financier n'est fait dans le navigateur.
  const { data: rapprochementGlobal } = useApiQuery<Rapprochement>('/rapports/rapprochement', { periode: 'GLOBAL' });
  const g = finances?.global;
  const totalDepenses = g?.depenses.total ?? 0;
  const totalVersements = g?.versements.total ?? 0;
  const totalFraisOperateurs = g?.fraisMobileMoney.totalFrais ?? 0;
  const totalCotisations = g?.cotisations.total ?? 0;
  const cotisationsMobileMoney = g?.cotisations.mobileMoney ?? 0;

  // Suivi chronologique des versements : point d'arrêt du dernier versement et cotisations restant à verser
  const dernierPointArret =
    suiviVersements && !suiviVersements.reperePrecedent.estPremierVersement ? suiviVersements.reperePrecedent : null;
  const cotisationsEnAttenteVersement = {
    cotisations: suiviVersements?.cotisations ?? [],
    nombre: suiviVersements?.nombre ?? 0,
    totalMontant: suiviVersements?.totalMontant ?? 0,
  };

  // Cotisations par ordre chronologique (liste déroulante du point d'arrêt)
  const cotisationsTriees = useMemo(
    () => [...cotisations].sort((a, b) => a.datePaiement.localeCompare(b.datePaiement) || String(a.createdAt || '').localeCompare(String(b.createdAt || ''))),
    [cotisations]
  );

  // Réserve cotisations CNPS & solde réel en banque (solde réel = fonds versés − réserve)
  const totalReserveCnps = g?.reserveCnps.totalReserve ?? 0;
  const soldeReelBanque = g?.reserveCnps.soldeReelBanque ?? 0;
  const tauxCouvertureCnps = g?.reserveCnps.tauxCouverture ?? 0;

  // Ventilation des décaissements selon les deux origines (règle appliquée et enregistrée par le serveur) :
  // 1. Exploitation : uniquement les montants relatifs aux cotisations CNPS — 2. Apport personnel du PCA : le reste
  const decaissementsExploitationCnps = useMemo(
    () => depenses.filter((d) => d.origineFonds === 'Exploitation (Cotisations CNPS)'),
    [depenses]
  );
  const decaissementsApportPca = useMemo(
    () => depenses.filter((d) => d.origineFonds === 'Apport personnel du PCA'),
    [depenses]
  );
  const totalDecaissementsExploitationCnps = g?.depenses.exploitationCnps.total ?? 0;
  const totalDecaissementsApportPca = g?.depenses.apportPca.total ?? 0;
  const adherentsReserveList = rapprochementGlobal?.reserveCnps.adherents ?? [];

  const handleExportRapprochementExcelFromDaf = () => {
    exportRapprochementBanqueCnpsExcel({
      periode: 'Cumul_Global',
      parametres,
      totalFondsBanque: totalVersements || 0,
      totalReserveCnps,
      soldeReelBanque,
      tauxCouverture: tauxCouvertureCnps,
      versementsList: versements,
      adherentsReserveList,
    });
  };

  const handleExportEncaissementsDecaissementsPdfFromDaf = () => {
    generateEtatEncaissementsDecaissementsPdf({
      periode: 'Exercice Global Consolidé',
      totalEncaissements: totalCotisations,
      totalDecaissements: totalDepenses,
      totalDecaissementsExploitationCnps,
      decaissementsExploitationDetails: decaissementsExploitationCnps.map((d) => ({
        date: d.date,
        piece: d.numeroPiece,
        motif: d.motif,
        montant: Number(d.montant) || 0,
        beneficiaire: d.beneficiaire,
        mode: d.modePaiement,
      })),
      totalDecaissementsApportPca,
      decaissementsApportPcaDetails: decaissementsApportPca.map((d) => ({
        date: d.date,
        piece: d.numeroPiece,
        motif: d.motif,
        montant: Number(d.montant) || 0,
        beneficiaire: d.beneficiaire,
        mode: d.modePaiement,
        categorie: d.categorie,
      })),
      soldeNet: totalCotisations - totalDepenses,
      parametres,
      signataires,
      fileName: 'Etat_Encaissements_Decaissements_Consolide',
    });
  };

  // Handlers Dépenses
  const handleOpenNewDepense = () => {
    setEditingDepense(null);
    setDepenseForm({
      date: new Date().toISOString().split('T')[0],
      montant: '',
      motif: '',
      categorie: CATEGORIES_DEPENSES[0],
      beneficiaire: '',
      modePaiement: 'Espèces / Caisse',
      numeroPiece: `DEP-${Date.now().toString().slice(-4)}`,
      statut: 'Payé',
      observations: '',
    });
    setIsDepenseModalOpen(true);
  };

  const handleEditDepense = (dep: DepenseCourante) => {
    setEditingDepense(dep);
    setDepenseForm({
      date: dep.date,
      montant: dep.montant.toString(),
      motif: dep.motif,
      categorie: dep.categorie,
      beneficiaire: dep.beneficiaire,
      modePaiement: dep.modePaiement,
      numeroPiece: dep.numeroPiece || '',
      statut: dep.statut,
      observations: dep.observations || '',
    });
    setIsDepenseModalOpen(true);
  };

  const handleSaveDepense = async (e: React.FormEvent) => {
    e.preventDefault();
    const montantNum = Number(depenseForm.montant);
    if (!montantNum || montantNum <= 0) {
      await dialog.alert({
        title: 'Montant invalide',
        message: 'Veuillez saisir un montant valide supérieur à 0.',
        variant: 'warning',
      });
      return;
    }
    if (!depenseForm.motif.trim()) {
      await dialog.alert({
        title: 'Motif requis',
        message: 'Veuillez renseigner le motif de la dépense.',
        variant: 'warning',
      });
      return;
    }
    if (!depenseForm.beneficiaire.trim()) {
      await dialog.alert({
        title: 'Bénéficiaire requis',
        message: 'Veuillez spécifier le bénéficiaire de la dépense.',
        variant: 'warning',
      });
      return;
    }

    if (editingDepense) {
      updateDepense(editingDepense.id, {
        date: depenseForm.date,
        montant: montantNum,
        motif: depenseForm.motif.trim(),
        categorie: depenseForm.categorie as CategorieDepense,
        beneficiaire: depenseForm.beneficiaire.trim(),
        modePaiement: depenseForm.modePaiement,
        numeroPiece: depenseForm.numeroPiece.trim() || editingDepense.numeroPiece,
        statut: depenseForm.statut,
        observations: depenseForm.observations.trim() || undefined,
      });
    } else {
      addDepense({
        date: depenseForm.date,
        montant: montantNum,
        motif: depenseForm.motif.trim(),
        categorie: depenseForm.categorie as CategorieDepense,
        beneficiaire: depenseForm.beneficiaire.trim(),
        modePaiement: depenseForm.modePaiement,
        numeroPiece: depenseForm.numeroPiece.trim() || `DEP-${Date.now().toString().slice(-4)}`,
        statut: depenseForm.statut,
        enregistrePar: currentUser?.nom || 'DAF',
        observations: depenseForm.observations.trim() || undefined,
      });
    }
    setIsDepenseModalOpen(false);
  };

  const handleDeleteDepense = async (dep: DepenseCourante) => {
    const doDelete = async (pin: string = '0000') => {
      const res = await deleteDepense(dep.id, pin);
      if (!res.success) {
        dialog.alert({
          title: 'Erreur',
          message: res.error || 'Impossible de supprimer cette dépense.',
          variant: 'error',
        });
      }
    };

    if (onRequestPinConfirm) {
      onRequestPinConfirm(
        doDelete,
        'Suppression de dépense (Code 0000)',
        `Confirmez-vous la suppression de la dépense de ${dep.montant.toLocaleString('fr-FR')} FCFA (${dep.motif}) ?`
      );
    } else {
      const confirmed = await dialog.confirm({
        title: 'Supprimer la dépense',
        message: `Voulez-vous vraiment supprimer la dépense de ${dep.montant.toLocaleString('fr-FR')} FCFA (${dep.motif}) ?`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        variant: 'danger',
        icon: 'trash',
        details: [
          { label: 'Motif', value: dep.motif },
          { label: 'Montant', value: `${dep.montant.toLocaleString('fr-FR')} FCFA` },
          { label: 'Bénéficiaire', value: dep.beneficiaire },
        ],
      });
      if (confirmed) {
        doDelete();
      }
    }
  };

  // Handlers Versements
  const handleOpenNewVersement = () => {
    const pointPrecedent: PointArret = suiviVersements?.reperePrecedent ?? { estPremierVersement: true };
    const enAttente = cotisationsEnAttenteVersement;

    const derniereCotis = enAttente.cotisations.length > 0
      ? enAttente.cotisations[enAttente.cotisations.length - 1]
      : null;

    setEditingVersement(null);
    setVersementForm({
      date: new Date().toISOString().split('T')[0],
      banque: activeBanques[0] || 'BICICI',
      numeroCompte: 'CI008 01112 00012345601 45',
      numeroBordereau: `BORD-${Date.now().toString().slice(-5)}`,
      montant: enAttente.totalMontant > 0 ? enAttente.totalMontant.toString() : '',
      sourceFonds: 'Recettes Cotisations Adhérents',
      deposant: currentUser?.nom || 'DAF COSITI',
      statut: 'Validé',
      observations: '',

      // Repère du versement précédent
      arretPrecedentDate: pointPrecedent.date || '',
      arretPrecedentNom: pointPrecedent.nom || '',
      arretPrecedentMatricule: pointPrecedent.matricule || '',
      arretPrecedentMontant: pointPrecedent.montant ? pointPrecedent.montant.toString() : '',
      arretPrecedentBordereau: pointPrecedent.bordereau || '',
      arretPrecedentCotisationId: pointPrecedent.cotisationId || '',

      // Arrêt de ce versement (dernière cotisation)
      arretCotisationDate: derniereCotis?.datePaiement || new Date().toISOString().split('T')[0],
      arretCotisationNom: derniereCotis?.adherentNomPrenom || '',
      arretCotisationMatricule: derniereCotis?.matricule || '',
      arretCotisationMontant: derniereCotis?.montant ? derniereCotis.montant.toString() : '',
      arretCotisationId: derniereCotis?.id || '',
      arretCotisationRef: derniereCotis?.reference || '',
      selectedCotisationId: derniereCotis?.id || '',
    });
    setIsVersementModalOpen(true);
  };

  const handleEditVersement = (vrs: VersementBancaire) => {
    const reperePrecedent: PointArret = vrs.reperes?.precedent ?? {};
    const repereActuel: PointArret = vrs.reperes?.actuel ?? {};

    setEditingVersement(vrs);
    setVersementForm({
      date: vrs.date,
      banque: vrs.banque,
      numeroCompte: vrs.numeroCompte || '',
      numeroBordereau: vrs.numeroBordereau,
      montant: vrs.montant.toString(),
      sourceFonds: vrs.sourceFonds,
      deposant: vrs.deposant,
      statut: vrs.statut,
      observations: vrs.observations || '',

      // Repère précédent
      arretPrecedentDate: reperePrecedent.date || '',
      arretPrecedentNom: reperePrecedent.nom || '',
      arretPrecedentMatricule: reperePrecedent.matricule || '',
      arretPrecedentMontant: reperePrecedent.montant ? reperePrecedent.montant.toString() : '',
      arretPrecedentBordereau: reperePrecedent.bordereau || '',
      arretPrecedentCotisationId: reperePrecedent.cotisationId || '',

      // Arrêt de ce versement
      arretCotisationDate: repereActuel.date || '',
      arretCotisationNom: repereActuel.nom || '',
      arretCotisationMatricule: repereActuel.matricule || '',
      arretCotisationMontant: repereActuel.montant ? repereActuel.montant.toString() : '',
      arretCotisationId: repereActuel.cotisationId || '',
      arretCotisationRef: repereActuel.reference || '',
      selectedCotisationId: repereActuel.cotisationId || '',
    });
    setIsVersementModalOpen(true);
  };

  // Sélection rapide de la cotisation d'arrêt
  const handleSelectCotisationArret = (cotisId: string) => {
    const target = cotisations.find((c) => c.id === cotisId);
    if (!target) return;

    setVersementForm((prev) => ({
      ...prev,
      selectedCotisationId: target.id,
      arretCotisationDate: target.datePaiement,
      arretCotisationNom: target.adherentNomPrenom,
      arretCotisationMatricule: target.matricule,
      arretCotisationMontant: target.montant.toString(),
      arretCotisationId: target.id,
      arretCotisationRef: target.reference || '',
    }));
  };

  // Ajout direct d'une banque depuis la modale de versement
  const handleQuickAddBank = async () => {
    const nom = quickBankName.trim();
    if (!nom) return;
    const res = await addBanque(nom);
    if (res.success) {
      setVersementForm((prev) => ({ ...prev, banque: nom }));
      setQuickBankName('');
      setIsQuickAddBankOpen(false);
    } else {
      dialog.alert({
        title: 'Erreur',
        message: res.error || "Impossible d'ajouter la banque.",
        variant: 'warning',
      });
    }
  };

  const handleSaveVersement = async (e: React.FormEvent) => {
    e.preventDefault();
    const montantNum = Number(versementForm.montant);
    if (!montantNum || montantNum <= 0) {
      await dialog.alert({
        title: 'Montant invalide',
        message: 'Veuillez saisir un montant de versement valide supérieur à 0.',
        variant: 'warning',
      });
      return;
    }
    if (!versementForm.numeroBordereau.trim()) {
      await dialog.alert({
        title: 'Bordereau requis',
        message: 'Veuillez renseigner le numéro de bordereau bancaire.',
        variant: 'warning',
      });
      return;
    }

    const payload = {
      date: versementForm.date,
      banque: versementForm.banque,
      numeroCompte: versementForm.numeroCompte.trim() || undefined,
      numeroBordereau: versementForm.numeroBordereau.trim(),
      montant: montantNum,
      sourceFonds: versementForm.sourceFonds,
      deposant: versementForm.deposant.trim() || (currentUser?.nom ?? 'DAF'),
      statut: versementForm.statut,
      observations: versementForm.observations.trim() || undefined,

      // Repère précédent
      arretPrecedentDate: versementForm.arretPrecedentDate.trim() || undefined,
      arretPrecedentNom: versementForm.arretPrecedentNom.trim() || undefined,
      arretPrecedentMatricule: versementForm.arretPrecedentMatricule.trim() || undefined,
      arretPrecedentMontant: Number(versementForm.arretPrecedentMontant) || undefined,
      arretPrecedentBordereau: versementForm.arretPrecedentBordereau.trim() || undefined,
      arretPrecedentCotisationId: versementForm.arretPrecedentCotisationId.trim() || undefined,

      // Arrêt de ce versement
      arretCotisationDate: versementForm.arretCotisationDate.trim() || undefined,
      arretCotisationNom: versementForm.arretCotisationNom.trim() || undefined,
      arretCotisationMatricule: versementForm.arretCotisationMatricule.trim() || undefined,
      arretCotisationMontant: Number(versementForm.arretCotisationMontant) || undefined,
      arretCotisationId: versementForm.arretCotisationId.trim() || undefined,
      arretCotisationRef: versementForm.arretCotisationRef.trim() || undefined,
    };

    if (editingVersement) {
      updateVersement(editingVersement.id, payload);
    } else {
      addVersement({
        ...payload,
        enregistrePar: currentUser?.nom || 'DAF',
      });
    }
    setIsVersementModalOpen(false);
  };

  const handleDeleteVersement = async (vrs: VersementBancaire) => {
    const doDelete = async (pin: string = '0000') => {
      const res = await deleteVersement(vrs.id, pin);
      if (!res.success) {
        dialog.alert({
          title: 'Erreur',
          message: res.error || 'Impossible de supprimer ce versement.',
          variant: 'error',
        });
      }
    };

    if (onRequestPinConfirm) {
      onRequestPinConfirm(
        doDelete,
        'Suppression versement bancaire (Code 0000)',
        `Supprimer le versement de ${vrs.montant.toLocaleString('fr-FR')} FCFA sur ${vrs.banque} (Bordereau ${vrs.numeroBordereau}) ?`
      );
    } else {
      const confirmed = await dialog.confirm({
        title: 'Supprimer le versement bancaire',
        message: `Confirmez-vous la suppression du versement de ${vrs.montant.toLocaleString('fr-FR')} FCFA sur le compte ${vrs.banque} ?`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        variant: 'danger',
        icon: 'trash',
        details: [
          { label: 'Banque', value: vrs.banque },
          { label: 'Bordereau', value: vrs.numeroBordereau },
          { label: 'Montant', value: `${vrs.montant.toLocaleString('fr-FR')} FCFA` },
        ],
      });
      if (confirmed) {
        doDelete();
      }
    }
  };

  // Handlers Frais Mobile Money
  const handleOpenNewFrais = () => {
    setEditingFrais(null);
    setFraisForm({
      date: new Date().toISOString().split('T')[0],
      operateur: 'Orange Money',
      montantTransaction: '',
      fraisPreleves: '',
      typeFrais: 'Frais de retrait marchand',
      referenceTransaction: `TX-${Date.now().toString().slice(-6)}`,
      adherentConcerne: '',
      observations: '',
    });
    setIsFraisModalOpen(true);
  };

  const handleEditFrais = (f: FraisMobileMoney) => {
    setEditingFrais(f);
    setFraisForm({
      date: f.date,
      operateur: f.operateur,
      montantTransaction: f.montantTransaction.toString(),
      fraisPreleves: f.fraisPreleves.toString(),
      typeFrais: f.typeFrais,
      referenceTransaction: f.referenceTransaction,
      adherentConcerne: f.adherentConcerne || '',
      observations: f.observations || '',
    });
    setIsFraisModalOpen(true);
  };

  const handleSaveFrais = async (e: React.FormEvent) => {
    e.preventDefault();
    const brut = Number(fraisForm.montantTransaction);
    const frais = Number(fraisForm.fraisPreleves);
    if (!brut || brut <= 0) {
      await dialog.alert({
        title: 'Montant requis',
        message: 'Veuillez saisir le montant brut de la transaction.',
        variant: 'warning',
      });
      return;
    }
    if (frais < 0 || frais > brut) {
      await dialog.alert({
        title: 'Frais invalides',
        message: 'Les frais prélevés ne peuvent pas dépasser le montant total de la transaction.',
        variant: 'warning',
      });
      return;
    }

    const net = brut - frais;

    if (editingFrais) {
      updateFraisMobileMoney(editingFrais.id, {
        date: fraisForm.date,
        operateur: fraisForm.operateur,
        montantTransaction: brut,
        fraisPreleves: frais,
        montantNet: net,
        typeFrais: fraisForm.typeFrais,
        referenceTransaction: fraisForm.referenceTransaction.trim() || editingFrais.referenceTransaction,
        adherentConcerne: fraisForm.adherentConcerne.trim() || undefined,
        observations: fraisForm.observations.trim() || undefined,
      });
    } else {
      addFraisMobileMoney({
        date: fraisForm.date,
        operateur: fraisForm.operateur,
        montantTransaction: brut,
        fraisPreleves: frais,
        montantNet: net,
        typeFrais: fraisForm.typeFrais,
        referenceTransaction: fraisForm.referenceTransaction.trim() || `TX-${Date.now().toString().slice(-6)}`,
        adherentConcerne: fraisForm.adherentConcerne.trim() || undefined,
        enregistrePar: currentUser?.nom || 'DAF',
        observations: fraisForm.observations.trim() || undefined,
      });
    }
    setIsFraisModalOpen(false);
  };

  const handleDeleteFrais = async (f: FraisMobileMoney) => {
    const doDelete = async (pin: string = '0000') => {
      const res = await deleteFraisMobileMoney(f.id, pin);
      if (!res.success) {
        dialog.alert({
          title: 'Erreur',
          message: res.error || 'Impossible de supprimer ces frais.',
          variant: 'error',
        });
      }
    };

    if (onRequestPinConfirm) {
      onRequestPinConfirm(
        doDelete,
        'Suppression de frais opérateur (Code 0000)',
        `Supprimer la ligne de frais de ${f.fraisPreleves.toLocaleString('fr-FR')} FCFA pour la transaction ${f.referenceTransaction} (${f.operateur}) ?`
      );
    } else {
      const confirmed = await dialog.confirm({
        title: 'Suppression Frais Mobile Money',
        message: `Supprimer la ligne de frais de ${f.fraisPreleves.toLocaleString('fr-FR')} FCFA (${f.operateur}) ?`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        variant: 'danger',
        icon: 'trash',
        details: [
          { label: 'Opérateur', value: f.operateur },
          { label: 'Réf Transaction', value: f.referenceTransaction },
          { label: 'Frais Prélevés', value: `${f.fraisPreleves.toLocaleString('fr-FR')} FCFA` },
        ],
      });
      if (confirmed) {
        doDelete();
      }
    }
  };

  // Listes filtrées
  const filteredDepenses = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (depenses || []).filter((d) => {
      if (!d) return false;
      const motif = (d.motif || '').toLowerCase();
      const benef = (d.beneficiaire || '').toLowerCase();
      const piece = (d.numeroPiece || '').toLowerCase();
      const matchesSearch =
        !q ||
        motif.includes(q) ||
        benef.includes(q) ||
        piece.includes(q);
      const matchesCat = selectedCategorie === 'all' || d.categorie === selectedCategorie;
      return matchesSearch && matchesCat;
    });
  }, [depenses, searchTerm, selectedCategorie]);

  const filteredVersements = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (versements || []).filter((v) => {
      if (!v) return false;
      const bq = (v.banque || '').toLowerCase();
      const bord = (v.numeroBordereau || '').toLowerCase();
      const dep = (v.deposant || '').toLowerCase();
      const arretNom = (v.arretCotisationNom || '').toLowerCase();
      const arretMat = (v.arretCotisationMatricule || '').toLowerCase();
      const arretPrecNom = (v.arretPrecedentNom || '').toLowerCase();
      const matchesSearch =
        !q ||
        bq.includes(q) ||
        bord.includes(q) ||
        dep.includes(q) ||
        arretNom.includes(q) ||
        arretMat.includes(q) ||
        arretPrecNom.includes(q);
      const matchesBanque = selectedBanque === 'all' || v.banque === selectedBanque;
      return matchesSearch && matchesBanque;
    });
  }, [versements, searchTerm, selectedBanque]);

  const filteredFrais = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (fraisMobileMoney || []).filter((f) => {
      if (!f) return false;
      const ref = (f.referenceTransaction || '').toLowerCase();
      const adh = (f.adherentConcerne || '').toLowerCase();
      const op = (f.operateur || '').toLowerCase();
      const matchesSearch =
        !q ||
        ref.includes(q) ||
        adh.includes(q) ||
        op.includes(q);
      const matchesOperateur = selectedOperateur === 'all' || f.operateur === selectedOperateur;
      return matchesSearch && matchesOperateur;
    });
  }, [fraisMobileMoney, searchTerm, selectedOperateur]);

  const entiteExcel = activeSubTab === 'versements' ? 'versements' : activeSubTab === 'mobile_money' ? 'frais' : activeSubTab === 'paie' ? 'employes' : 'depenses';

  return (
    <div className="space-y-6" id="daf-financial-view">
      <ExcelEchangeModal isOpen={isExcelOpen} onClose={() => setIsExcelOpen(false)} entite={entiteExcel} />
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
              Espace DAF & Trésorerie
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Directeur Administratif & Financier
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
            Gestion Financière, Dépenses & Frais Opérateurs
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Saisie et suivi des dépenses courantes, enregistrement des versements bancaires avec bordereaux,
            et décompte des frais de retrait Orange Money et Mobile Money prélevés lors des encaissements.
          </p>
        </div>

        {/* Boutons d'actions selon sous-onglet */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsExcelOpen(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 text-sm font-semibold rounded-xl border border-emerald-300 transition-colors cursor-pointer"
            title="Exporter ces données en Excel pour les traiter hors de l'application, ou importer un fichier au même format"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel : exporter / importer</span>
          </button>
          {activeSubTab === 'depenses' && (
            <button
              type="button"
              onClick={handleOpenNewDepense}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Saisir une dépense</span>
            </button>
          )}

          {activeSubTab === 'versements' && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsBanquesModalOpen(true)}
                className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer"
                title="Gérer les banques partenaires (Ajouter ou Supprimer)"
              >
                <Building2 className="w-4 h-4 text-blue-700" />
                <span>Gérer les banques ({activeBanques.length})</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewVersement}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Landmark className="w-4 h-4" />
                <span>Nouveau versement bancaire</span>
              </button>
            </div>
          )}

          {activeSubTab === 'mobile_money' && (
            <button
              type="button"
              onClick={handleOpenNewFrais}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Enregistrer frais opérateur</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI financiers en cartes haute visibilité */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Dépenses courantes
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {(totalDepenses || 0).toLocaleString('fr-FR')} <span className="text-sm font-bold text-slate-500">FCFA</span>
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {depenses.length} dépense{depenses.length > 1 ? 's' : ''} engagée{depenses.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Versements en banque
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {(totalVersements || 0).toLocaleString('fr-FR')} <span className="text-sm font-bold text-slate-500">FCFA</span>
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {versements.length} bordereau{versements.length > 1 ? 'x' : ''} enregistré{versements.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Frais Orange & MoMo
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-700 tracking-tight">
              {(totalFraisOperateurs || 0).toLocaleString('fr-FR')} <span className="text-sm font-bold text-slate-500">FCFA</span>
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Prélevés sur {(cotisationsMobileMoney || 0).toLocaleString('fr-FR')} F reçus
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total cotisations reçues
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-700 tracking-tight">
              {(totalCotisations || 0).toLocaleString('fr-FR')} <span className="text-sm font-bold text-slate-500">FCFA</span>
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Net en caisse: {((totalCotisations || 0) - (totalDepenses || 0) - (totalFraisOperateurs || 0)).toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        </div>
      </div>

      {/* Navigation entre sous-onglets DAF */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2">
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('depenses');
            setSearchTerm('');
          }}
          className={`flex items-center space-x-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'depenses'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>1. Dépenses Courantes ({depenses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('versements');
            setSearchTerm('');
          }}
          className={`flex items-center space-x-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'versements'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>2. Versements Bancaires ({versements.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('mobile_money');
            setSearchTerm('');
          }}
          className={`flex items-center space-x-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'mobile_money'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>3. Frais Retrait Orange & MoMo ({fraisMobileMoney.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('paie');
            setSearchTerm('');
          }}
          className={`flex items-center space-x-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'paie'
              ? 'border-emerald-700 text-emerald-800 font-extrabold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-600" />
          <span>4. Paie & Salaires (Loi & Fiches)</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold ml-1">
            DAF
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('bilan');
            setSearchTerm('');
          }}
          className={`flex items-center space-x-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'bilan'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>5. Synthèse & Rapprochement</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VUE 1 : DÉPENSES COURANTES */}
      {/* ========================================================================= */}
      {activeSubTab === 'depenses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par motif, bénéficiaire, n° pièce..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={selectedCategorie}
                onChange={(e) => setSelectedCategorie(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Toutes les catégories</option>
                {CATEGORIES_DEPENSES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & N° Pièce</th>
                    <th className="py-3 px-4">Motif de la dépense</th>
                    <th className="py-3 px-4">Catégorie</th>
                    <th className="py-3 px-4">Bénéficiaire</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4 text-right">Montant (FCFA)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDepenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        Aucune dépense courante enregistrée correspondant aux critères.
                      </td>
                    </tr>
                  ) : (
                    filteredDepenses.map((dep) => (
                      <tr key={dep.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{dep.date}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            {dep.numeroPiece || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{dep.motif}</div>
                          {dep.observations && (
                            <div className="text-xs text-slate-500 line-clamp-1">
                              {dep.observations}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                            {dep.categorie}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {dep.beneficiaire}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {dep.modePaiement}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          {(dep?.montant ?? 0).toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleEditDepense(dep)}
                              title="Modifier la dépense"
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDepense(dep)}
                              title="Supprimer la dépense"
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
              <span className="text-slate-600">Total des dépenses affichées :</span>
              <span className="text-rose-700 font-black text-base">
                {filteredDepenses
                  .reduce((acc, curr) => Math.round((acc + (Number(curr.montant) || 0)) * 100) / 100, 0)
                  .toLocaleString('fr-FR')}{' '}
                FCFA
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 2 : VERSEMENTS BANCAIRES */}
      {/* ========================================================================= */}
      {activeSubTab === 'versements' && (
        <div className="space-y-4">
          {/* BANNIÈRE DE TRAÇABILITÉ & POINT D'ARRÊT DES COTISATIONS */}
          <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-5 text-white shadow-sm border border-blue-700/50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-700/80 text-blue-200 border border-blue-500/30">
                    Traçabilité & Repères de Caisse
                  </span>
                  <span className="text-xs text-blue-300">
                    Audit de continuité DAF
                  </span>
                </div>
                <h3 className="text-base font-black tracking-tight text-white flex items-center space-x-2">
                  <span>Point d'arrêt des cotisations au versement précédent</span>
                </h3>

                {dernierPointArret ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-blue-100 pt-1">
                    <span className="inline-flex items-center space-x-1.5 bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-700/40">
                      <span className="text-blue-300">📅 Date d'arrêt :</span>
                      <strong className="text-white font-bold">{dernierPointArret.date || '—'}</strong>
                    </span>
                    <span className="inline-flex items-center space-x-1.5 bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-700/40">
                      <span className="text-blue-300">👤 Adhérent d'arrêt :</span>
                      <strong className="text-white font-bold">
                        {dernierPointArret.nom || '—'}
                      </strong>
                      {dernierPointArret.matricule && (
                        <span className="text-blue-300 font-mono text-[11px]">
                          ({dernierPointArret.matricule})
                        </span>
                      )}
                    </span>
                    <span className="inline-flex items-center space-x-1.5 bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-700/40">
                      <span className="text-blue-300">💰 Montant cotisation :</span>
                      <strong className="text-emerald-300 font-black">
                        {(dernierPointArret.montant ?? 0).toLocaleString('fr-FR')} FCFA
                      </strong>
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-blue-200 italic pt-1">
                    Aucun versement antérieur enregistré. Le premier versement constituera le repère initial.
                  </p>
                )}
              </div>

              {/* Statut des cotisations en attente de versement */}
              <div className="bg-blue-950/70 border border-blue-700/60 rounded-xl p-3.5 shrink-0 flex items-center justify-between sm:justify-start gap-4">
                <div>
                  <span className="text-[11px] font-bold text-blue-300 uppercase block tracking-wider">
                    En attente de versement
                  </span>
                  <div className="text-xl font-black text-amber-300 mt-0.5">
                    {cotisationsEnAttenteVersement.totalMontant.toLocaleString('fr-FR')} <span className="text-xs font-bold text-amber-200">FCFA</span>
                  </div>
                  <div className="text-[11px] text-blue-200 mt-0.5">
                    {cotisationsEnAttenteVersement.nombre} cotisation{cotisationsEnAttenteVersement.nombre > 1 ? 's' : ''} depuis le dernier arrêt
                  </div>
                </div>

                {cotisationsEnAttenteVersement.nombre > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenNewVersement}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors shrink-0"
                    title="Enregistrer le versement de ces cotisations"
                  >
                    Verser en banque
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par banque, bordereau, déposant, nom d'adhérent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={selectedBanque}
                onChange={(e) => setSelectedBanque(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes les banques</option>
                {activeBanques.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & Bordereau</th>
                    <th className="py-3 px-4">Banque & Compte</th>
                    <th className="py-3 px-4">Repère précédent (Arrêté au)</th>
                    <th className="py-3 px-4">Arrêt de ce versement</th>
                    <th className="py-3 px-4">Source & Déposant</th>
                    <th className="py-3 px-4 text-right">Montant versé</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVersements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        <Landmark className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        Aucun versement bancaire enregistré correspondant.
                      </td>
                    </tr>
                  ) : (
                    filteredVersements.map((v) => {
                      const reperePrecedent: PointArret = v.reperes?.precedent ?? {};
                      const repereActuel: PointArret = v.reperes?.actuel ?? {};

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{v.date}</div>
                            <div className="text-xs font-mono font-bold text-blue-700">
                              {v.numeroBordereau}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{v.banque}</span>
                            </div>
                            {v.numeroCompte && (
                              <div className="text-xs text-slate-500 font-mono">
                                {v.numeroCompte}
                              </div>
                            )}
                          </td>
                          {/* Point d'arrêt du versement précédent */}
                          <td className="py-3 px-4">
                            {reperePrecedent.estPremierVersement ? (
                              <span className="text-[11px] font-semibold text-slate-400 italic">
                                Premier versement
                              </span>
                            ) : (
                              <div className="space-y-0.5 text-xs">
                                <div className="font-bold text-slate-800 truncate max-w-[150px]" title={reperePrecedent.nom}>
                                  {reperePrecedent.nom || '—'}
                                </div>
                                <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                                  <span>{reperePrecedent.date || '—'}</span>
                                  <span>•</span>
                                  <span className="font-bold text-amber-800">
                                    {(reperePrecedent.montant ?? 0).toLocaleString('fr-FR')} F
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>
                          {/* Point d'arrêt de ce versement */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5 text-xs">
                              <div className="font-bold text-blue-900 truncate max-w-[150px]" title={repereActuel.nom}>
                                {repereActuel.nom || 'Dernière cotisation'}
                              </div>
                              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                                <span>{repereActuel.date || v.date}</span>
                                <span>•</span>
                                <span className="font-bold text-emerald-700">
                                  {(repereActuel.montant ?? 0).toLocaleString('fr-FR')} F
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800 text-xs">{v.deposant}</div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
                              {v.sourceFonds}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-blue-900">
                            {(v?.montant ?? 0).toLocaleString('fr-FR')} F
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                type="button"
                                onClick={() => setSelectedVersementDetail(v)}
                                title="Voir les détails du suivi"
                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditVersement(v)}
                                title="Modifier le versement"
                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteVersement(v)}
                                title="Supprimer le versement"
                                className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
              <span className="text-slate-600">Total des versements bancaires :</span>
              <span className="text-blue-800 font-black text-base">
                {filteredVersements
                  .reduce((acc, curr) => Math.round((acc + (Number(curr.montant) || 0)) * 100) / 100, 0)
                  .toLocaleString('fr-FR')}{' '}
                FCFA
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 3 : FRAIS MOBILE MONEY & ORANGE MONEY */}
      {/* ========================================================================= */}
      {activeSubTab === 'mobile_money' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3 text-amber-900 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Espace de déduction des frais d'opérateur Télécom :</span>{' '}
              Lorsqu'un adhérent cotise par Orange Money, MTN MoMo, Moov Money ou Wave, les opérateurs prélèvent
              des commissions et frais de retrait. Le DAF enregistre ici ces prélèvements pour assurer une stricte
              concordance entre les cotisations brutes dues et le solde net réellement perçu.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par référence, adhérent concerné..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={selectedOperateur}
                onChange={(e) => setSelectedOperateur(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">Tous les opérateurs</option>
                {OPERATEURS_MOBILE.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & Réf.</th>
                    <th className="py-3 px-4">Opérateur Télécom</th>
                    <th className="py-3 px-4">Adhérent / Détail</th>
                    <th className="py-3 px-4">Type de frais</th>
                    <th className="py-3 px-4 text-right">Montant brut</th>
                    <th className="py-3 px-4 text-right text-rose-700">Frais prélevés</th>
                    <th className="py-3 px-4 text-right text-emerald-800">Net disponible</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFrais.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400">
                        <Smartphone className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        Aucun prélèvement d'opérateur enregistré.
                      </td>
                    </tr>
                  ) : (
                    filteredFrais.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{f.date}</div>
                          <div className="text-xs font-mono font-bold text-amber-800">
                            {f.referenceTransaction}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                              f.operateur === 'Orange Money'
                                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                : f.operateur === 'MTN MoMo'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : f.operateur === 'Moov Money'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                            }`}
                          >
                            {f.operateur}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">
                            {f.adherentConcerne || 'Adhérent COSITI'}
                          </div>
                          {f.observations && (
                            <div className="text-xs text-slate-500">{f.observations}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {f.typeFrais}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                          {(f?.montantTransaction ?? 0).toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600">
                          - {(f?.fraisPreleves ?? 0).toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-700">
                          {(f?.montantNet ?? 0).toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleEditFrais(f)}
                              title="Modifier la ligne"
                              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFrais(f)}
                              title="Supprimer la ligne"
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-sm font-bold gap-2">
              <span className="text-slate-600">
                Cumul frais prélevés par les opérateurs de télécommunications :
              </span>
              <span className="text-rose-700 font-black text-base">
                -{' '}
                {filteredFrais
                  .reduce((acc, curr) => Math.round((acc + (Number(curr.fraisPreleves) || 0)) * 100) / 100, 0)
                  .toLocaleString('fr-FR')}{' '}
                FCFA
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 4 : PAIE & SALAIRES (ESPACE DAF) */}
      {/* ========================================================================= */}
      {activeSubTab === 'paie' && (
        <div className="pt-2">
          <PaieView onRequestPinConfirm={onRequestPinConfirm} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 5 : BILAN & RAPPROCHEMENT SYNTHÉTIQUE */}
      {/* ========================================================================= */}
      {activeSubTab === 'bilan' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ControleIntegritePanel />
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Ressources Encaissées (Entrées de fonds)</span>
            </h2>
            <div className="divide-y divide-slate-100 text-sm">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600">Total Cotisations & Adhésions perçues</span>
                <span className="font-bold text-slate-900">{(totalCotisations || 0).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600">Dont paiements par Mobile Money</span>
                <span className="font-medium text-amber-800">{(cotisationsMobileMoney || 0).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600">Dont paiements en Espèces / Guichet</span>
                <span className="font-medium text-slate-800">
                  {((totalCotisations || 0) - (cotisationsMobileMoney || 0)).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-rose-600" />
              <span>Charges & Affectations de Trésorerie</span>
            </h2>
            <div className="divide-y divide-slate-100 text-sm">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600">Dépenses courantes de fonctionnement</span>
                <span className="font-bold text-rose-700">- {(totalDepenses || 0).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600">Frais de retrait et commissions opérateurs télécom</span>
                <span className="font-bold text-amber-700">- {(totalFraisOperateurs || 0).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600">Fonds déposés sur les comptes bancaires (Bordereaux)</span>
                <span className="font-bold text-blue-700">{(totalVersements || 0).toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-emerald-900 text-white p-6 rounded-2xl shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-black">Position Nette de Trésorerie Théorique</h3>
                <p className="text-emerald-200 text-xs mt-1">
                  (Cotisations encaissées) - (Dépenses courantes) - (Frais prélevés par opérateurs Orange / MoMo)
                </p>
              </div>
              <div className="text-3xl font-black text-emerald-300">
                {((totalCotisations || 0) - (totalDepenses || 0) - (totalFraisOperateurs || 0)).toLocaleString('fr-FR')} FCFA
              </div>
            </div>
          </div>

          {/* Section A : Rapprochement Spécifique - Solde Réel en Banque (Déduction Réserve CNPS) */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-blue-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                    Rapprochement Bancaire Spécifique
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Comptes certifiés COSITI</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-1 flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-blue-700" />
                  <span>Solde Réel en Banque après Déduction Exclusive de la Réserve CNPS</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Sur les fonds versés en banque, seules les cotisations réservées pour la CNPS sont soustraites pour dégager la trésorerie libre disponible.
                </p>
              </div>

              <button
                onClick={handleExportRapprochementExcelFromDaf}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer shrink-0"
                title="Exporter le classeur Excel officiel de rapprochement bancaire et réserve CNPS"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Rapprochement (.xlsx)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                  1. Fonds Versés en Banque
                </span>
                <span className="text-xl font-black text-blue-950 mt-1 block">
                  {(totalVersements || 0).toLocaleString('fr-FR')} FCFA
                </span>
                <span className="text-[11px] text-blue-700 mt-1 block">
                  {versements.length} bordereau(x) bancaire(s)
                </span>
              </div>

              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                  2. Déduction : Réserve CNPS
                </span>
                <span className="text-xl font-black text-amber-700 mt-1 block">
                  - {totalReserveCnps.toLocaleString('fr-FR')} FCFA
                </span>
                <span className="text-[11px] text-amber-700 mt-1 block">
                  {adherentsReserveList.length} adhérent(s) • Droits protégés
                </span>
              </div>

              <div className={`p-4 border rounded-xl ${
                soldeReelBanque >= 0 ? 'bg-emerald-50/60 border-emerald-300' : 'bg-rose-50/60 border-rose-300'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                    soldeReelBanque >= 0 ? 'text-emerald-800' : 'text-rose-800'
                  }`}>
                    3. Solde Réel en Banque
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                    {tauxCouvertureCnps.toFixed(0)}%
                  </span>
                </div>
                <span className={`text-xl font-black mt-1 block ${
                  soldeReelBanque >= 0 ? 'text-emerald-950' : 'text-rose-950'
                }`}>
                  {soldeReelBanque >= 0 ? '+' : ''}{soldeReelBanque.toLocaleString('fr-FR')} FCFA
                </span>
                <span className={`text-[11px] mt-1 block ${
                  soldeReelBanque >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {soldeReelBanque >= 0 ? 'Trésorerie nette disponible' : 'Déficit de couverture bancaire'}
                </span>
              </div>
            </div>
          </div>

          {/* Section B : État Officiel des Encaissements et Décaissements (Ventilation des 2 Origines) */}
          <div className="md:col-span-2 bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    Gouvernance & Deux Origines de Fonds
                  </span>
                  <span className="text-xs text-slate-300">Règle statutaire COSITI</span>
                </div>
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <Landmark className="w-5 h-5 text-indigo-400" />
                  <span>État des Encaissements et Décaissements (Exploitation CNPS / Apport PCA)</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  Les décaissements ont deux origines strictes : (1) Exploitation (uniquement les cotisations CNPS) et (2) Apport Personnel du PCA (toutes les autres dépenses de fonctionnement et de gestion).
                </p>
              </div>

              <button
                onClick={handleExportEncaissementsDecaissementsPdfFromDaf}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer shrink-0"
                title="Télécharger le document PDF officiel certifié de l'état des encaissements et décaissements"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger PDF Officiel</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-slate-900">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Encaissements Globaux
                </span>
                <span className="text-lg font-black text-emerald-950 block mt-1">
                  + {totalCotisations.toLocaleString('fr-FR')} FCFA
                </span>
                <span className="text-[11px] text-emerald-700 block mt-0.5">
                  Cotisations adhérents perçues
                </span>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                  Décaissements Exploitation
                </span>
                <span className="text-lg font-black text-blue-950 block mt-1">
                  - {totalDecaissementsExploitationCnps.toLocaleString('fr-FR')} FCFA
                </span>
                <span className="text-[11px] text-blue-700 block mt-0.5">
                  Exclusivement cotisations CNPS ({decaissementsExploitationCnps.length} op.)
                </span>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Décaissements Apport PCA
                </span>
                <span className="text-lg font-black text-amber-950 block mt-1">
                  - {totalDecaissementsApportPca.toLocaleString('fr-FR')} FCFA
                </span>
                <span className="text-[11px] text-amber-700 block mt-0.5">
                  Toutes les autres charges ({decaissementsApportPca.length} op.)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALES D'ÉDITION & SAISIE DAF */}
      {/* ========================================================================= */}

      {/* Modale Dépense Courante */}
      {isDepenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-emerald-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base">
                  {editingDepense ? 'Modifier une dépense' : 'Saisir une dépense courante (DAF)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDepenseModalOpen(false)}
                className="text-emerald-300 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepense} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={depenseForm.date}
                    onChange={(e) => setDepenseForm({ ...depenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    N° Pièce / Facture
                  </label>
                  <input
                    type="text"
                    value={depenseForm.numeroPiece}
                    onChange={(e) => setDepenseForm({ ...depenseForm, numeroPiece: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: FACT-2025-01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Motif de la dépense *
                </label>
                <input
                  type="text"
                  required
                  value={depenseForm.motif}
                  onChange={(e) => setDepenseForm({ ...depenseForm, motif: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: Achat rames de papier et cartouches d'encre"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Montant (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={depenseForm.montant}
                    onChange={(e) => setDepenseForm({ ...depenseForm, montant: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: 25000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mode de paiement
                  </label>
                  <select
                    value={depenseForm.modePaiement}
                    onChange={(e) =>
                      setDepenseForm({
                        ...depenseForm,
                        modePaiement: e.target.value as DepenseCourante['modePaiement'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Espèces / Caisse">Espèces (Petite caisse)</option>
                    <option value="Chèque">Chèque bancaire</option>
                    <option value="Virement bancaire">Virement bancaire</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Wave">Wave</option>
                    <option value="MTN MoMo">MTN MoMo</option>
                    <option value="Moov Money">Moov Money</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Catégorie budgétaire
                  </label>
                  <select
                    value={depenseForm.categorie}
                    onChange={(e) =>
                      setDepenseForm({
                        ...depenseForm,
                        categorie: e.target.value as CategorieDepense,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORIES_DEPENSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Bénéficiaire / Fournisseur *
                  </label>
                  <input
                    type="text"
                    required
                    value={depenseForm.beneficiaire}
                    onChange={(e) => setDepenseForm({ ...depenseForm, beneficiaire: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: Librairie de France, CIE, SODECI..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Observations / Références
                </label>
                <textarea
                  rows={2}
                  value={depenseForm.observations}
                  onChange={(e) => setDepenseForm({ ...depenseForm, observations: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="Note explicative pour l'audit..."
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsDepenseModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingDepense ? 'Mettre à jour' : 'Enregistrer la dépense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Versement Bancaire */}
      {isVersementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-blue-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-800/80 flex items-center justify-center">
                  <Landmark className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingVersement ? 'Modifier versement bancaire' : 'Nouveau Versement Bancaire (DAF)'}
                  </h3>
                  <p className="text-xs text-blue-200">
                    Traçabilité des cotisations et suivi du point d'arrêt
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVersementModalOpen(false)}
                className="text-blue-300 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVersement} className="p-6 space-y-4 overflow-y-auto">
              {/* Informations du bordereau */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Date du versement *
                  </label>
                  <input
                    type="date"
                    required
                    value={versementForm.date}
                    onChange={(e) => setVersementForm({ ...versementForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    N° Bordereau de dépôt bancaire *
                  </label>
                  <input
                    type="text"
                    required
                    value={versementForm.numeroBordereau}
                    onChange={(e) =>
                      setVersementForm({ ...versementForm, numeroBordereau: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: BORD-2026-089"
                  />
                </div>
              </div>

              {/* SECTION CLÉ 1 : REPÈRE DU VERSEMENT PRÉCÉDENT */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <History className="w-4 h-4 text-amber-800" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      1. Repère du versement précédent (D'où on repart)
                    </span>
                  </div>
                  {versementForm.arretPrecedentBordereau && (
                    <span className="text-[11px] font-mono font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md">
                      Bordereau : {versementForm.arretPrecedentBordereau}
                    </span>
                  )}
                </div>

                <p className="text-xs text-amber-900/90 leading-relaxed">
                  {versementForm.arretPrecedentNom ? (
                    <>
                      Le versement précédent s'est arrêté le <strong className="text-amber-950">{versementForm.arretPrecedentDate || '—'}</strong> à la cotisation de <strong className="text-amber-950">{versementForm.arretPrecedentNom}</strong> {versementForm.arretPrecedentMatricule ? `(${versementForm.arretPrecedentMatricule})` : ''} d'un montant de <strong className="text-amber-950">{(Number(versementForm.arretPrecedentMontant) || 0).toLocaleString('fr-FR')} FCFA</strong>.
                    </>
                  ) : (
                    <>Premier versement de la coopérative ou aucun versement antérieur enregistré.</>
                  )}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Date d'arrêt précédente
                    </label>
                    <input
                      type="date"
                      value={versementForm.arretPrecedentDate}
                      onChange={(e) =>
                        setVersementForm({ ...versementForm, arretPrecedentDate: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Nom adhérent repère
                    </label>
                    <input
                      type="text"
                      value={versementForm.arretPrecedentNom}
                      onChange={(e) =>
                        setVersementForm({ ...versementForm, arretPrecedentNom: e.target.value })
                      }
                      placeholder="Ex: TRAORÉ Moussa"
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Montant cotisation repère (F)
                    </label>
                    <input
                      type="number"
                      value={versementForm.arretPrecedentMontant}
                      onChange={(e) =>
                        setVersementForm({ ...versementForm, arretPrecedentMontant: e.target.value })
                      }
                      placeholder="Ex: 4900"
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-950 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION CLÉ 2 : POINT D'ARRÊT DE CE NOUVEAU VERSEMENT */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-800" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    2. Arrêt de ce versement (Dernière cotisation incluse)
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-emerald-950">
                    Sélectionner la dernière cotisation couverte par ce versement :
                  </label>
                  <select
                    value={versementForm.selectedCotisationId}
                    onChange={(e) => handleSelectCotisationArret(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choisir dans la liste des cotisations récentes --</option>
                    {cotisationsTriees.slice(-25).reverse().map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.datePaiement} — {c.adherentNomPrenom} ({c.matricule}) — {(c.montant || 0).toLocaleString('fr-FR')} FCFA ({c.reference || 'Reçu'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      Date de cette cotisation *
                    </label>
                    <input
                      type="date"
                      value={versementForm.arretCotisationDate}
                      onChange={(e) =>
                        setVersementForm({ ...versementForm, arretCotisationDate: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      Nom de l'adhérent d'arrêt *
                    </label>
                    <input
                      type="text"
                      value={versementForm.arretCotisationNom}
                      onChange={(e) =>
                        setVersementForm({ ...versementForm, arretCotisationNom: e.target.value })
                      }
                      placeholder="Ex: KOUAMÉ Ahou Félicité"
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      Montant cotisation d'arrêt (F) *
                    </label>
                    <input
                      type="number"
                      value={versementForm.arretCotisationMontant}
                      onChange={(e) =>
                        setVersementForm({ ...versementForm, arretCotisationMontant: e.target.value })
                      }
                      placeholder="Ex: 10000"
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Banque réceptrice et Montant versé */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Banque réceptrice *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddBankOpen(!isQuickAddBankOpen)}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center space-x-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ajouter une banque</span>
                    </button>
                  </div>

                  <select
                    value={versementForm.banque}
                    onChange={(e) => setVersementForm({ ...versementForm, banque: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {activeBanques.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>

                  {/* Ajout rapide de banque inline */}
                  {isQuickAddBankOpen && (
                    <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                      <span className="text-[11px] font-bold text-blue-900 block">
                        Ajout rapide d'une nouvelle banque (DAF)
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={quickBankName}
                          onChange={(e) => setQuickBankName(e.target.value)}
                          placeholder="Nom de la banque (ex: UBA, Stanbic...)"
                          className="flex-1 px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleQuickAddBank}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Montant total versé en banque (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={versementForm.montant}
                    onChange={(e) => setVersementForm({ ...versementForm, montant: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-black text-blue-950 focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 500000"
                  />
                  {cotisationsEnAttenteVersement.totalMontant > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setVersementForm((prev) => ({
                          ...prev,
                          montant: cotisationsEnAttenteVersement.totalMontant.toString(),
                        }))
                      }
                      className="mt-1 text-[11px] text-blue-700 hover:text-blue-900 font-semibold cursor-pointer underline flex items-center space-x-1"
                    >
                      <span>⚡ Copier le total en attente ({cotisationsEnAttenteVersement.totalMontant.toLocaleString('fr-FR')} FCFA)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Source des fonds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Source des fonds versés
                  </label>
                  <select
                    value={versementForm.sourceFonds}
                    onChange={(e) =>
                      setVersementForm({
                        ...versementForm,
                        sourceFonds: e.target.value as VersementBancaire['sourceFonds'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Recettes Cotisations Adhérents">
                      Recettes Cotisations Adhérents
                    </option>
                    <option value="Retraits Mobile Money">Retraits Mobile Money</option>
                    <option value="Fonds propres / Apport">Fonds propres / Apport</option>
                    <option value="Autre">Autre provenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    N° de compte bancaire
                  </label>
                  <input
                    type="text"
                    value={versementForm.numeroCompte}
                    onChange={(e) =>
                      setVersementForm({ ...versementForm, numeroCompte: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nom du déposant
                </label>
                <input
                  type="text"
                  value={versementForm.deposant}
                  onChange={(e) => setVersementForm({ ...versementForm, deposant: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom de l'agent qui a fait le versement"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Observations / Note DAF
                </label>
                <textarea
                  rows={2}
                  value={versementForm.observations}
                  onChange={(e) =>
                    setVersementForm({ ...versementForm, observations: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Précisions de bordereau, agence bancaire, motifs..."
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsVersementModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingVersement ? 'Mettre à jour' : 'Enregistrer le versement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Frais Mobile Money */}
      {isFraisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-amber-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">
                  {editingFrais
                    ? 'Modifier frais opérateur'
                    : 'Décompte Frais de retrait Orange Money / MoMo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFraisModalOpen(false)}
                className="text-amber-300 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFrais} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={fraisForm.date}
                    onChange={(e) => setFraisForm({ ...fraisForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Opérateur Télécom *
                  </label>
                  <select
                    value={fraisForm.operateur}
                    onChange={(e) =>
                      setFraisForm({
                        ...fraisForm,
                        operateur: e.target.value as OperateurMobile,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  >
                    {OPERATEURS_MOBILE.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Montant brut transaction (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={fraisForm.montantTransaction}
                    onChange={(e) =>
                      setFraisForm({ ...fraisForm, montantTransaction: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-500"
                    placeholder="Ex: 50000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Frais prélevés par l'opérateur (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={fraisForm.fraisPreleves}
                    onChange={(e) => setFraisForm({ ...fraisForm, fraisPreleves: e.target.value })}
                    className="w-full px-3 py-2 border border-rose-300 rounded-xl text-sm font-bold text-rose-700 focus:ring-2 focus:ring-rose-500"
                    placeholder="Ex: 500"
                  />
                </div>
              </div>

              {fraisForm.montantTransaction && fraisForm.fraisPreleves && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center text-xs font-bold">
                  <span className="text-emerald-800">Montant net perçu par COSITI :</span>
                  <span className="text-emerald-900 font-black text-sm">
                    {(
                      (Number(fraisForm.montantTransaction) || 0) - (Number(fraisForm.fraisPreleves) || 0)
                    ).toLocaleString('fr-FR')}{' '}
                    FCFA
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Réf. Transaction / SMS
                  </label>
                  <input
                    type="text"
                    value={fraisForm.referenceTransaction}
                    onChange={(e) =>
                      setFraisForm({ ...fraisForm, referenceTransaction: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-amber-500"
                    placeholder="Ex: CI250228.1452.C09876"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Type de frais
                  </label>
                  <select
                    value={fraisForm.typeFrais}
                    onChange={(e) =>
                      setFraisForm({
                        ...fraisForm,
                        typeFrais: e.target.value as TypeFraisMobileMoney,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Frais de retrait marchand">Frais de retrait marchand</option>
                    <option value="Commission prélevée sur encaissement">Commission prélevée sur encaissement</option>
                    <option value="Frais de transfert opérateur">Frais de transfert opérateur</option>
                    <option value="Frais de compte pro">Frais de compte pro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Adhérent ou Payeur concerné
                </label>
                <div className="space-y-2">
                  <select
                    value={fraisForm.adherentConcerne}
                    onChange={(e) => setFraisForm({ ...fraisForm, adherentConcerne: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Sélectionner un adhérent enregistré (optionnel) --</option>
                    {adherents.map((a) => (
                      <option key={a.id} value={`${a.nom} ${a.prenom} (${a.matricule})`}>
                        {a.matricule} - {a.nom} {a.prenom} ({a.telephone})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={fraisForm.adherentConcerne}
                    onChange={(e) =>
                      setFraisForm({ ...fraisForm, adherentConcerne: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                    placeholder="Ou nom libre du payeur si versement direct"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Observations / Note
                </label>
                <input
                  type="text"
                  value={fraisForm.observations}
                  onChange={(e) => setFraisForm({ ...fraisForm, observations: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  placeholder="Ex: Frais déduits directement par l'agent de retrait"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFraisModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingFrais ? 'Mettre à jour' : 'Enregistrer le décompte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale de gestion des banques partenaires (DAF) */}
      <BanquesModal
        isOpen={isBanquesModalOpen}
        onClose={() => setIsBanquesModalOpen(false)}
      />

      {/* Modale de détail & audit du versement */}
      <VersementDetailModal
        versement={selectedVersementDetail}
        allVersements={versements}
        cotisations={cotisations}
        onClose={() => setSelectedVersementDetail(null)}
        onEdit={(vrs) => handleEditVersement(vrs)}
      />
    </div>
  );
};
