import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import { BulletinPaie, Employe, TrancheSalarialeLoi, Adherent } from '../../types';
import { useApiQuery } from '../../api/hooks';
import { request } from '../../api/client';
import type { RecapPaie, AdherentsCnpsDuMois } from '../../api/models';
import { BulletinPaieModal } from './BulletinPaieModal';
import { BulletinEditModal } from './BulletinEditModal';
import { EmployeModal } from './EmployeModal';
import {
  FileText,
  Users,
  DollarSign,
  Calendar,
  Plus,
  RefreshCw,
  Printer,
  Download,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
  Calculator,
  ArrowUpRight,
  Landmark,
  BadgePercent,
  Layers,
  FileSpreadsheet,
  Check,
  BookOpen,
  FolderHeart,
  Sparkles,
  BadgeCheck,
  UserX,
  Coins,
  Briefcase,
  Sliders,
  X,
} from 'lucide-react';

interface PaieViewProps {
  onRequestPinConfirm?: (action: (pin: string) => void, title: string, desc?: string) => void;
}

export const PaieView: React.FC<PaieViewProps> = ({ onRequestPinConfirm }) => {
  const {
    adherents,
    employes,
    bulletinsPaie,
    parametres,
    currentUser,
    banques,
    addEmploye,
    updateEmploye,
    deleteEmploye,
    genererPaieMois,
    genererPaieAdherentsCnps,
    updateSalaireCotisableAdherent,
    saveBulletinPaie,
    deleteBulletinPaie,
    validerPaieMois,
    setActiveTab,
  } = useApp();

  const dialog = useDialog();

  // Période sélectionnée (Mois YYYY-MM)
  const [selectedMois, setSelectedMois] = useState<string>('2026-03');

  // Sous-onglets internes du module Paie
  const [activeTabPaie, setActiveTabPaie] = useState<'bulletins' | 'adherents-cnps' | 'personnel' | 'declarations'>('bulletins');

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTranche, setFilterTranche] = useState<'ALL' | TrancheSalarialeLoi>('ALL');
  const [filterDepartement, setFilterDepartement] = useState<string>('ALL');
  const [adherentFilterEnfant, setAdherentFilterEnfant] = useState<'ALL' | 'AVEC_ENFANTS' | 'SANS_ENFANT'>('ALL');

  // Récapitulatif du mois, déclarations CNPS / fiscale et paie CNPS des adhérents : TOUT est calculé par le serveur
  // (barème CNPS / CGI unique) — GET /paie/recap et GET /paie/adherents-cnps.
  const { data: recap } = useApiQuery<RecapPaie>('/paie/recap', { mois: selectedMois });
  const { data: cnpsData } = useApiQuery<AdherentsCnpsDuMois>('/paie/adherents-cnps', { mois: selectedMois });
  const lignesCnps = cnpsData?.lignes ?? [];

  // Modales
  const [selectedBulletinForView, setSelectedBulletinForView] = useState<BulletinPaie | null>(null);
  const [bulletinToEdit, setBulletinToEdit] = useState<BulletinPaie | null>(null);
  const [isEmployeModalOpen, setIsEmployeModalOpen] = useState(false);
  const [employeToEdit, setEmployeToEdit] = useState<Employe | null>(null);
  const [isBulkPrintMode, setIsBulkPrintMode] = useState(false);

  // Modal Ajustement Assiette Cotisable Adhérent
  const [adherentForCotisableEdit, setAdherentForCotisableEdit] = useState<Adherent | null>(null);
  const [cotisableInputValue, setCotisableInputValue] = useState<number>(60000);
  const [simulationAssiette, setSimulationAssiette] = useState<any | null>(null);
  useEffect(() => {
    if (!adherentForCotisableEdit) {
      setSimulationAssiette(null);
      return;
    }
    let annule = false;
    const t = setTimeout(() => {
      request('POST', `/paie/adherents/${encodeURIComponent(adherentForCotisableEdit.id)}/apercu`, { body: { mois: selectedMois, montant: cotisableInputValue } })
        .then((r) => !annule && setSimulationAssiette(r.data))
        .catch(() => !annule && setSimulationAssiette(null));
    }, 250);
    return () => {
      annule = true;
      clearTimeout(t);
    };
  }, [adherentForCotisableEdit, cotisableInputValue, selectedMois]);

  // Adhérents ayant déjà un numéro / matricule CNPS officiel
  const immatAdherents = useMemo(() => {
    return (adherents || []).filter(
      (a) => a.statutImmatriculation === 'Immatriculé' || (a.numeroCnps && a.numeroCnps.trim().length > 0)
    );
  }, [adherents]);

  // Mois disponibles dans les bulletins
  const moisDisponibles = useMemo(() => {
    const list = Array.from(new Set(bulletinsPaie.map((b) => b.mois)));
    if (!list.includes('2026-03')) list.push('2026-03');
    if (!list.includes('2026-02')) list.push('2026-02');
    if (!list.includes('2026-01')) list.push('2026-01');
    return list.sort().reverse();
  }, [bulletinsPaie]);

  // Bulletins du mois sélectionné
  const bulletinsDuMois = useMemo(() => {
    return bulletinsPaie.filter((b) => b.mois === selectedMois);
  }, [bulletinsPaie, selectedMois]);

  // Séparation Personnel vs Adhérents CNPS
  const bulletinsAdherentsDuMois = useMemo(() => {
    return bulletinsDuMois.filter(
      (b) => b.typeBeneficiaire === 'ADHERENT_CNPS' || immatAdherents.some((a) => a.id === b.employeId || a.id === b.adherentId)
    );
  }, [bulletinsDuMois, immatAdherents]);

  const bulletinsPersonnelDuMois = useMemo(() => {
    return bulletinsDuMois.filter(
      (b) => b.typeBeneficiaire !== 'ADHERENT_CNPS' && !immatAdherents.some((a) => a.id === b.employeId || a.id === b.adherentId)
    );
  }, [bulletinsDuMois, immatAdherents]);

  // Filtrage des bulletins du personnel
  const filteredBulletins = useMemo(() => {
    return bulletinsPersonnelDuMois.filter((b) => {
      const matchSearch =
        searchTerm === '' ||
        b.employeNomComplet.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.employeMatricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.employePoste.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.bulletinNumero.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTranche = filterTranche === 'ALL' || b.trancheLoi === filterTranche;
      const matchDep = filterDepartement === 'ALL' || b.employeDepartement === filterDepartement;

      return matchSearch && matchTranche && matchDep;
    });
  }, [bulletinsPersonnelDuMois, searchTerm, filterTranche, filterDepartement]);

  // Filtrage d'affichage des adhérents immatriculés CNPS
  const filteredAdherentsCnps = useMemo(() => {
    return lignesCnps.filter(({ adherent: a }) => {
      const matchSearch =
        searchTerm === '' ||
        `${a.nom} ${a.prenom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.numeroCnps || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.profession || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchEnfant =
        adherentFilterEnfant === 'ALL' ||
        (adherentFilterEnfant === 'SANS_ENFANT' && a.sansEnfant === true) ||
        (adherentFilterEnfant === 'AVEC_ENFANTS' && a.sansEnfant !== true);

      return matchSearch && matchEnfant;
    });
  }, [lignesCnps, searchTerm, adherentFilterEnfant]);

  // Totaux de la paie CNPS des adhérents (calculés par le serveur)
  const statsAdherentsCnps = cnpsData?.totaux ?? {
    count: 0, masseCotisableTotal: 0, totalCnpsSalariale: 0, totalCfcSalarial: 0, totalTdl: 0,
    totalNet: 0, totalPatronal: 0, totalDeclareCnps: 0, bulletinsGeneresCount: 0,
  };

  // Totaux financiers du mois (calculés par le serveur)
  const statsMois = recap?.statsMois ?? {
    totalBrut: 0, totalNet: 0, totalSocialSalarial: 0, totalFiscalSalarial: 0, totalPatronal: 0, totalCoutEmployeur: 0,
    nbMoins60k: 0, nbEgal60k: 0, nbPlus60k: 0, count: 0, isAllValide: false,
  };

  // Génération paie du mois
  const handleGenererPaie = async () => {
    const activeStaff = employes.filter((e) => e.actif !== false);
    const confirmed = await dialog.confirm({
      title: `Générer la paie pour ${selectedMois}`,
      message: `Voulez-vous calculer automatiquement les bulletins de paie pour les ${activeStaff.length} salariés actifs selon les tranches légales (< 60 000 F, = 60 000 F, > 60 000 F) ?`,
      confirmText: 'Générer la Paie',
      cancelText: 'Annuler',
    });

    if (confirmed) {
      const res = await genererPaieMois(selectedMois, { ecraserExistant: true });
      if (res.success) {
        await dialog.alert({
          title: 'Paie générée avec succès',
          message: `${res.count} bulletins de paie calculés et prêts pour vérification.`,
        });
      } else {
        await dialog.alert({
          title: 'Erreur de génération',
          message: res.error || 'Impossible de générer la paie.',
        });
      }
    }
  };

  // Validation de la paie et transfert en dépense DAF
  const handleValiderPaie = async () => {
    if (bulletinsDuMois.length === 0) {
      await dialog.alert({
        title: 'Aucun bulletin',
        message: 'Veuillez d\'abord générer les bulletins pour ce mois.',
      });
      return;
    }

    const action = async () => {
      const confirmed = await dialog.confirm({
        title: `Validation officielle de la paie (${selectedMois})`,
        message: `Total Net à virer : ${statsMois.totalNet.toLocaleString('fr-FR')} FCFA (${bulletinsDuMois.length} salariés).\n\nVoulez-vous valider définitivement et enregistrer automatiquement une dépense de masse salariale dans le journal des dépenses DAF ?`,
        confirmText: 'Valider & Enregistrer Dépense',
        cancelText: 'Annuler',
      });

      if (confirmed) {
        const res = await validerPaieMois(selectedMois, true);
        if (res.success) {
          await dialog.alert({
            title: 'Paie validée & Comptabilisée',
            message: `La paie du mois ${selectedMois} a été validée par le DAF. Une écriture de ${statsMois.totalNet.toLocaleString('fr-FR')} FCFA a été ajoutée aux dépenses courantes.`,
          });
        }
      }
    };

    if (onRequestPinConfirm) {
      onRequestPinConfirm(action, `Validation globale de la masse salariale DAF (${statsMois.totalNet.toLocaleString('fr-FR')} FCFA)`);
    } else {
      action();
    }
  };

  // Génération automatique des bulletins de paie pour les adhérents ayant un matricule CNPS (60 000 FCFA cotisable par défaut)
  const handleGenererPaieAdherents = async () => {
    if (immatAdherents.length === 0) {
      await dialog.alert({
        title: 'Aucun adhérent immatriculé',
        message: 'Aucun adhérent ne possède actuellement de numéro d\'immatriculation CNPS officiel.',
      });
      return;
    }

    const confirmed = await dialog.confirm({
      title: `Générer la paie des Adhérents CNPS (${selectedMois})`,
      message: `Voulez-vous générer automatiquement les bulletins de paie et fiches déclaratives CNPS Cameroun pour les ${immatAdherents.length} adhérents immatriculés avec l'assiette légale de 60 000 FCFA par défaut (CNPS 4,2% = 2 520 F, Net = 56 630 F) ?`,
      confirmText: 'Générer les Bulletins Adhérents',
      cancelText: 'Annuler',
    });

    if (confirmed) {
      const res = await genererPaieAdherentsCnps(selectedMois, 60000);
      if (res.success) {
        await dialog.alert({
          title: 'Bulletins Adhérents générés avec succès',
          message: `${res.count} bulletins et fiches de déclarations CNPS Cameroun calculés sur la base de 60 000 FCFA cotisable par défaut.`,
        });
      } else {
        await dialog.alert({
          title: 'Information',
          message: res.error || 'Impossible de générer les bulletins.',
        });
      }
    }
  };

  // Export CSV du Livre de Paie des Adhérents CNPS
  const handleExportAdherentsCsv = () => {
    if (immatAdherents.length === 0) {
      dialog.alert({
        title: 'Export impossible',
        message: 'Aucun adhérent immatriculé à exporter.',
      });
      return;
    }

    const headers = [
      'Matricule COSITI',
      'N° CNPS Officiel',
      'Nom & Prénoms Adhérent',
      'Profession',
      'Situation Enfants',
      'Salaire Cotisable CNPS (FCFA)',
      'CNPS PVID Salariale (4,2%)',
      'CFC Salarial (1%)',
      'TDL Cameroun',
      'IRPP (0% Franchise)',
      'Total Retenues Salariales',
      'Net Restant / À Payer',
      'CNPS PVID Patronale (4,2%)',
      'Prestations Familiales (7%)',
      'Accidents Travail (1,75%)',
      'Total Charges Patronales',
      'Total Déclaratif CNPS Cameroun',
      'Mois',
    ];

    const rows = lignesCnps.map(({ adherent: adh, bulletin: b }) => [
      `"${adh.matricule}"`,
      `"${adh.numeroCnps || 'En cours'}"`,
      `"${adh.nom} ${adh.prenom}"`,
      `"${adh.profession}"`,
      adh.sansEnfant ? '"Sans enfant (Exonéré PF)"' : `"${adh.nombreEnfants || 0} enfant(s)"`,
      adh.salaireCotisableCnps,
      b.cnpsPvidSalariale,
      b.cfcSalariale,
      b.tdlSalariale,
      b.irppSalariale,
      b.totalRetenuesSalariales,
      b.netAPayer,
      b.cnpsPvidPatronale,
      b.cnpsPfPatronale,
      b.cnpsAtmpPatronale,
      b.totalCnpsPatronale ?? 0,
      b.totalCotisationsCnps ?? 0,
      `"${selectedMois}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Livre_Paie_Adherents_CNPS_${selectedMois}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Enregistrement rapide du cotisable d'un adhérent
  const handleSaveCotisable = (adh: Adherent, montant: number) => {
    updateSalaireCotisableAdherent(adh.id, montant);
    setAdherentForCotisableEdit(null);
  };

  // Export CSV du Livre de Paie
  const handleExportCsv = () => {
    if (bulletinsDuMois.length === 0) {
      dialog.alert({
        title: 'Export impossible',
        message: 'Aucun bulletin à exporter pour ce mois.',
      });
      return;
    }

    const headers = [
      'N° Bulletin',
      'Matricule',
      'Salarié',
      'Poste',
      'Département',
      'Tranche Légale',
      'Salaire Base (FCFA)',
      'Sursalaire',
      'Primes',
      'Indemnité Transport',
      'Total Brut (FCFA)',
      'Brut Imposable',
      'CNPS Retraite Sal. (6.3%)',
      'CMU Salarié',
      'Total Social Salarial',
      'ITS (Impôt sur Salaire)',
      'CN / IGR',
      'Total Fiscal',
      'Acomptes / Déductions',
      'Total Retenues Salariales',
      'NET À PAYER (FCFA)',
      'CNPS Patronale (7.7%)',
      'Prestations Familiales',
      'Accident Travail',
      'FDFP (1.6%)',
      'Total Charges Patronales',
      'Coût Global Employeur',
      'Mode Paiement',
      'Statut',
    ];

    const rows = bulletinsDuMois.map((b) => [
      `"${b.bulletinNumero}"`,
      `"${b.employeMatricule}"`,
      `"${b.employeNomComplet}"`,
      `"${b.employePoste}"`,
      `"${b.employeDepartement}"`,
      `"${b.trancheLibelle}"`,
      b.salaireBase,
      b.sursalaire,
      b.primeAnciennete + b.primeRendement + b.autresPrimes,
      b.indemniteTransport,
      b.totalGainsBruts,
      b.salaireBrutImposable,
      b.cnpsRetraiteSalariale,
      b.cmuSalariale,
      b.totalRetenuesSocialesSalariales,
      b.itsSalariale,
      b.cnSalariale + b.igrSalariale,
      b.totalRetenuesFiscalesSalariales,
      b.totalAutresRetenues,
      b.totalRetenuesSalariales,
      b.netAPayer,
      b.cnpsRetraitePatronale,
      b.cnpsPrestationsFamiliales,
      b.cnpsAccidentTravail,
      b.fdfpPatronale,
      b.totalChargesPatronales,
      b.coutTotalEmployeur,
      `"${b.modePaiement}"`,
      `"${b.statut}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Livre_de_Paie_COSITI_${selectedMois}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Suppression d'un salarié
  const handleDeleteEmploye = async (emp: Employe) => {
    const confirmed = await dialog.confirm({
      title: 'Supprimer ce salarié',
      message: `Êtes-vous sûr de vouloir supprimer ${emp.nom} ${emp.prenom} (${emp.matricule}) du personnel ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
    });

    if (confirmed) {
      const res = await deleteEmploye(emp.id, '0000');
      if (res.success) {
        await dialog.alert({
          title: 'Salarié supprimé',
          message: 'Le profil salarié a été retiré du registre.',
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête Principal de la Rubrique DAF */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 sm:p-7 rounded-2xl shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold tracking-wide border border-emerald-500/30 uppercase flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" />
                Espace Direction Administrative & Financière (DAF)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-medium border border-blue-500/30">
                Conformité Code du Travail & CNPS
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Gestion de la Paie & Bulletins
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Calcul automatisé des prélèvements sociaux (CNPS, CMU) et fiscaux (ITS) selon les tranches légales prévues par la loi :
              <span className="text-emerald-300 font-semibold"> Moins de 60 000 FCFA</span> (Exonération),
              <span className="text-blue-300 font-semibold"> Égal à 60 000 FCFA</span> (Franchise fiscale) et
              <span className="text-purple-300 font-semibold"> Plus de 60 000 FCFA</span> (Barème progressif).
            </p>
          </div>

          {/* Sélecteur de Mois & Actions Rapides */}
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/15">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-300 font-medium">Mois de Paie :</span>
              <select
                value={selectedMois}
                onChange={(e) => setSelectedMois(e.target.value)}
                className="bg-slate-900 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-600 focus:ring-2 focus:ring-emerald-400 focus:outline-none cursor-pointer"
              >
                {moisDisponibles.map((m) => (
                  <option key={m} value={m}>
                    {m === '2026-03' ? 'Mars 2026' : m === '2026-02' ? 'Février 2026' : m === '2026-01' ? 'Janvier 2026' : m}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenererPaie}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              title="Calculer ou recalculer les bulletins du mois"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Générer la Paie</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cadre explicatif officiel du Régime Fiscal & Social Camerounais (DGI & CNPS) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Régime Fiscal & Social Officiel (République du Cameroun — CNPS & DGI)
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Plafond mensuel CNPS : 750 000 FCFA
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Tranche 1 */}
          <div className="p-3 rounded-lg border bg-emerald-50/70 border-emerald-200">
            <div className="flex items-center justify-between font-bold text-emerald-950 mb-1">
              <span>1. Moins de 60 000 FCFA</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-800">
                0 FCFA IRPP (Exonéré)
              </span>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              <strong>Fiscalité DGI :</strong> Exonération fiscale totale de plein droit (0 F IRPP, 0 F CAC, 0 F TDL).<br />
              <strong>Social CNPS :</strong> Cotisation retraite PVID (4,2% = 2 100 F pour 50k). Régime allégé.
            </p>
            <div className="mt-2 text-[10px] font-semibold text-emerald-700">
              Dans ce mois : {statsMois.nbMoins60k} salarié(s)
            </div>
          </div>

          {/* Tranche 2 */}
          <div className="p-3 rounded-lg border bg-blue-50/70 border-blue-200">
            <div className="flex items-center justify-between font-bold text-blue-950 mb-1">
              <span>2. Égal à 60 000 FCFA (Pivot)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-200/80 text-blue-800">
                Franchise IRPP (0 F)
              </span>
            </div>
            <p className="text-[11px] text-blue-900 leading-relaxed">
              <strong>Cotisable Référence Adhérents CNPS :</strong> 60 000 FCFA par défaut.<br />
              <strong>Prélèvements :</strong> CNPS PVID (4,2% = 2 520 F), CFC (1% = 600 F), TDL (250 F). <strong>Net : 56 630 FCFA</strong>.<br />
              <strong>Patronal CNPS :</strong> PVID (2 520 F) + PF (4 200 F) + AT (1 050 F) = 7 770 F.
            </p>
            <div className="mt-2 text-[10px] font-semibold text-blue-700">
              Dans ce mois : {statsMois.nbEgal60k} salarié(s)
            </div>
          </div>

          {/* Tranche 3 */}
          <div className="p-3 rounded-lg border bg-purple-50/70 border-purple-200">
            <div className="flex items-center justify-between font-bold text-purple-950 mb-1">
              <span>3. Plus de 60 000 FCFA</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-200/80 text-purple-800">
                IRPP Progressif
              </span>
            </div>
            <p className="text-[11px] text-purple-900 leading-relaxed">
              <strong>Fiscalité DGI :</strong> Barème IRPP progressif (10% à 35%) après déduction 30% frais pro et abattement légal de 500 000 F/an (41 667 F/mois) + CAC 10%.<br />
              <strong>Social CNPS :</strong> PVID (4,2% salarial), charges patronales 12,95% + FNE (1%) + CFC (1,5%).
            </p>
            <div className="mt-2 text-[10px] font-semibold text-purple-700">
              Dans ce mois : {statsMois.nbPlus60k} salarié(s)
            </div>
          </div>
        </div>
      </div>

      {/* Cartes de Synthèse Financière du Mois */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1 text-xs">
            <span className="font-medium">Masse Salariale Brute</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold font-mono text-slate-900">
            {statsMois.totalBrut.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">FCFA</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Total des salaires bruts ({statsMois.count} bulletins)
          </div>
        </div>

        <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800 mb-1 text-xs font-bold">
            <span>Net à Payer Personnel</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold font-mono text-emerald-900">
            {statsMois.totalNet.toLocaleString('fr-FR')} <span className="text-xs font-normal text-emerald-700">FCFA</span>
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 flex items-center justify-between">
            <span>Montant net versé</span>
            {statsMois.isAllValide ? (
              <span className="font-semibold text-emerald-800 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Validé DAF
              </span>
            ) : (
              <span className="font-semibold text-amber-700">En cours</span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1 text-xs">
            <span className="font-medium">Cotisations Sociales</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold font-mono text-slate-900">
            {(statsMois.totalSocialSalarial + statsMois.totalPatronal).toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">FCFA</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            CNPS + CMU (Salariés: {statsMois.totalSocialSalarial.toLocaleString('fr-FR')} F)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1 text-xs">
            <span className="font-medium">Impôts sur Salaires (ITS)</span>
            <BadgePercent className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold font-mono text-slate-900">
            {statsMois.totalFiscalSalarial.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">FCFA</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            À reverser à la DGI ({statsMois.nbPlus60k} salarié(s) assujettis)
          </div>
        </div>
      </div>

      {/* Navigation par Onglets Internes */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTabPaie('bulletins')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeTabPaie === 'bulletins'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Bulletins Personnel ({bulletinsPersonnelDuMois.length})</span>
          </button>

          <button
            onClick={() => setActiveTabPaie('adherents-cnps')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeTabPaie === 'adherents-cnps'
                ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-500/20'
                : 'bg-emerald-50/80 text-emerald-900 hover:bg-emerald-100 border border-emerald-300'
            }`}
          >
            <Coins className="w-4 h-4 text-emerald-600" />
            <span>Paie Adhérents CNPS (Cotisable 60k)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTabPaie === 'adherents-cnps'
                  ? 'bg-white text-emerald-900'
                  : 'bg-emerald-700 text-white'
              }`}
            >
              {immatAdherents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTabPaie('personnel')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeTabPaie === 'personnel'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Personnel & Contrats ({employes.length})</span>
          </button>

          <button
            onClick={() => setActiveTabPaie('declarations')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeTabPaie === 'declarations'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Déclarations CNPS & Fiscales</span>
          </button>
        </div>

        {/* Boutons d'Action Globaux */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium shadow-sm transition-colors"
            title="Exporter le livre de paie en CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Livre de Paie (CSV)</span>
          </button>

          <button
            onClick={() => {
              setEmployeToEdit(null);
              setIsEmployeModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Salarié</span>
          </button>

          <button
            onClick={handleValiderPaie}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            title="Valider la paie et transférer en dépense comptable"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Clôturer Paie & Dépense DAF</span>
          </button>
        </div>
      </div>

      {/* ONGLET 1 : BULLETINS DU MOIS */}
      {activeTabPaie === 'bulletins' && (
        <div className="space-y-4">
          {/* Barre de Recherche et Filtres */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, matricule ou poste..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Filtre par Tranche */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Tranche :</span>
                <select
                  value={filterTranche}
                  onChange={(e) => setFilterTranche(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Toutes les tranches</option>
                  <option value="MOINS_DE_60K">&lt; 60 000 F (Exonéré 0% ITS)</option>
                  <option value="EGAL_60K">= 60 000 F (Franchise 0% ITS)</option>
                  <option value="PLUS_DE_60K">&gt; 60 000 F (ITS Progressif)</option>
                </select>
              </div>

              {/* Filtre par Département */}
              <select
                value={filterDepartement}
                onChange={(e) => setFilterDepartement(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Tous les départements</option>
                <option value="Caisse & Enregistrement">Caisse & Enregistrement</option>
                <option value="Opérations & Recouvrement">Opérations & Recouvrement</option>
                <option value="Finances & Comptabilité">Finances & Comptabilité</option>
                <option value="Logistique & Services Généraux">Logistique & Services Généraux</option>
              </select>
            </div>
          </div>

          {/* Tableau des Bulletins */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5">Matricule & Salarié</th>
                    <th className="py-3 px-3">Poste & Département</th>
                    <th className="py-3 px-3">Tranche Légale</th>
                    <th className="py-3 px-3 text-right">Salaire Brut</th>
                    <th className="py-3 px-3 text-right">CNPS PVID (4,2%)</th>
                    <th className="py-3 px-3 text-right">CFC (1%) & TDL</th>
                    <th className="py-3 px-3 text-right">IRPP & CAC</th>
                    <th className="py-3 px-3 text-right font-bold text-slate-900">Net à Payer</th>
                    <th className="py-3 px-3 text-center">Statut</th>
                    <th className="py-3 px-3.5 text-right">Fiche de Paie / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredBulletins.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Aucun bulletin trouvé pour {selectedMois}. Cliquez sur "Générer la Paie" pour calculer les fiches.
                      </td>
                    </tr>
                  ) : (
                    filteredBulletins.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 font-medium">
                          <div className="font-bold text-slate-900">{b.employeNomComplet}</div>
                          <div className="text-[11px] font-mono text-slate-500">{b.employeMatricule}</div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{b.employePoste}</div>
                          <div className="text-[11px] text-slate-500">{b.employeDepartement}</div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              b.trancheLoi === 'MOINS_DE_60K'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : b.trancheLoi === 'EGAL_60K'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : 'bg-purple-50 text-purple-800 border-purple-300'
                            }`}
                          >
                            {b.trancheLoi === 'MOINS_DE_60K'
                              ? '< 60 000 F (Exonéré DGI)'
                              : b.trancheLoi === 'EGAL_60K'
                              ? '= 60 000 F (Franchise DGI)'
                              : '> 60 000 F (IRPP Progressif)'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-medium">
                          {b.totalGainsBruts.toLocaleString('fr-FR')} F
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-rose-700 font-medium">
                          {(b.cnpsPvidSalariale || b.cnpsRetraiteSalariale) > 0
                            ? `-${(b.cnpsPvidSalariale || b.cnpsRetraiteSalariale).toLocaleString('fr-FR')}`
                            : '0'} F
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-rose-700 font-medium">
                          {((b.cfcSalariale || 0) + (b.tdlSalariale || 0)) > 0
                            ? `-${((b.cfcSalariale || 0) + (b.tdlSalariale || 0)).toLocaleString('fr-FR')}`
                            : '0'} F
                        </td>

                        <td className="py-3 px-3 text-right font-mono">
                          {((b.irppSalariale || b.itsSalariale || 0) + (b.cacSalariale || b.cnSalariale || 0)) > 0 ? (
                            <span className="text-rose-700 font-medium">
                              -{((b.irppSalariale || b.itsSalariale || 0) + (b.cacSalariale || b.cnSalariale || 0)).toLocaleString('fr-FR')} F
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold text-[11px]">
                              0 F (Exonéré)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900 bg-emerald-50/40 text-sm">
                          {b.netAPayer.toLocaleString('fr-FR')} F
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              b.statut === 'Validé DAF' || b.statut === 'Payé'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            {b.statut}
                          </span>
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedBulletinForView(b)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                              title="Afficher et télécharger la fiche de paie officielle"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Bulletin</span>
                            </button>

                            <button
                              onClick={() => setBulletinToEdit(b)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Ajuster primes ou acomptes"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={async () => {
                                const confirmed = await dialog.confirm({
                                  title: 'Supprimer ce bulletin',
                                  message: `Supprimer le bulletin de ${b.employeNomComplet} pour ${b.periodeLibelle} ?`,
                                  confirmText: 'Supprimer',
                                  cancelText: 'Annuler',
                                });
                                if (confirmed) deleteBulletinPaie(b.id);
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Supprimer ce bulletin"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* ONGLET 2 : PAIE DES ADHÉRENTS IMMATRICULÉS CNPS (COTISABLE DE 60 000 FCFA PAR DÉFAUT) */}
      {activeTabPaie === 'adherents-cnps' && (
        <div className="space-y-4">
          {/* Bannière explicative officielle Régime CNPS Cameroun pour Adhérents */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-emerald-700/50 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Sécurité Sociale des Indépendants — CNPS Cameroun
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                    Assiette forfaitaire : 60 000 FCFA
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                  <span>Gestion de la Paie des Adhérents Immatriculés CNPS</span>
                </h2>
                <p className="text-xs text-emerald-100/90 max-w-3xl mt-1 leading-relaxed">
                  Conformément au système fiscal et social camerounais, les adhérents immatriculés disposant d'un numéro CNPS officiel
                  sont paramétrés avec une <strong>assiette cotisable de 60 000 FCFA par défaut</strong>.
                  Prélèvements salariaux : <strong>CNPS PVID 4,20% (2 520 F)</strong>, <strong>CFC 1,00% (600 F)</strong>, <strong>TDL (250 F)</strong>,
                  <strong> 0 FCFA IRPP (Franchise légale DGI)</strong>. Net mensuel garanti : <strong>56 630 FCFA</strong>.
                </p>
              </div>

              {/* Boutons d'Action Rapide de la Rubrique Adhérents */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
                <button
                  onClick={handleGenererPaieAdherents}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-98"
                  title="Générer ou recalculer les fiches de paie et déclarations CNPS pour tous les adhérents immatriculés (60 000 F)"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Générer Paie Adhérents (60k)</span>
                </button>

                <button
                  onClick={handleExportAdherentsCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 transition-all cursor-pointer"
                  title="Télécharger l'état récapitulatif des cotisations et déclarations des adhérents en CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Export Livre Adhérents</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cartes KPI Synthèse Adhérents CNPS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1 text-xs">
                <span className="font-semibold">Adhérents Immatriculés</span>
                <BadgeCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-extrabold font-mono text-slate-900">
                {statsAdherentsCnps.count}{' '}
                <span className="text-xs font-normal text-slate-500">affilié(s) CNPS</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Porteurs d'un n° officiel de sécurité sociale
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1 text-xs">
                <span className="font-semibold">Masse Cotisable Référence</span>
                <Coins className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-extrabold font-mono text-slate-900">
                {statsAdherentsCnps.masseCotisableTotal.toLocaleString('fr-FR')}{' '}
                <span className="text-xs font-normal text-slate-500">FCFA</span>
              </div>
              <div className="text-[11px] text-blue-700 mt-1 font-medium">
                60 000 FCFA / adhérent par défaut
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1 text-xs">
                <span className="font-semibold">Retenues CNPS & Fiscales</span>
                <ShieldCheck className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-xl font-extrabold font-mono text-slate-900">
                {(statsAdherentsCnps.totalCnpsSalariale + statsAdherentsCnps.totalCfcSalarial + statsAdherentsCnps.totalTdl).toLocaleString('fr-FR')}{' '}
                <span className="text-xs font-normal text-slate-500">FCFA</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                PVID: {statsAdherentsCnps.totalCnpsSalariale.toLocaleString('fr-FR')} F • CFC/TDL: {(statsAdherentsCnps.totalCfcSalarial + statsAdherentsCnps.totalTdl).toLocaleString('fr-FR')} F
              </div>
            </div>

            <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 shadow-xs">
              <div className="flex items-center justify-between text-emerald-900 mb-1 text-xs">
                <span className="font-bold">Total Déclaratif CNPS</span>
                <Landmark className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-xl font-extrabold font-mono text-emerald-950">
                {statsAdherentsCnps.totalDeclareCnps.toLocaleString('fr-FR')}{' '}
                <span className="text-xs font-normal text-emerald-800">FCFA</span>
              </div>
              <div className="text-[11px] text-emerald-800 mt-1 font-semibold flex items-center justify-between">
                <span>PVID + PF + AT/MP</span>
                <span>{statsAdherentsCnps.bulletinsGeneresCount} bulletin(s) généré(s)</span>
              </div>
            </div>
          </div>

          {/* Barre de Recherche et Filtre Situation Enfants */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, matricule ou n° CNPS..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Filtre Situation Enfants */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">Situation familiale :</span>
                <select
                  value={adherentFilterEnfant}
                  onChange={(e) => setAdherentFilterEnfant(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="ALL">Tous les adhérents immatriculés ({immatAdherents.length})</option>
                  <option value="AVEC_ENFANTS">Avec enfants à charge ({immatAdherents.filter((a) => !a.sansEnfant).length})</option>
                  <option value="SANS_ENFANT">Sans enfant à charge (Exonéré PF) ({immatAdherents.filter((a) => a.sansEnfant).length})</option>
                </select>
              </div>

              <button
                onClick={handleGenererPaieAdherents}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recalculer les Bulletins ({selectedMois})</span>
              </button>
            </div>
          </div>

          {/* Tableau des Adhérents Immatriculés avec Cotisable 60 000 FCFA */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5">Matricule & Adhérent</th>
                    <th className="py-3 px-3">N° CNPS Officiel</th>
                    <th className="py-3 px-3">Métier & Situation</th>
                    <th className="py-3 px-3 text-right">Cotisable CNPS</th>
                    <th className="py-3 px-3 text-right">CNPS PVID (4,2%)</th>
                    <th className="py-3 px-3 text-right">CFC (1%) & TDL</th>
                    <th className="py-3 px-3 text-right">IRPP (DGI)</th>
                    <th className="py-3 px-3 text-right font-bold text-slate-900">Net Référent</th>
                    <th className="py-3 px-3 text-right">Patronal CNPS</th>
                    <th className="py-3 px-3.5 text-right">Fiche / Ajustement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAdherentsCnps.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Aucun adhérent immatriculé ne correspond à votre recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredAdherentsCnps.map(({ adherent: adh, bulletin }) => {
                      // chaque montant est celui du bulletin calculé par le serveur (enregistré, sinon projection du barème)
                      const cotisable = adh.salaireCotisableCnps;
                      const cnpsSal = bulletin.cnpsPvidSalariale;
                      const cfcSal = bulletin.cfcSalariale;
                      const tdl = bulletin.tdlSalariale;
                      const net = bulletin.netAPayer;
                      const pvidPat = bulletin.cnpsPvidPatronale;
                      const pfPat = bulletin.cnpsPfPatronale;
                      const totalPatCnps = bulletin.totalCnpsPatronale ?? 0;

                      return (
                        <tr key={adh.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-900">
                              {adh.nom} {adh.prenom}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {adh.matricule}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <BadgeCheck className="w-3 h-3 text-emerald-600" />
                              <span>{adh.numeroCnps || 'CNPS-2026-ENCOURS'}</span>
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">
                              {adh.profession || 'Travailleur indépendant'}
                            </div>
                            <div className="text-[10px] mt-0.5">
                              {adh.sansEnfant ? (
                                <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                  Sans enfant (Exonéré PF)
                                </span>
                              ) : (
                                <span className="text-slate-500">
                                  {adh.nombreEnfants || 0} enfant(s) à charge
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right font-mono">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="font-extrabold text-slate-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {cotisable.toLocaleString('fr-FR')} F
                              </span>
                              <button
                                onClick={() => {
                                  setAdherentForCotisableEdit(adherents.find((x) => x.id === adh.id) || null);
                                  setCotisableInputValue(cotisable);
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Modifier l'assiette cotisable de cet adhérent"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              {cotisable === 60000 ? 'Valeur standard par défaut' : 'Valeur personnalisée'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-rose-700 font-medium">
                            -{cnpsSal.toLocaleString('fr-FR')} F
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-rose-700 font-medium">
                            -{(cfcSal + tdl).toLocaleString('fr-FR')} F
                            <span className="text-[9px] text-slate-400 block font-normal">
                              CFC: {cfcSal} F • TDL: {tdl} F
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono">
                            <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {bulletin.irppSalariale > 0 ? `-${bulletin.irppSalariale.toLocaleString('fr-FR')} F` : '0 F (Exonéré)'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-900 bg-emerald-50/50 text-sm">
                            {net.toLocaleString('fr-FR')} F
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-slate-700">
                            {totalPatCnps.toLocaleString('fr-FR')} F
                            <span className="text-[9px] text-slate-400 block font-normal">
                              PVID: {pvidPat} F {adh.sansEnfant ? '' : `• PF: ${pfPat} F`}
                            </span>
                          </td>

                          <td className="py-3 px-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedBulletinForView(bulletin as unknown as BulletinPaie);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                                title="Afficher et télécharger la fiche de paie et déclaration CNPS de cet adhérent"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Fiche / Bulletin</span>
                              </button>

                              <button
                                onClick={() => {
                                  setAdherentForCotisableEdit(adherents.find((x) => x.id === adh.id) || null);
                                  setCotisableInputValue(cotisable);
                                }}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Modifier l'assiette cotisable"
                              >
                                <Sliders className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}

      {/* ONGLET 3 : REGISTRE DU PERSONNEL */}
      {activeTabPaie === 'personnel' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Registre Unique du Personnel COSITI
                </h3>
                <p className="text-xs text-slate-500">
                  Salariés déclarés, salaires de base contractuels et affiliation sociale CNPS / CMU
                </p>
              </div>

              <button
                onClick={() => {
                  setEmployeToEdit(null);
                  setIsEmployeModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un Salarié</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5">Matricule</th>
                    <th className="py-3 px-3">Nom & Prénoms</th>
                    <th className="py-3 px-3">Poste & Département</th>
                    <th className="py-3 px-3">Contrat</th>
                    <th className="py-3 px-3 text-right">Salaire Base</th>
                    <th className="py-3 px-3">Tranche Légale</th>
                    <th className="py-3 px-3">Affiliation CNPS & CMU</th>
                    <th className="py-3 px-3">Règlement</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {employes.map((emp) => {
                    const tranche = emp.trancheLoi ?? { tranche: 'PLUS_DE_60K' as const, libelle: '', explication: '' };
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                          {emp.matricule}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {emp.nom} {emp.prenom}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">{emp.poste}</div>
                          <div className="text-[11px] text-slate-500">{emp.departement}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                            {emp.typeContrat}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {emp.salaireBase.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              tranche.tranche === 'MOINS_DE_60K'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : tranche.tranche === 'EGAL_60K'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : 'bg-purple-50 text-purple-800 border-purple-300'
                            }`}
                          >
                            {tranche.tranche === 'MOINS_DE_60K'
                              ? '< 60 000 F (Exonéré)'
                              : tranche.tranche === 'EGAL_60K'
                              ? '= 60 000 F (Franchise)'
                              : '> 60 000 F (ITS)'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          <div>CNPS: {emp.numeroCnps || 'En attente'}</div>
                          <div>CMU: {emp.numeroCmu || 'Non renseigné'}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <div>{emp.modePaiement}</div>
                          {emp.banqueNom && <div className="text-[11px] text-slate-400">{emp.banqueNom}</div>}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setEmployeToEdit(emp);
                                setIsEmployeModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Modifier ce profil salarié"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEmploye(emp)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Supprimer ce salarié"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 4 : DÉCLARATIONS SOCIALES (CNPS) & FISCALES (DGI CAMEROUN) */}
      {activeTabPaie === 'declarations' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Déclaration CNPS Cameroun */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Déclaration Sociale Mensuelle — CNPS Cameroun ({selectedMois})
                  </h3>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  Caisse Nationale (CNPS)
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Masse globale soumise à cotisation (Plafond 750 000 F/mois) :</span>
                  <span className="font-mono font-bold text-slate-800">
                    {(recap?.declarations.cnps.masseSoumise ?? 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Pensions Vieillesse, Invalidité & Décès (PVID 4,20% Salariale) :</span>
                  <span className="font-mono font-medium text-rose-700">
                    {(recap?.declarations.cnps.pvidSalariale ?? 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">PVID Part Patronale (4,20%) :</span>
                  <span className="font-mono font-medium text-slate-700">
                    {(recap?.declarations.cnps.pvidPatronale ?? 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Prestations Familiales PF (7,00% patronal, sauf sans enfant) :</span>
                  <span className="font-mono font-medium text-slate-700">
                    {(recap?.declarations.cnps.prestationsFamiliales ?? 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Accidents du Travail AT/MP (1,75% Groupe A Tertiaire) :</span>
                  <span className="font-mono font-medium text-slate-700">
                    {(recap?.declarations.cnps.accidentsTravail ?? 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-bold text-slate-900 border-t border-slate-300">
                  <span>Total Cotisations à verser à la CNPS Cameroun :</span>
                  <span className="font-mono text-emerald-800">
                    {(recap?.declarations.cnps.total ?? 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Déclaration Fiscale DGI & Parafiscale Cameroun */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <BadgePercent className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Déclaration Fiscale DGI & Parafiscale Cameroun ({selectedMois})
                  </h3>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold">
                  DGI & Commune
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total bulletins enregistrés :</span>
                  <span className="font-mono font-bold text-slate-800">{recap?.declarations.fiscal.nombreBulletins ?? 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700">
                  <span>Revenus exonérés d'IRPP (&le; 60 000 FCFA dont adhérents 60k) :</span>
                  <span className="font-mono font-bold">
                    {recap?.declarations.fiscal.exoneres ?? 0}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 text-purple-800">
                  <span>Salariés assujettis IRPP progressif (&gt; 60 000 FCFA) :</span>
                  <span className="font-mono font-bold">
                    {recap?.declarations.fiscal.assujettis ?? 0}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">IRPP prélevé à la source :</span>
                  <span className="font-mono font-medium text-slate-800">
                    {(recap?.declarations.fiscal.irpp ?? 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Centimes Additionnels Communaux (CAC 10% IRPP) :</span>
                  <span className="font-mono font-medium text-slate-800">
                    {(recap?.declarations.fiscal.cac ?? 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Crédit Foncier du Cameroun (CFC Salarial 1% + Patronal 1,5%) :</span>
                  <span className="font-mono font-medium text-slate-800">
                    {(recap?.declarations.fiscal.cfc ?? 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Taxe de Développement Local (TDL Commune) :</span>
                  <span className="font-mono font-medium text-slate-800">
                    {(recap?.declarations.fiscal.tdl ?? 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Fonds National de l'Emploi (FNE Patronal 1,00%) :</span>
                  <span className="font-mono font-medium text-slate-800">
                    {(recap?.declarations.fiscal.fne ?? 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-bold text-slate-900 border-t border-slate-300">
                  <span>Total Déclaratif Fiscal DGI & Commune :</span>
                  <span className="font-mono text-purple-800">
                    {(recap?.declarations.fiscal.total ?? 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALES */}
      {/* 1. Modal Fiche de Paie / Téléchargement */}
      <BulletinPaieModal
        bulletin={selectedBulletinForView}
        onClose={() => setSelectedBulletinForView(null)}
        parametres={parametres}
      />

      {/* 2. Modal Ajustement Variables du Bulletin */}
      <BulletinEditModal
        bulletin={bulletinToEdit}
        employe={employes.find((e) => e.id === bulletinToEdit?.employeId)}
        isOpen={Boolean(bulletinToEdit)}
        onClose={() => setBulletinToEdit(null)}
        onSave={(updated) => {
          saveBulletinPaie(updated);
        }}
      />

      {/* 3. Modal Nouveau / Modification Salarié */}
      <EmployeModal
        isOpen={isEmployeModalOpen}
        onClose={() => {
          setIsEmployeModalOpen(false);
          setEmployeToEdit(null);
        }}
        employeToEdit={employeToEdit}
        onSave={(data) => {
          if (employeToEdit) {
            updateEmploye(employeToEdit.id, data);
          } else {
            addEmploye(data);
          }
        }}
        banquesDisponibles={banques}
      />

      {/* 4. Modal Ajustement de l'Assiette Cotisable d'un Adhérent (60 000 FCFA par défaut) */}
      {adherentForCotisableEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Ajuster l'Assiette Cotisable CNPS
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {adherentForCotisableEdit.nom} {adherentForCotisableEdit.prenom} ({adherentForCotisableEdit.matricule})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAdherentForCotisableEdit(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Montant mensuel cotisable (FCFA) :
                </label>
                <input
                  type="number"
                  min="20000"
                  step="5000"
                  value={cotisableInputValue}
                  onChange={(e) => setCotisableInputValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Raccourcis rapides */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  Montants standards de référence :
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[60000, 75000, 100000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCotisableInputValue(val)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        cotisableInputValue === val
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val.toLocaleString('fr-FR')} F
                      {val === 60000 && <span className="block text-[9px] font-normal opacity-90">(Défaut)</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulation en direct : le bulletin est calculé par le serveur (POST /paie/adherents/:id/apercu) */}
              {(() => {
                const sim = simulationAssiette;
                const cnpsSal = sim?.cnpsPvidSalariale ?? 0;
                const cfcSal = sim?.cfcSalariale ?? 0;
                const tdl = sim?.tdlSalariale ?? 0;
                const net = sim?.netAPayer ?? 0;
                const totalPat = sim?.totalCnpsPatronale ?? 0;

                return (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
                    <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 mb-1">
                      Simulation Régime Fiscal & Social Cameroun (calcul serveur) :
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">CNPS PVID Salariale (4,2%) :</span>
                      <span className="font-mono font-bold text-rose-700">-{cnpsSal.toLocaleString('fr-FR')} F</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">CFC Salarial (1%) :</span>
                      <span className="font-mono text-rose-700">-{cfcSal.toLocaleString('fr-FR')} F</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">TDL Commune :</span>
                      <span className="font-mono text-rose-700">-{tdl.toLocaleString('fr-FR')} F</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">IRPP Cameroun :</span>
                      <span className="font-mono text-emerald-700 font-bold">
                        {sim && sim.irppSalariale > 0 ? `-${sim.irppSalariale.toLocaleString('fr-FR')} F` : '0 F (Exonéré DGI)'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                      <span>Net Référent Garanti :</span>
                      <span className="font-mono text-emerald-800 text-xs">{net.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>Charges Patronales CNPS (PVID+PF+AT) :</span>
                      <span className="font-mono">{totalPat.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdherentForCotisableEdit(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleSaveCotisable(adherentForCotisableEdit, cotisableInputValue)}
                className="px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Enregistrer l'Assiette
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
