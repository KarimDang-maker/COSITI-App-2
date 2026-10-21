import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatFCFA, formatDateShort } from '../utils/helpers';
import { useApiQuery } from '../api/hooks';
import type { EtatMensuel } from '../api/models';
import {
  exportMonthlyReportExcel,
  exportToExcel,
  exportRapprochementBanqueCnpsExcel,
  exportEtatEncaissementsDecaissementsExcel,
} from '../utils/exportUtils';
import {
  generateReportPdf,
  generateEtatEncaissementsDecaissementsPdf,
} from '../utils/pdfReportGenerator';
import { RapportPrintModal } from './RapportPrintModal';
import {
  CalendarRange,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Users,
  TrendingUp,
  Wallet,
  Building,
  Building2,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  UserCheck,
  Landmark,
  Download,
  Shield,
  TrendingDown,
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

const ANNEES_LIST = [2024, 2025, 2026, 2027];

type OngletEtat =
  | 'NOMINATIF'
  | 'TRANSACTIONS'
  | 'SEUILS_CNPS'
  | 'BALANCE_FINANCIERE'
  | 'RAPPROCHEMENT_BANQUE_CNPS';

export const EtatsMensuelsView: React.FC = () => {
  const { parametres, signataires } = useApp();

  // État de sélection de période mensuelle (Mars 2026 par défaut ou mois courant)
  const [selectedMois, setSelectedMois] = useState<string>('Mars');
  const [selectedAnnee, setSelectedAnnee] = useState<number>(2026);
  const [activeSubTab, setActiveSubTab] = useState<OngletEtat>('NOMINATIF');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Filtres internes
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAdherentStatut, setFilterAdherentStatut] = useState<
    'TOUS' | 'COTISANTS' | 'NON_COTISANTS' | 'DEJA_IMMATRICULE'
  >('TOUS');

  // Navigation mois précédent / suivant
  const handlePrevMonth = () => {
    const currentIndex = MOIS_LIST.indexOf(selectedMois);
    if (currentIndex > 0) {
      setSelectedMois(MOIS_LIST[currentIndex - 1]);
    } else {
      setSelectedMois(MOIS_LIST[11]);
      setSelectedAnnee((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = MOIS_LIST.indexOf(selectedMois);
    if (currentIndex < 11) {
      setSelectedMois(MOIS_LIST[currentIndex + 1]);
    } else {
      setSelectedMois(MOIS_LIST[0]);
      setSelectedAnnee((prev) => prev + 1);
    }
  };

  // Tous les agrégats de l'état mensuel (totaux, ventilations, état nominatif, rapprochement bancaire, flux de
  // trésorerie) sont calculés par le serveur : GET /rapports/etat-mensuel. L'écran n'affiche et ne filtre que.
  const { data: etat } = useApiQuery<EtatMensuel>('/rapports/etat-mensuel', { mois: selectedMois, annee: selectedAnnee });
  const fin = etat?.finances ?? null;
  const rapprochement = fin?.rapprochement ?? null;

  const cotisationsMois = etat?.cotisations.liste ?? [];
  const depensesMois = fin?.depenses.liste ?? [];
  const versementsMois = fin?.versements.liste ?? [];

  const totalCotisationsMois = etat?.cotisations.total ?? 0;
  const totalDepensesMois = fin?.depenses.total ?? 0;
  const totalVersementsMois = fin?.versements.total ?? 0;
  const soldeNetMois = fin?.soldeNet ?? totalCotisationsMois;

  // Rapprochement Banque & Réserve CNPS du mois
  const totalFondsBanqueMois = rapprochement?.fondsBanque.total ?? 0;
  const totalReserveCnpsMois = rapprochement?.reserveCnps.total ?? totalCotisationsMois;
  const soldeReelBanqueMois = rapprochement?.soldeReelBanque ?? 0;
  const couvertureCnpsMois = rapprochement?.tauxCouverture ?? 0;

  // Encaissements & Décaissements (Exploitation vs Apport PCA) du mois
  const depensesMoisCnps = rapprochement?.flux.decaissementsExploitation.depenses ?? [];
  const totalDecaissementsExploitationCnpsMois = rapprochement?.flux.decaissementsExploitation.total ?? 0;
  const depensesMoisPca = rapprochement?.flux.decaissementsApportPca.depenses ?? [];
  const totalDecaissementsApportPcaMois = rapprochement?.flux.decaissementsApportPca.total ?? 0;
  const adherentsReserveMois = rapprochement?.reserveCnps.adherents ?? [];

  const statsParMode = etat?.statsParMode ?? [];
  const statsParAgent = etat?.statsParAgent ?? [];

  // Relevé nominatif par adhérent (calculé par le serveur)
  const etatNominatif = etat?.nominatif ?? [];

  // Filtrage d'affichage du tableau nominatif (recherche et boutons de filtre)
  const etatNominatifFiltre = useMemo(() => {
    return etatNominatif.filter((item) => {
      if (!item || !item.adherent) return false;
      const q = (searchTerm || '').toLowerCase().trim();
      const mat = (item.adherent.matricule || '').toLowerCase();
      const nomComplet = `${item.adherent.nom || ''} ${item.adherent.prenom || ''}`.toLowerCase();
      const tel = (item.adherent.telephone || '').toLowerCase();
      const numCnps = (item.adherent.numeroCnps || '').toLowerCase();

      const matchSearch = !q || mat.includes(q) || nomComplet.includes(q) || tel.includes(q) || numCnps.includes(q);

      const matchStatut =
        filterAdherentStatut === 'TOUS' ||
        (filterAdherentStatut === 'COTISANTS' && item.aCotiseCeMois) ||
        (filterAdherentStatut === 'NON_COTISANTS' && !item.aCotiseCeMois) ||
        (filterAdherentStatut === 'DEJA_IMMATRICULE' && item.estImmatricule);

      return matchSearch && matchStatut;
    });
  }, [etatNominatif, searchTerm, filterAdherentStatut]);

  // Décomptes par statut pour les boutons de filtre (calculés par le serveur)
  const countsParStatut = {
    tous: etat?.comptes.tous ?? 0,
    cotisants: etat?.comptes.cotisants ?? 0,
    nonCotisants: etat?.comptes.nonCotisants ?? 0,
    dejaImmatricules: etat?.comptes.dejaImmatricules ?? 0,
  };

  // Total cotisé pour les adhérents actuellement filtrés (somme exacte au centime)
  const totalCotiseFiltre = useMemo(
    () => Math.round(etatNominatifFiltre.reduce((sum, item) => sum + Math.round((item.montantMois || 0) * 100), 0)) / 100,
    [etatNominatifFiltre]
  );

  // Franchissements du seuil dans le mois (calculés par le serveur)
  const franchissementsMois = etatNominatif.filter((item) => item.seuil15000Atteint && item.aCotiseCeMois);

  // Exportation globale mensuelle en Excel : mise en forme de l'état calculé par le serveur
  const handleExportMensuelComplet = () => {
    if (etat) exportMonthlyReportExcel({ etat, parametres });
  };

  // Exportation du tableau actif
  const handleExportTableauActif = () => {
    if (activeSubTab === 'NOMINATIF') {
      const exportData = etatNominatifFiltre.map((item) => ({
        Matricule: item.adherent.matricule,
        'Nom & Prénoms': `${item.adherent.nom} ${item.adherent.prenom}`,
        Téléphone: item.adherent.telephone,
        'Tarif Journalier': item.adherent.tarifJournalier,
        'Cotisé ce Mois (FCFA)': item.montantMois,
        'Jours Couverts ce Mois': item.nbJoursMois,
        'Versements ce Mois': item.nbVersementsMois,
        'Cumul Fin de Mois (FCFA)': item.cumulTotal,
        'Seuil 15 000 F': item.seuil15000Atteint ? 'OUI' : 'NON',
        'Statut CNPS': item.adherent.statutImmatriculation,
        'N° CNPS': item.adherent.numeroCnps || '',
        'Déjà Immatriculé': item.estImmatricule ? 'OUI' : 'NON',
        Gestionnaire: item.gestionnaireNom,
      }));

      let fileSuffix = '';
      if (filterAdherentStatut === 'DEJA_IMMATRICULE') fileSuffix = '_Deja_Immatricules';
      else if (filterAdherentStatut === 'COTISANTS') fileSuffix = '_Cotisants';
      else if (filterAdherentStatut === 'NON_COTISANTS') fileSuffix = '_NonCotisants';

      exportToExcel(exportData, `COSITI_Etat_Nominatif${fileSuffix}_${selectedMois}_${selectedAnnee}`);
    } else if (activeSubTab === 'TRANSACTIONS') {
      const exportData = cotisationsMois.map((c) => ({
        Date: c.datePaiement,
        Matricule: c.matricule,
        Adhérent: c.adherentNomPrenom,
        'Montant (FCFA)': c.montant,
        'Mode de paiement': c.modePaiement,
        Référence: c.reference || '',
        'Agent Enregistreur': c.agentEnregistreur,
        Observations: c.observations || '',
      }));
      exportToExcel(exportData, `COSITI_Versements_${selectedMois}_${selectedAnnee}`);
    } else {
      handleExportMensuelComplet();
    }
  };

  const getCurrentReportData = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let title = `État Mensuel - ${selectedMois} ${selectedAnnee}`;
    let desc = `Rapport officiel de clôture de période ${selectedMois} ${selectedAnnee}`;
    let rawData: any[] = [];

    if (activeSubTab === 'NOMINATIF') {
      let filterPrecision = '';
      if (filterAdherentStatut === 'DEJA_IMMATRICULE') {
        title = `État Nominatif des Adhérents Déjà Immatriculés CNPS - ${selectedMois} ${selectedAnnee}`;
        filterPrecision = ' • Filtre : Adhérents déjà immatriculés uniquement';
      } else if (filterAdherentStatut === 'COTISANTS') {
        title = `État Nominatif des Adhérents Cotisants - ${selectedMois} ${selectedAnnee}`;
        filterPrecision = ' • Filtre : Ayant cotisé ce mois';
      } else if (filterAdherentStatut === 'NON_COTISANTS') {
        title = `État Nominatif des Adhérents Sans Versement - ${selectedMois} ${selectedAnnee}`;
        filterPrecision = ' • Filtre : Aucun versement ce mois';
      } else {
        title = `État Nominatif des Adhérents - ${selectedMois} ${selectedAnnee}`;
      }
      desc = `Liste nominative des cotisations, jours couverts et cumuls du mois${filterPrecision}`;
      headers = [
        'Matricule',
        'Nom & Prénoms',
        'Téléphone',
        'Tarif/Jour',
        'Cotisé ce Mois',
        'Jours',
        'Cumul Total',
        'Seuil 15k',
        'Statut CNPS',
        'N° CNPS',
      ];
      rows = etatNominatifFiltre.map((item) => [
        item.adherent.matricule,
        `${item.adherent.nom} ${item.adherent.prenom}`,
        item.adherent.telephone,
        `${item.adherent.tarifJournalier} F`,
        formatFCFA(item.montantMois),
        `${item.nbJoursMois} j`,
        formatFCFA(item.cumulTotal),
        item.seuil15000Atteint ? 'OUI' : 'NON',
        item.adherent.statutImmatriculation,
        item.adherent.numeroCnps || '—',
      ]);
      rawData = etatNominatifFiltre.map((item) => ({
        Matricule: item.adherent.matricule,
        Nom: item.adherent.nom,
        Prénom: item.adherent.prenom,
        CotiséCeMois: item.montantMois,
        Jours: item.nbJoursMois,
        CumulTotal: item.cumulTotal,
        StatutCNPS: item.adherent.statutImmatriculation,
        NumeroCNPS: item.adherent.numeroCnps || '',
        DejaImmatricule: item.estImmatricule ? 'OUI' : 'NON',
      }));
    } else if (activeSubTab === 'TRANSACTIONS') {
      title = `Journal des Versements - ${selectedMois} ${selectedAnnee}`;
      desc = `Enregistrements chronologiques des cotisations perçues dans le mois`;
      headers = ['Date', 'Matricule', 'Adhérent', 'Montant', 'Mode', 'Référence', 'Agent'];
      rows = cotisationsMois.map((c) => [
        formatDateShort(c.datePaiement),
        c.matricule,
        c.adherentNomPrenom,
        formatFCFA(c.montant),
        c.modePaiement,
        c.reference || '—',
        c.agentEnregistreur,
      ]);
      rawData = cotisationsMois.map((c) => ({
        Date: c.datePaiement,
        Matricule: c.matricule,
        Adhérent: c.adherentNomPrenom,
        Montant: c.montant,
        Mode: c.modePaiement,
        Agent: c.agentEnregistreur,
      }));
    } else if (activeSubTab === 'BALANCE_FINANCIERE') {
      title = `Bilan Financier & Clôture - ${selectedMois} ${selectedAnnee}`;
      desc = `Indicateurs consolidés et solde net de la période`;
      headers = ['Rubrique', 'Montant (FCFA)', 'Observations'];
      rows = [
        ['Total Cotisations Encaissées', formatFCFA(totalCotisationsMois), `${cotisationsMois.length} encaissements`],
        ['Total Dépenses Engagées', formatFCFA(totalDepensesMois), `${depensesMois.length} opérations`],
        ['Total Versements Bancaires', formatFCFA(totalVersementsMois), `${versementsMois.length} bordereaux`],
        ['Solde Net de Clôture', formatFCFA(soldeNetMois), 'Ressources nettes'],
      ];
      rawData = [
        { Rubrique: 'Total Cotisations Encaissées', Montant: totalCotisationsMois },
        { Rubrique: 'Total Dépenses Engagées', Montant: totalDepensesMois },
        { Rubrique: 'Total Versements Bancaires', Montant: totalVersementsMois },
        { Rubrique: 'Solde Net de Clôture', Montant: soldeNetMois },
      ];
    } else if (activeSubTab === 'RAPPROCHEMENT_BANQUE_CNPS') {
      title = `Rapprochement Bancaire & Réserve CNPS - ${selectedMois} ${selectedAnnee}`;
      desc = `État du solde bancaire réel après déduction exclusive des fonds réservés aux cotisations CNPS`;
      headers = ['Poste Comptable & Financier', 'Montant (FCFA)', 'Observations Réglementaires'];
      rows = [
        ['1. Total des Fonds Versés en Banque (Bordereaux)', formatFCFA(totalFondsBanqueMois), `${versementsMois.length} bordereaux validés`],
        ['2. Déduction : Réserve Cotisations CNPS', `-${formatFCFA(totalReserveCnpsMois)}`, `${adherentsReserveMois.length} adhérent(s) couverts`],
        ['3. Solde Réel Disponible en Banque (Hors CNPS)', formatFCFA(soldeReelBanqueMois), soldeReelBanqueMois >= 0 ? 'Trésorerie nette libre disponible' : 'Déficit de couverture bancaire'],
        ['Taux de Couverture de la Réserve CNPS', `${couvertureCnpsMois.toFixed(1)} %`, couvertureCnpsMois >= 100 ? 'Réserve intégralement couverte' : 'Dépôt complémentaire requis'],
      ];
      rawData = [
        { Rubrique: '1. Total des Fonds Versés en Banque', Montant: totalFondsBanqueMois },
        { Rubrique: '2. Déduction : Réserve Cotisations CNPS', Montant: -totalReserveCnpsMois },
        { Rubrique: '3. Solde Réel Disponible en Banque (Hors CNPS)', Montant: soldeReelBanqueMois },
        { Rubrique: 'Taux de Couverture de la Réserve CNPS', Montant: `${couvertureCnpsMois.toFixed(1)} %` },
      ];
    }

    return { title, desc, headers, rows, rawData };
  };

  const handleDownloadPdf = () => {
    const data = getCurrentReportData();
    generateReportPdf({
      title: data.title,
      description: data.desc,
      headers: data.headers,
      rows: data.rows,
      parametres,
      fileName: `Etat_Mensuel_${selectedMois}_${selectedAnnee}`,
    });
  };

  const handleDownloadEncaissementsDecaissementsPdf = () => {
    generateEtatEncaissementsDecaissementsPdf({
      periode: `${selectedMois} ${selectedAnnee}`,
      totalEncaissements: totalCotisationsMois,
      totalDecaissements: totalDepensesMois,
      totalDecaissementsExploitationCnps: totalDecaissementsExploitationCnpsMois,
      decaissementsExploitationDetails: depensesMoisCnps.map((d) => ({
        date: d.date,
        piece: d.numeroPiece,
        motif: d.motif,
        montant: d.montant,
        beneficiaire: d.beneficiaire,
        mode: d.modePaiement,
      })),
      totalDecaissementsApportPca: totalDecaissementsApportPcaMois,
      decaissementsApportPcaDetails: depensesMoisPca.map((d) => ({
        date: d.date,
        piece: d.numeroPiece,
        motif: d.motif,
        montant: d.montant,
        beneficiaire: d.beneficiaire,
        mode: d.modePaiement,
        categorie: d.categorie,
      })),
      soldeNet: totalCotisationsMois - totalDepensesMois,
      parametres,
      signataires,
      fileName: `Etat_Encaissements_Decaissements_${selectedMois}_${selectedAnnee}`,
    });
  };

  const handleExportRapprochementExcel = () => {
    exportRapprochementBanqueCnpsExcel({
      periode: `${selectedMois}_${selectedAnnee}`,
      parametres,
      totalFondsBanque: totalFondsBanqueMois,
      totalReserveCnps: totalReserveCnpsMois,
      soldeReelBanque: soldeReelBanqueMois,
      tauxCouverture: couvertureCnpsMois,
      versementsList: versementsMois,
      adherentsReserveList: adherentsReserveMois,
    });
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête de la vue États Mensuels */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <CalendarRange className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                États Mensuels & Clôture de Période
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Consultation statistique, bilan consolidé et exportations mensuelles officielles de fin de mois
              </p>
            </div>
          </div>
        </div>

        {/* Boutons d'exportation prioritaires */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nouveau Bouton Prioritaire : Export PDF Encaissements et Décaissements */}
          <button
            onClick={handleDownloadEncaissementsDecaissementsPdf}
            className="px-3.5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Exporter l'État officiel des Encaissements et Décaissements au format PDF (Exploitation CNPS & Apport Personnel PCA)"
          >
            <Download className="w-4 h-4" />
            <span>Encaissements / Décaissements (PDF)</span>
          </button>

          <button
            onClick={handleExportMensuelComplet}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
            title="Télécharger le classeur Excel officiel complet avec tous les onglets du mois"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exporter Clôture (.xlsx)</span>
          </button>

          <button
            onClick={handleExportTableauActif}
            className="px-3 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Exporter uniquement le tableau actuellement affiché en Excel"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Tableau actif</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="px-3 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Télécharger directement l'état officiel au format PDF"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Imprimer l'état mensuel officiel ou l'enregistrer au format PDF"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Imprimer / PDF</span>
          </button>
        </div>
      </div>

      {/* Barre de sélection du mois et de l'année */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:border-none print:shadow-none print:p-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl print:hidden">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white hover:shadow-xs rounded-lg text-slate-600 transition-all cursor-pointer"
              title="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-3 text-slate-800">
              {selectedMois} {selectedAnnee}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white hover:shadow-xs rounded-lg text-slate-600 transition-all cursor-pointer"
              title="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-600">Période :</label>
            <select
              value={selectedMois}
              onChange={(e) => setSelectedMois(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {MOIS_LIST.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={selectedAnnee}
              onChange={(e) => setSelectedAnnee(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {ANNEES_LIST.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Badge récapitulatif de statut mensuel */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>État certifié {selectedMois} {selectedAnnee}</span>
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600 font-medium">
            {cotisationsMois.length} versement(s) consigné(s)
          </span>
        </div>
      </div>

      {/* Cartes d'indicateurs mensuels (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recettes Cotisations */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cotisations Encaissées
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-slate-900">
              {formatFCFA(totalCotisationsMois)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center">
            <span className="font-semibold text-emerald-700 mr-1">{cotisationsMois.length} paiements</span>
            au cours de {selectedMois} {selectedAnnee}
          </p>
        </div>

        {/* Participation Adhérents */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Adhérents Cotisants
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-slate-900">
              {countsParStatut.cotisants} / {countsParStatut.tous}
            </span>
            <span className="text-xs font-bold text-blue-700">{etat?.comptes.tauxParticipation ?? 0}%</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Taux de recouvrement des membres sur le mois
          </p>
        </div>

        {/* Nouveaux Seuils 15 000 FCFA */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Seuil 15 000 F Atteint
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-slate-900">
              {franchissementsMois.length} membre(s)
            </span>
            <span className="text-xs font-bold text-amber-700">Éligibles CNPS</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Ayant franchi le seuil de couverture ce mois
          </p>
        </div>

        {/* Solde Net Mensuel (Recettes - Dépenses) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Solde Net de Période
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${soldeNetMois >= 0 ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-xl font-extrabold ${soldeNetMois >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {formatFCFA(soldeNetMois)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Recettes ({formatFCFA(totalCotisationsMois)}) - Dépenses ({formatFCFA(totalDepensesMois)})
          </p>
        </div>
      </div>

      {/* Ventilations visuelles : Modes de paiement & Agents enregistreurs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ventilation par Mode de paiement */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Ventilation des Encaissements par Mode</span>
            <span className="text-emerald-700 font-semibold">{formatFCFA(totalCotisationsMois)}</span>
          </h3>

          {statsParMode.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Aucun versement enregistré pour ce mois.
            </p>
          ) : (
            <div className="space-y-2.5">
              {statsParMode.map((item) => (
                <div key={item.mode} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700">{item.mode}</span>
                    <span className="text-slate-900 font-bold">
                      {formatFCFA(item.montant)} ({item.pourcentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${item.pourcentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ventilation par Agent Enregistreur */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Ventilation par Agent / Caissier</span>
            <span className="text-slate-500 font-semibold">{cotisationsMois.length} versements</span>
          </h3>

          {statsParAgent.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Aucune activité enregistrée sur ce mois.
            </p>
          ) : (
            <div className="space-y-2.5">
              {statsParAgent.map((item) => (
                <div key={item.agent} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 flex items-center space-x-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.agent}</span>
                      <span className="text-[10px] text-slate-400">({item.count} réc.)</span>
                    </span>
                    <span className="text-slate-900 font-bold">
                      {formatFCFA(item.montant)} ({item.pourcentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${item.pourcentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Onglets de visualisation des états mensuels */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation des sous-onglets */}
        <div className="border-b border-slate-200 flex flex-wrap items-center justify-between px-4 pt-3 bg-slate-50/50 print:hidden">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveSubTab('NOMINATIF')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'NOMINATIF'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>1. Relevé Nominatif des Adhérents ({etatNominatifFiltre.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('TRANSACTIONS')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'TRANSACTIONS'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>2. Journal des Versements du Mois ({cotisationsMois.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('SEUILS_CNPS')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'SEUILS_CNPS'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>3. Seuils 15 000 F & Situation CNPS ({franchissementsMois.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('BALANCE_FINANCIERE')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'BALANCE_FINANCIERE'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>4. Balance & Rapprochement DAF</span>
            </button>

            <button
              onClick={() => setActiveSubTab('RAPPROCHEMENT_BANQUE_CNPS')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'RAPPROCHEMENT_BANQUE_CNPS'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>5. Solde Réel Banque & Réserve CNPS</span>
            </button>
          </div>
        </div>

        {/* Contenu Sous-Onglet 1 : Relevé Nominatif */}
        {activeSubTab === 'NOMINATIF' && (
          <div className="p-4 space-y-4">
            {/* Barre de filtre nominatif */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, matricule, téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-600 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span>Filtrer :</span>
                </span>
                {(
                  [
                    {
                      id: 'TOUS' as const,
                      label: 'Tous les adhérents',
                      count: countsParStatut.tous,
                    },
                    {
                      id: 'COTISANTS' as const,
                      label: 'Ayant cotisé ce mois',
                      count: countsParStatut.cotisants,
                    },
                    {
                      id: 'NON_COTISANTS' as const,
                      label: 'Aucun versement ce mois',
                      count: countsParStatut.nonCotisants,
                    },
                    {
                      id: 'DEJA_IMMATRICULE' as const,
                      label: 'Déjà immatriculés',
                      count: countsParStatut.dejaImmatricules,
                      icon: ShieldCheck,
                    },
                  ]
                ).map(({ id, label, count, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setFilterAdherentStatut(id)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 text-xs ${
                      filterAdherentStatut === id
                        ? id === 'DEJA_IMMATRICULE'
                          ? 'bg-emerald-800 text-white ring-2 ring-emerald-600/40 shadow-xs'
                          : 'bg-emerald-700 text-white ring-2 ring-emerald-500/40 shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                    title={
                      id === 'DEJA_IMMATRICULE'
                        ? 'Visualiser uniquement les états des adhérents déjà immatriculés à la CNPS'
                        : undefined
                    }
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 text-emerald-300 shrink-0" />}
                    <span>{label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        filterAdherentStatut === id
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bannière contextuelle si filtre Déjà Immatriculé actif */}
            {filterAdherentStatut === 'DEJA_IMMATRICULE' && (
              <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fadeIn">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong>Filtre actif : Adhérents déjà immatriculés CNPS.</strong> Affichage exclusif des membres bénéficiant déjà d'un numéro d'immatriculation officiel ({etatNominatifFiltre.length} adhérent{etatNominatifFiltre.length > 1 ? 's' : ''}).
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-[11px] self-end sm:self-auto">
                  <span className="text-slate-600">
                    Total cotisé ce mois :{' '}
                    <strong className="font-mono font-bold text-emerald-800">
                      {formatFCFA(totalCotiseFiltre)}
                    </strong>
                  </span>
                  <button
                    onClick={() => setFilterAdherentStatut('TOUS')}
                    className="text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            )}

            {/* Tableau nominatif */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider">
                    <th className="py-2.5 px-3">Matricule</th>
                    <th className="py-2.5 px-3">Adhérent & Contact</th>
                    <th className="py-2.5 px-3">Tarif Journalier</th>
                    <th className="py-2.5 px-3">Versements {selectedMois}</th>
                    <th className="py-2.5 px-3">Jours Couverts</th>
                    <th className="py-2.5 px-3">Cumul Fin de Mois</th>
                    <th className="py-2.5 px-3">Seuil 15 000 F</th>
                    <th className="py-2.5 px-3">Statut CNPS</th>
                    <th className="py-2.5 px-3">Gestionnaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {etatNominatifFiltre.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Aucun adhérent ne correspond aux critères de filtre.
                      </td>
                    </tr>
                  ) : (
                    etatNominatifFiltre.map((item) => (
                      <tr key={item.adherent.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {item.adherent.matricule}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-800">
                            {item.adherent.nom} {item.adherent.prenom}
                          </p>
                          <p className="text-[11px] text-slate-500">{item.adherent.telephone}</p>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {formatFCFA(item.adherent.tarifJournalier)} / jour
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`font-extrabold ${item.montantMois > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {formatFCFA(item.montantMois)}
                          </span>
                          {item.nbVersementsMois > 0 && (
                            <span className="text-[10px] text-slate-400 block">
                              ({item.nbVersementsMois} versement{item.nbVersementsMois > 1 ? 's' : ''})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">
                          {item.nbJoursMois > 0 ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold">
                              {item.nbJoursMois} jour(s)
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {formatFCFA(item.cumulTotal)}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.seuil15000Atteint ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-amber-600" />
                              Atteint
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">
                              {formatFCFA(item.cumulTotal)} / 15 000 F
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.estImmatricule
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.estImmatricule && <ShieldCheck className="w-3 h-3 mr-1 text-emerald-700" />}
                            {item.estImmatricule ? 'Immatriculé' : item.adherent.statutImmatriculation || 'Non immatriculé'}
                          </span>
                          {item.adherent.numeroCnps && (
                            <span className="text-[10px] text-slate-700 block font-mono font-bold mt-0.5">
                              {item.adherent.numeroCnps}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {item.gestionnaireNom}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Contenu Sous-Onglet 2 : Journal des Versements du Mois */}
        {activeSubTab === 'TRANSACTIONS' && (
          <div className="p-4 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider">
                    <th className="py-2.5 px-3">Date Paiement</th>
                    <th className="py-2.5 px-3">Matricule</th>
                    <th className="py-2.5 px-3">Nom & Prénoms</th>
                    <th className="py-2.5 px-3">Montant</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Référence Transaction</th>
                    <th className="py-2.5 px-3">Agent Enregistreur</th>
                    <th className="py-2.5 px-3">Observations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cotisationsMois.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Aucun versement enregistré pour {selectedMois} {selectedAnnee}.
                      </td>
                    </tr>
                  ) : (
                    cotisationsMois.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {formatDateShort(c.datePaiement)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {c.matricule}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {c.adherentNomPrenom}
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-emerald-700">
                          {formatFCFA(c.montant)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[11px]">
                            {c.modePaiement}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                          {c.reference || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {c.agentEnregistreur}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {c.observations || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Contenu Sous-Onglet 3 : Franchissements de Seuil & CNPS */}
        {activeSubTab === 'SEUILS_CNPS' && (
          <div className="p-4 space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
              <TrendingUp className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Objectif Social Réglementaire :</span>
                <p className="mt-0.5">
                  Liste des membres de la coopérative ayant atteint ou consolidé le seuil de 15 000 FCFA
                  au cours de {selectedMois} {selectedAnnee}, ouvrant droit à l'immatriculation et aux prestations CNPS.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider">
                    <th className="py-2.5 px-3">Matricule</th>
                    <th className="py-2.5 px-3">Adhérent</th>
                    <th className="py-2.5 px-3">Téléphone</th>
                    <th className="py-2.5 px-3">Cotisé en {selectedMois}</th>
                    <th className="py-2.5 px-3">Cumul Total</th>
                    <th className="py-2.5 px-3">Statut CNPS</th>
                    <th className="py-2.5 px-3">N° CNPS</th>
                    <th className="py-2.5 px-3">Action Requise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {franchissementsMois.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Aucun membre ayant cotisé ce mois n'a franchi ou consolidé le seuil de 15 000 FCFA.
                      </td>
                    </tr>
                  ) : (
                    franchissementsMois.map((item) => (
                      <tr key={item.adherent.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {item.adherent.matricule}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {item.adherent.nom} {item.adherent.prenom}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.adherent.telephone}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">
                          {formatFCFA(item.montantMois)}
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-slate-900">
                          {formatFCFA(item.cumulTotal)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.adherent.statutImmatriculation === 'Immatriculé'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.adherent.statutImmatriculation}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {item.adherent.numeroCnps || 'En attente d\'attribution'}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.adherent.statutImmatriculation !== 'Immatriculé' ? (
                            <span className="text-amber-700 font-bold text-[11px]">
                              Déclaration CNPS prioritaire
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-semibold text-[11px]">
                              Immatriculation conforme
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Contenu Sous-Onglet 4 : Balance & Rapprochement DAF */}
        {activeSubTab === 'BALANCE_FINANCIERE' && (
          <div className="p-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                  Total Recettes Cotisations
                </span>
                <span className="text-xl font-extrabold text-emerald-900 mt-1 block">
                  + {formatFCFA(totalCotisationsMois)}
                </span>
                <span className="text-[11px] text-emerald-700 mt-1 block">
                  Encaissées auprès des adhérents
                </span>
              </div>

              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                  Total Dépenses Décaissées
                </span>
                <span className="text-xl font-extrabold text-rose-900 mt-1 block">
                  - {formatFCFA(totalDepensesMois)}
                </span>
                <span className="text-[11px] text-rose-700 mt-1 block">
                  Frais de fonctionnement & décaissements
                </span>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                  Versements Bancaires Réalisés
                </span>
                <span className="text-xl font-extrabold text-blue-900 mt-1 block">
                  {formatFCFA(totalVersementsMois)}
                </span>
                <span className="text-[11px] text-blue-700 mt-1 block">
                  Fonds déposés sur compte bancaire
                </span>
              </div>
            </div>

            {/* Détail des dépenses du mois si existantes */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Dépenses enregistrées pour la période ({depensesMois.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Référence</th>
                      <th className="py-2.5 px-3">Catégorie</th>
                      <th className="py-2.5 px-3">Bénéficiaire</th>
                      <th className="py-2.5 px-3">Montant</th>
                      <th className="py-2.5 px-3">Motif / Description</th>
                      <th className="py-2.5 px-3">Enregistré par</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {depensesMois.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
                          Aucune dépense enregistrée sur cette période mensuelle.
                        </td>
                      </tr>
                    ) : (
                      depensesMois.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-800">{d.date}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{d.numeroPiece}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">{d.categorie}</td>
                          <td className="py-2.5 px-3 text-slate-800">{d.beneficiaire}</td>
                          <td className="py-2.5 px-3 font-bold text-rose-600">{formatFCFA(d.montant)}</td>
                          <td className="py-2.5 px-3 text-slate-600">{d.motif}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{d.enregistrePar}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Contenu Sous-Onglet 5 : Solde Réel en Banque après Déduction Réserve CNPS */}
        {activeSubTab === 'RAPPROCHEMENT_BANQUE_CNPS' && (
          <div className="p-4 space-y-6">
            {/* Bannière explicative de la formule réglementaire */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-blue-800">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-blue-500/30 text-blue-200 border border-blue-400/40">
                      Rapprochement Spécifique COSITI
                    </span>
                    <span className="text-xs text-blue-200">
                      Période de {selectedMois} {selectedAnnee}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                    Solde Réel en Banque = Fonds Versés en Banque - Fonds Réservés Cotisations CNPS
                  </h3>
                  <p className="text-xs text-blue-100/90 leading-relaxed">
                    Conformément aux directives de gestion, les cotisations sociales dues à la CNPS pour les travailleurs indépendants sont strictement sanctuarisées. Seules ces réserves CNPS sont retranchées des dépôts bancaires pour calculer la trésorerie nette réellement disponible.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={handleExportRapprochementExcel}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                    title="Télécharger le classeur Excel officiel de rapprochement banque / CNPS"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={handleDownloadPdf}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                    title="Télécharger l'état certifié au format PDF"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3 Grandes Cartes KPI Financières */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Carte 1 : Fonds versés en banque */}
              <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    1. Fonds Versés en Banque
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-blue-950 block">
                    {formatFCFA(totalFondsBanqueMois)}
                  </span>
                  <div className="flex items-center justify-between text-xs mt-2 text-slate-500">
                    <span>{versementsMois.length} bordereau(x) bancaire(s)</span>
                    <span className="font-semibold text-blue-700">Comptes certifiés</span>
                  </div>
                </div>
              </div>

              {/* Carte 2 : Déduction Réserve Cotisations CNPS */}
              <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    2. Réserve Cotisations CNPS
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-amber-700 block">
                    - {formatFCFA(totalReserveCnpsMois)}
                  </span>
                  <div className="flex items-center justify-between text-xs mt-2 text-slate-500">
                    <span>{adherentsReserveMois.length} adhérent(s) cotisant(s)</span>
                    <span className="font-semibold text-amber-800">Fonds sanctuarisés</span>
                  </div>
                </div>
              </div>

              {/* Carte 3 : Solde Réel en Banque (Hors CNPS) */}
              <div className={`p-5 rounded-2xl border shadow-xs relative overflow-hidden ${
                soldeReelBanqueMois >= 0
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-rose-50/70 border-rose-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    soldeReelBanqueMois >= 0 ? 'text-emerald-900' : 'text-rose-900'
                  }`}>
                    3. Solde Réel en Banque
                  </span>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    soldeReelBanqueMois >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {soldeReelBanqueMois >= 0 ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <span className={`text-2xl font-black block ${
                    soldeReelBanqueMois >= 0 ? 'text-emerald-950' : 'text-rose-950'
                  }`}>
                    {soldeReelBanqueMois >= 0 ? '+' : ''}{formatFCFA(soldeReelBanqueMois)}
                  </span>
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className={soldeReelBanqueMois >= 0 ? 'text-emerald-800 font-semibold' : 'text-rose-800 font-semibold'}>
                      {soldeReelBanqueMois >= 0 ? 'Trésorerie libre nette' : 'Déficit de couverture'}
                    </span>
                    <span className="font-bold px-2 py-0.5 rounded-full text-[11px] bg-white border border-slate-200 text-slate-800">
                      Couverture: {couvertureCnpsMois.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tableau Récapitulatif de Conciliation Financière */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                  <Landmark className="w-4 h-4 text-blue-700" />
                  <span>Tableau Synthétique du Rapprochement Bancaire (Mois de {selectedMois} {selectedAnnee})</span>
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider">
                      <th className="py-3 px-4">Rubrique Financière</th>
                      <th className="py-3 px-4 text-right">Montant (FCFA)</th>
                      <th className="py-3 px-4">Nature & Règle de Gestion</th>
                      <th className="py-3 px-4">Statut de Conformité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        1. Total des Fonds Versés en Banque (Bordereaux de versement)
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-700 text-sm">
                        + {formatFCFA(totalFondsBanqueMois)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {versementsMois.length} remise(s) et bordereau(x) bancaire(s) enregistrés
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">
                          Fonds certifiés en banque
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-amber-900">
                        2. Déduction : Fonds Réservés aux Cotisations CNPS
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700 text-sm">
                        - {formatFCFA(totalReserveCnpsMois)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {adherentsReserveMois.length} adhérent(s) cotisant(s) • Droits de sécurité sociale protégés
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                          Sanctuarisé CNPS
                        </span>
                      </td>
                    </tr>

                    <tr className={`font-extrabold text-sm ${
                      soldeReelBanqueMois >= 0 ? 'bg-emerald-50/40 text-emerald-950' : 'bg-rose-50/40 text-rose-950'
                    }`}>
                      <td className="py-3.5 px-4 font-black">
                        3. SOLDE RÉEL DISPONIBLE EN BANQUE (HORS RÉSERVE CNPS)
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-base">
                        {soldeReelBanqueMois >= 0 ? '+' : ''}{formatFCFA(soldeReelBanqueMois)}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold">
                        {soldeReelBanqueMois >= 0
                          ? 'Trésorerie nette bancaire libre d\'affectation'
                          : 'Attention : Déficit de couverture bancaire de la réserve CNPS'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                          soldeReelBanqueMois >= 0
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-rose-200 text-rose-900'
                        }`}>
                          {soldeReelBanqueMois >= 0 ? 'EXCÉDENT DISPONIBLE' : 'DÉFICIT COUVERTURE'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Deux Tableaux détaillés : Bordereaux bancaires & Liste des réserves CNPS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Détail 1 : Bordereaux bancaires du mois */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Bordereaux de Versement en Banque ({versementsMois.length})</span>
                  </h4>
                  <span className="text-xs font-mono font-bold text-blue-700">
                    {formatFCFA(totalFondsBanqueMois)}
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Banque</th>
                        <th className="py-2 px-3">N° Bordereau</th>
                        <th className="py-2 px-3 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {versementsMois.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400">
                            Aucun bordereau de versement enregistré pour ce mois.
                          </td>
                        </tr>
                      ) : (
                        versementsMois.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 text-slate-700 font-medium">{v.date}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{v.banque}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{v.numeroBordereau || '—'}</td>
                            <td className="py-2 px-3 text-right font-bold font-mono text-blue-700">
                              {formatFCFA(v.montant)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Détail 2 : Réserve CNPS constituée par adhérent ce mois */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span>Réserve Cotisations CNPS par Adhérent ({adherentsReserveMois.length})</span>
                  </h4>
                  <span className="text-xs font-mono font-bold text-amber-700">
                    {formatFCFA(totalReserveCnpsMois)}
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                        <th className="py-2 px-3">Matricule</th>
                        <th className="py-2 px-3">Adhérent</th>
                        <th className="py-2 px-3">Statut CNPS</th>
                        <th className="py-2 px-3 text-right">Réserve CNPS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adherentsReserveMois.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400">
                            Aucune cotisation perçue pour ce mois.
                          </td>
                        </tr>
                      ) : (
                        adherentsReserveMois.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 font-mono font-bold text-emerald-800">{item.matricule}</td>
                            <td className="py-2 px-3 font-medium text-slate-900">{item.nomComplet}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.statutCnps === 'Immatriculé'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.statutCnps}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-bold font-mono text-amber-700">
                              {formatFCFA(item.montantReserve)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cartouche officiel de signatures pour impression / PDF */}
      <div className="hidden print:block mt-12 pt-8 border-t-2 border-slate-800">
        <div className="text-center mb-6">
          <h2 className="text-base font-bold uppercase text-slate-900">
            {parametres.nomOrganisation || 'COOPÉRATIVE DE SÉCURITÉ SOCIALE DES TRAVAILLEURS INDÉPENDANTS (COSITI)'}
          </h2>
          <p className="text-xs text-slate-600">
            Procès-Verbal & État Mensuel Officiel de Clôture — Période de {selectedMois} {selectedAnnee}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8 text-center text-xs mt-10">
          <div className="border-t border-slate-400 pt-2">
            <p className="font-bold text-slate-800">Directeur Administratif & Financier (DAF)</p>
            <p className="text-[11px] text-slate-500 mt-1">{signataires.daf}</p>
            <div className="h-16"></div>
            <p className="text-[10px] text-slate-400">Signature et Visa</p>
          </div>

          <div className="border-t border-slate-400 pt-2">
            <p className="font-bold text-slate-800">Président du Conseil d'Administration (PCA)</p>
            <p className="text-[11px] text-slate-500 mt-1">{signataires.pca}</p>
            <div className="h-16"></div>
            <p className="text-[10px] text-slate-400">Signature et Visa</p>
          </div>

          <div className="border-t border-slate-400 pt-2">
            <p className="font-bold text-slate-800">Directeur Général (DG)</p>
            <p className="text-[11px] text-slate-500 mt-1">{signataires.dg}</p>
            <div className="h-16"></div>
            <p className="text-[10px] text-slate-400">Signature et Visa</p>
          </div>
        </div>
      </div>

      {/* Modal d'Aperçu avant Impression & Export Officiel A4 */}
      {isPrintModalOpen && (
        <RapportPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title={getCurrentReportData().title}
          description={getCurrentReportData().desc}
          tableHeaders={getCurrentReportData().headers}
          tableRows={getCurrentReportData().rows}
          reportData={getCurrentReportData().rawData}
          selectedRapport={`EtatMensuel_${activeSubTab}_${selectedMois}_${selectedAnnee}`}
          parametres={parametres}
        />
      )}
    </div>
  );
};
