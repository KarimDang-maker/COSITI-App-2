import { sumMoney } from '../utils/money';
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { RapportAgentTerrain } from '../types';
import { formatDateShort } from '../utils/helpers';
import { exportToExcel } from '../utils/exportUtils';
import {
  Users,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Printer,
  FileSpreadsheet,
  Search,
  X,
  BadgeCheck,
  ShieldCheck,
  Coins,
  ArrowDownRight,
  TrendingUp,
  UserCheck,
} from 'lucide-react';

export const RapportsAgentsCaisseView: React.FC = () => {
  const {
    rapportsAgents,
    gestionnaires,
    addRapportAgent,
    updateRapportAgent,
    deleteRapportAgent,
    validerRapportAgentDaf,
    currentUser,
    parametres,
  } = useApp();
  const dialog = useDialog();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('TOUS');
  const [selectedConformiteFilter, setSelectedConformiteFilter] = useState<string>('TOUS');

  // Modales
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingReport, setEditingReport] = useState<RapportAgentTerrain | null>(null);
  const [viewingDecharge, setViewingDecharge] = useState<RapportAgentTerrain | null>(null);
  const [visaReport, setVisaReport] = useState<RapportAgentTerrain | null>(null);
  const [visaObservations, setVisaObservations] = useState<string>('Fonds physiques et justificatifs vérifiés. Visa DAF accordé sans réserve.');

  // Formulaire de saisie caissière
  const [agentNom, setAgentNom] = useState<string>('');
  const [dateRapport, setDateRapport] = useState<string>(new Date().toISOString().split('T')[0]);
  const [zoneSecteur, setZoneSecteur] = useState<string>('Marché Central d\'Adjamé');
  const [typeMission, setTypeMission] = useState<string>('Tournée de collecte journalière & sensibilisation');
  const [adherentsVisites, setAdherentsVisites] = useState<number>(15);
  const [adherentsCotisants, setAdherentsCotisants] = useState<number>(12);
  const [nouvellesAdhesions, setNouvellesAdhesions] = useState<number>(2);
  const [montantEspecesRemis, setMontantEspecesRemis] = useState<number>(150000);
  const [montantMobileMoneyDeclare, setMontantMobileMoneyDeclare] = useState<number>(45000);
  const [conformiteCaisse, setConformiteCaisse] = useState<'Conforme (Fonds complets)' | 'Écart constaté (À justifier)'>('Conforme (Fonds complets)');
  const [explicationEcart, setExplicationEcart] = useState<string>('');
  const [difficultesTerrain, setDifficultesTerrain] = useState<string>('');
  const [actionsPrioritaires, setActionsPrioritaires] = useState<string>('');
  const [commentairesCaissiere, setCommentairesCaissiere] = useState<string>('Espèces comptées, conformes au carnet à souches.');

  // KPIs
  const stats = useMemo(() => {
    const totalRapports = rapportsAgents.length;
    const totalEspeces = sumMoney(rapportsAgents, (r) => r.montantEspecesRemis);
    const totalMobileMoney = sumMoney(rapportsAgents, (r) => r.montantMobileMoneyDeclare);
    const cumulCollecte = Math.round((totalEspeces + totalMobileMoney) * 100) / 100;
    const totalVisites = rapportsAgents.reduce((sum, r) => sum + r.adherentsVisites, 0);
    const totalCotisants = rapportsAgents.reduce((sum, r) => sum + r.adherentsCotisants, 0);
    const totalNouvelles = rapportsAgents.reduce((sum, r) => sum + r.nouvellesAdhesions, 0);
    const conformes = rapportsAgents.filter((r) => r.conformiteCaisse.includes('Conforme')).length;
    const ecarts = totalRapports - conformes;
    return {
      totalRapports,
      totalEspeces,
      totalMobileMoney,
      cumulCollecte,
      totalVisites,
      totalCotisants,
      totalNouvelles,
      conformes,
      ecarts,
    };
  }, [rapportsAgents]);

  // Filtrage
  const filteredRapports = useMemo(() => {
    return rapportsAgents.filter((r) => {
      const matchAgent = selectedAgentFilter === 'TOUS' || (r.agentNom || '').includes(selectedAgentFilter);
      const matchConformite = selectedConformiteFilter === 'TOUS' || r.conformiteCaisse === selectedConformiteFilter;
      const q = (searchTerm || '').toLowerCase().trim();
      const agent = (r.agentNom || '').toLowerCase();
      const zone = (r.zoneSecteur || '').toLowerCase();
      const mission = (r.typeMission || '').toLowerCase();
      const saisi = (r.saisiPar || '').toLowerCase();
      const matchSearch =
        !q ||
        agent.includes(q) ||
        zone.includes(q) ||
        mission.includes(q) ||
        saisi.includes(q);
      return matchAgent && matchConformite && matchSearch;
    });
  }, [rapportsAgents, selectedAgentFilter, selectedConformiteFilter, searchTerm]);

  const handleOpenAdd = () => {
    setEditingReport(null);
    const defaultAgent = gestionnaires[0]
      ? `${gestionnaires[0].nom} ${gestionnaires[0].prenom} (${gestionnaires[0].code})`
      : 'MBIDA François (GP-01)';
    setAgentNom(defaultAgent);
    setDateRapport(new Date().toISOString().split('T')[0]);
    setZoneSecteur(gestionnaires[0]?.zoneSecteur || 'Marché Central d\'Adjamé');
    setTypeMission('Tournée de collecte journalière & sensibilisation');
    setAdherentsVisites(15);
    setAdherentsCotisants(12);
    setNouvellesAdhesions(2);
    setMontantEspecesRemis(150000);
    setMontantMobileMoneyDeclare(45000);
    setConformiteCaisse('Conforme (Fonds complets)');
    setExplicationEcart('');
    setDifficultesTerrain('');
    setActionsPrioritaires('');
    setCommentairesCaissiere('Espèces comptées et versées au tiroir-caisse, reçus et carnets contrôlés.');
    setShowModal(true);
  };

  const handleOpenEdit = (rep: RapportAgentTerrain) => {
    setEditingReport(rep);
    setAgentNom(rep.agentNom);
    setDateRapport(rep.dateRapport);
    setZoneSecteur(rep.zoneSecteur);
    setTypeMission(rep.typeMission);
    setAdherentsVisites(rep.adherentsVisites);
    setAdherentsCotisants(rep.adherentsCotisants);
    setNouvellesAdhesions(rep.nouvellesAdhesions);
    setMontantEspecesRemis(rep.montantEspecesRemis);
    setMontantMobileMoneyDeclare(rep.montantMobileMoneyDeclare);
    setConformiteCaisse(rep.conformiteCaisse as typeof conformiteCaisse);
    setExplicationEcart(rep.explicationEcart || '');
    setDifficultesTerrain(rep.difficultesTerrain || '');
    setActionsPrioritaires(rep.actionsPrioritaires || '');
    setCommentairesCaissiere(rep.commentairesCaissiere || '');
    setShowModal(true);
  };

  const handleAgentSelect = (selectedName: string) => {
    setAgentNom(selectedName);
    const g = gestionnaires.find((item) => `${item.nom} ${item.prenom} (${item.code})` === selectedName);
    if (g && g.zoneSecteur) {
      setZoneSecteur(g.zoneSecteur);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentNom.trim() || !dateRapport) {
      await dialog.alert({
        title: 'Champs obligatoires requis',
        message: 'Veuillez sélectionner un agent de terrain et indiquer la date de la tournée.',
        variant: 'warning',
      });
      return;
    }

    const totalCollecte = (Number(montantEspecesRemis) || 0) + (Number(montantMobileMoneyDeclare) || 0);

    // Boîte de dialogue si écart constaté
    if (conformiteCaisse.includes('Écart')) {
      const confirmEcart = await dialog.confirm({
        title: 'Constat d\'écart de caisse',
        message: `Un écart de versement a été signalé pour la tournée de ${agentNom}. Motif/Montant : « ${explicationEcart || 'Non précisé'} ». Confirmez-vous l'enregistrement avec ce constat d'écart ?`,
        confirmText: 'Consigner l\'écart',
        cancelText: 'Vérifier la caisse',
        variant: 'warning',
        icon: 'alert',
        details: [
          { label: 'Agent', value: agentNom },
          { label: 'Espèces remises', value: `${(Number(montantEspecesRemis) || 0).toLocaleString('fr-FR')} FCFA` },
          { label: 'Mobile Money', value: `${(Number(montantMobileMoneyDeclare) || 0).toLocaleString('fr-FR')} FCFA` },
          { label: 'Total', value: `${(totalCollecte || 0).toLocaleString('fr-FR')} FCFA` },
        ],
      });
      if (!confirmEcart) return;
    }

    const caissiereSignature = `${currentUser.nom} (${currentUser.role || 'Caissière Principale'})`;

    if (editingReport) {
      updateRapportAgent(editingReport.id, {
        agentNom: agentNom.trim(),
        dateRapport,
        zoneSecteur: zoneSecteur.trim(),
        typeMission: typeMission.trim(),
        adherentsVisites: Number(adherentsVisites) || 0,
        adherentsCotisants: Number(adherentsCotisants) || 0,
        nouvellesAdhesions: Number(nouvellesAdhesions) || 0,
        montantEspecesRemis: Number(montantEspecesRemis) || 0,
        montantMobileMoneyDeclare: Number(montantMobileMoneyDeclare) || 0,
        montantTotalCollecte: totalCollecte,
        totalCollecte,
        conformiteCaisse,
        explicationEcart: explicationEcart.trim() || undefined,
        difficultesTerrain: difficultesTerrain.trim() || undefined,
        actionsPrioritaires: actionsPrioritaires.trim() || undefined,
        commentairesCaissiere: commentairesCaissiere.trim() || undefined,
      });
    } else {
      addRapportAgent({
        agentNom: agentNom.trim(),
        dateRapport,
        zoneSecteur: zoneSecteur.trim(),
        typeMission: typeMission.trim(),
        adherentsVisites: Number(adherentsVisites) || 0,
        adherentsCotisants: Number(adherentsCotisants) || 0,
        nouvellesAdhesions: Number(nouvellesAdhesions) || 0,
        montantEspecesRemis: Number(montantEspecesRemis) || 0,
        montantMobileMoneyDeclare: Number(montantMobileMoneyDeclare) || 0,
        montantTotalCollecte: totalCollecte,
        totalCollecte,
        conformiteCaisse,
        explicationEcart: explicationEcart.trim() || undefined,
        difficultesTerrain: difficultesTerrain.trim() || undefined,
        actionsPrioritaires: actionsPrioritaires.trim() || undefined,
        saisiPar: caissiereSignature,
        commentairesCaissiere: commentairesCaissiere.trim() || undefined,
        statutValidation: 'Enregistré en caisse',
      });
    }

    setShowModal(false);

    dialog.alert({
      title: editingReport ? 'Rapport mis à jour' : 'Rapport enregistré en caisse',
      message: `Le versement de tournée de ${agentNom} pour un montant total de ${(totalCollecte || 0).toLocaleString('fr-FR')} FCFA a été consigné avec succès.`,
      variant: 'success',
    });
  };

  const handleDelete = async (id: string, repAgent: string, repDate: string) => {
    const target = rapportsAgents.find((r) => r.id === id);
    const confirmed = await dialog.confirm({
      title: 'Suppression du Rapport de Tournée',
      message: `Confirmez-vous la suppression définitive du rapport de tournée de ${repAgent} du ${formatDateShort(repDate)} ? Cette opération supprimera les écritures de caisse associées.`,
      confirmText: 'Supprimer définitivement',
      cancelText: 'Conserver le rapport',
      variant: 'danger',
      icon: 'trash',
      details: [
        { label: 'Agent', value: repAgent },
        { label: 'Date', value: formatDateShort(repDate) },
        { label: 'Secteur', value: target?.zoneSecteur || '—' },
        { label: 'Total Encaissé', value: `${(target?.totalCollecte || 0).toLocaleString('fr-FR')} FCFA` },
      ],
    });

    if (confirmed) {
      deleteRapportAgent(id);
      if (viewingDecharge?.id === id) setViewingDecharge(null);
      await dialog.alert({
        title: 'Rapport supprimé',
        message: `Le rapport de tournée de ${repAgent} a bien été supprimé du registre de caisse.`,
        variant: 'info',
      });
    }
  };

  const handleOpenVisaDaf = (rep: RapportAgentTerrain) => {
    setVisaReport(rep);
    setVisaObservations('Fonds physiques et justificatifs Mobile Money vérifiés. Visa DAF accordé sans réserve.');
  };

  const handleConfirmVisaDaf = async () => {
    if (!visaReport) return;
    const visa = `Visa DAF accordé par ${currentUser.nom} (${currentUser.role}) le ${new Date().toLocaleDateString('fr-FR')} — Obs: ${visaObservations.trim()}`;
    validerRapportAgentDaf(visaReport.id, visa);
    const validatedAgent = visaReport.agentNom;
    setVisaReport(null);

    await dialog.alert({
      title: 'Visa DAF Apposé avec Succès',
      message: `Le visa officiel de la Direction Administrative et Financière a été accordé au rapport de tournée de ${validatedAgent}.`,
      variant: 'success',
    });
  };

  const handleExportAll = () => {
    const dataToExport = filteredRapports.map((r) => ({
      Date: r.dateRapport,
      'Agent de Terrain': r.agentNom,
      Zone: r.zoneSecteur,
      'Mission / Tournée': r.typeMission,
      'Adhérents Visités': r.adherentsVisites,
      'Adhérents Cotisants': r.adherentsCotisants,
      'Nouvelles Adhésions': r.nouvellesAdhesions,
      'Espèces Remises Caisse (FCFA)': r.montantEspecesRemis,
      'Mobile Money Déclaré (FCFA)': r.montantMobileMoneyDeclare,
      'Total Collecté (FCFA)': r.totalCollecte,
      'Conformité Caisse': r.conformiteCaisse,
      'Saisi Par (Caissière)': r.saisiPar,
      'Statut Validation': r.statutValidation,
      'Visa DAF': r.visaDaf || 'En attente',
    }));
    exportToExcel(dataToExport, `COSITI_Rapports_Agents_Caisse_${new Date().toISOString().split('T')[0]}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalSaisieCalculee = (Number(montantEspecesRemis) || 0) + (Number(montantMobileMoneyDeclare) || 0);

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
              Caisse Principale & Enregistrement
            </span>
            <span className="text-xs text-slate-500">• Contrôle Terrain & Encaissements</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
            Rapports des Agents de Terrain (Saisie Caisse)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Interface de centralisation des tournées, remise physique des fonds en caisse et délivrance des bordereaux de décharge
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportAll}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exporter Excel</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Saisir un Rapport d'Agent</span>
          </button>
        </div>
      </div>

      {/* Bandeau d'information sur la caissière */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900">
              Poste de Saisie : Caissière Principale & Agent d'Enregistrement
            </div>
            <div className="text-slate-600">
              Opérateur connecté : <strong className="text-emerald-800">{currentUser.nom}</strong> ({currentUser.role})
              • Vérification conjointe des fonds physiques remis au tiroir-caisse
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <span className="px-2.5 py-1 bg-white/80 backdrop-blur-xs font-mono font-bold text-slate-700 rounded-lg border border-slate-200 text-xs shadow-xs">
            {stats.totalRapports} rapports archivés
          </span>
        </div>
      </div>

      {/* Cartes KPIs Financiers et d'Activité */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Espèces Remises Caisse</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700 mt-2">
            {(stats?.totalEspeces ?? 0).toLocaleString('fr-FR')} <span className="text-xs font-bold">FCFA</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Fonds physiques reçus au guichet
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Money Déclaré</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-600 mt-2">
            {(stats?.totalMobileMoney ?? 0).toLocaleString('fr-FR')} <span className="text-xs font-bold">FCFA</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Wave, Orange Money & MTN MoMo
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Encaissé Terrain</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-indigo-900 mt-2">
            {(stats?.cumulCollecte ?? 0).toLocaleString('fr-FR')} <span className="text-xs font-bold">FCFA</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Cumul des tournées de terrain
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Activité & Adhésions</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-black text-slate-900 mt-2">
            {stats.totalVisites} visites • {stats.totalCotisants} cotisants
          </div>
          <div className="text-[11px] text-emerald-700 font-bold mt-1">
            +{stats.totalNouvelles} nouvelle(s) adhésion(s)
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher agent, secteur, caissière..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium w-64 sm:w-80 focus:bg-white focus:outline-indigo-500"
            />
          </div>

          <select
            value={selectedAgentFilter}
            onChange={(e) => setSelectedAgentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white"
          >
            <option value="TOUS">Tous les agents de terrain</option>
            {gestionnaires.map((g) => (
              <option key={g.id} value={g.nom}>
                {g.nom} {g.prenom} ({g.code})
              </option>
            ))}
          </select>

          <select
            value={selectedConformiteFilter}
            onChange={(e) => setSelectedConformiteFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white"
          >
            <option value="TOUS">Toutes les conformités</option>
            <option value="Conforme (Fonds complets)">Conforme (Fonds complets)</option>
            <option value="Écart constaté (À justifier)">Écart constaté (À justifier)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-bold self-end sm:self-center">
          {filteredRapports.length} rapport(s) affiché(s)
        </div>
      </div>

      {/* Tableau des Rapports Enregistrés */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Date Tournée</th>
                <th className="py-3 px-4">Agent de Terrain & Secteur</th>
                <th className="py-3 px-4">Mission</th>
                <th className="py-3 px-4 text-center">Visités / Cotisants</th>
                <th className="py-3 px-4 text-right">Espèces Caisse</th>
                <th className="py-3 px-4 text-right">Mobile Money</th>
                <th className="py-3 px-4 text-right">Total Collecté</th>
                <th className="py-3 px-4 text-center">Conformité</th>
                <th className="py-3 px-4">Enregistré Par</th>
                <th className="py-3 px-4 text-center">Visa DAF</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRapports.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 font-medium">
                    Aucun rapport de tournée enregistré. Cliquez sur « Saisir un Rapport d'Agent ».
                  </td>
                </tr>
              ) : (
                filteredRapports.map((r) => {
                  const isConforme = r.conformiteCaisse.includes('Conforme');
                  const isValideDaf = r.statutValidation === 'Vérifié DAF';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {formatDateShort(r.dateRapport)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{r.agentNom}</div>
                        <div className="text-[11px] text-slate-500">{r.zoneSecteur}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs text-slate-700">
                        <div className="font-medium truncate" title={r.typeMission}>
                          {r.typeMission}
                        </div>
                        {r.nouvellesAdhesions > 0 && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-sm inline-block mt-0.5">
                            +{r.nouvellesAdhesions} adhésion(s)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-900">{r.adherentsVisites}</span>
                        <span className="text-slate-400"> / </span>
                        <span className="font-bold text-emerald-700">{r.adherentsCotisants}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {(r?.montantEspecesRemis ?? 0).toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                        {(r?.montantMobileMoneyDeclare ?? 0).toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-indigo-950 whitespace-nowrap bg-indigo-50/30">
                        {(r?.totalCollecte ?? 0).toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center space-x-1 ${
                            isConforme
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isConforme ? (
                            <CheckCircle2 className="w-3 h-3 inline mr-1" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                          )}
                          <span>{isConforme ? 'Conforme' : 'Écart'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px] whitespace-nowrap">
                        <div className="font-medium text-slate-800">{r.saisiPar}</div>
                        <div className="text-[10px] text-slate-400">Caissière Principale</div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isValideDaf ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full inline-flex items-center space-x-1">
                            <ShieldCheck className="w-3 h-3 inline mr-0.5" />
                            <span>Visé DAF</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenVisaDaf(r)}
                            title="Ouvrir la boîte de dialogue pour apposer le visa de contrôle DAF"
                            className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer border border-slate-200"
                          >
                            Viser DAF
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setViewingDecharge(r)}
                            title="Consulter et imprimer le bordereau de décharge"
                            className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(r)}
                            title="Modifier"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id, r.agentNom, r.dateRapport)}
                            title="Supprimer"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODALE DE VISUALISATION DU BORDEREAU DE DÉCHARGE / REMISE DE CAISSE */}
      {viewingDecharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10 print:hidden">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                  Bordereau Officiel de Décharge Caisse
                </span>
                <span className="text-xs text-slate-400">Réf: {viewingDecharge.id}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer Bordereau</span>
                </button>
                <button
                  onClick={() => setViewingDecharge(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* BORDEREAU IMPRIMABLE */}
            <div className="p-8 space-y-6 text-slate-800 text-xs" id="decharge-printable">
              {/* En-tête officiel */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                <div className="text-base font-black text-slate-950 uppercase tracking-wide">
                  {parametres?.nomOrganisation || 'COSITI'}
                </div>
                <div className="text-xs font-bold text-slate-600">
                  {parametres?.sigle || 'COSITI'} • GUICHET CENTRAL DE CAISSE
                </div>
                <div className="text-[11px] text-slate-500">
                  Récépissé de versement de tournée journalière & Décharge mutuelle
                </div>
              </div>

              {/* Titre */}
              <div className="text-center py-2 bg-slate-50 rounded-2xl border border-slate-200">
                <h1 className="text-sm font-black text-slate-900 uppercase">
                  BORDEREAU DE VERSEMENT ET DÉCHARGE DE CAISSE
                </h1>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                  Tournée du {formatDateShort(viewingDecharge.dateRapport)} • Secteur : {viewingDecharge.zoneSecteur}
                </div>
              </div>

              {/* Détails Agent & Mission */}
              <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Agent de Terrain / Gestionnaire :</span>
                  <span className="font-bold text-slate-900 text-xs">{viewingDecharge.agentNom}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Zone / Secteur couvert :</span>
                  <span className="font-semibold text-slate-900 text-xs">{viewingDecharge.zoneSecteur}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Objet de la mission :</span>
                  <span className="font-medium text-slate-800 text-xs">{viewingDecharge.typeMission}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Bilan d'activité :</span>
                  <span className="font-medium text-slate-800 text-xs">
                    {viewingDecharge.adherentsVisites} visités • {viewingDecharge.adherentsCotisants} cotisants • {viewingDecharge.nouvellesAdhesions} adhésions
                  </span>
                </div>
              </div>

              {/* Décompte Financier de Caisse */}
              <div className="space-y-2">
                <span className="font-black text-slate-900 uppercase tracking-wide block text-[11px]">
                  Décompte des Fonds Encaissés & Reçus au Guichet :
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-slate-700 bg-slate-50">
                          1. Espèces physiques remises dans le tiroir-caisse
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                          {(viewingDecharge?.montantEspecesRemis ?? 0).toLocaleString('fr-FR')} FCFA
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-slate-700 bg-slate-50">
                          2. Versements Mobile Money déclarés & justifiés
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-700 text-sm">
                          {(viewingDecharge?.montantMobileMoneyDeclare ?? 0).toLocaleString('fr-FR')} FCFA
                        </td>
                      </tr>
                      <tr className="bg-indigo-50/60 font-black">
                        <td className="py-3 px-4 text-indigo-950 font-black text-xs uppercase">
                          TOTAL COLLECTÉ PAR L'AGENT & ENREGISTRÉ
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-indigo-950 text-base">
                          {(viewingDecharge?.totalCollecte ?? 0).toLocaleString('fr-FR')} FCFA
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Contrôle de Conformité & Observations */}
              <div className="space-y-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700">Contrôle physique de conformité :</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                      viewingDecharge.conformiteCaisse.includes('Conforme')
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {viewingDecharge.conformiteCaisse}
                  </span>
                </div>

                {viewingDecharge.commentairesCaissiere && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-600 block text-[10px] uppercase">
                      Observation de la Caissière Principale :
                    </span>
                    <p className="text-slate-800 italic mt-0.5">{viewingDecharge.commentairesCaissiere}</p>
                  </div>
                )}

                {viewingDecharge.difficultesTerrain && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-600 block text-[10px] uppercase">
                      Difficultés de terrain & Réclamations :
                    </span>
                    <p className="text-slate-800 mt-0.5">{viewingDecharge.difficultesTerrain}</p>
                  </div>
                )}
              </div>

              {/* Cartouche des signatures conjointes */}
              <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-center">
                <div className="space-y-10">
                  <div>
                    <span className="font-bold text-slate-900 uppercase text-[10px] block">
                      L'Agent de Terrain Déposant
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium">
                      {viewingDecharge.agentNom}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 italic">[Signature de l'Agent]</div>
                </div>

                <div className="space-y-10">
                  <div>
                    <span className="font-bold text-slate-900 uppercase text-[10px] block">
                      La Caissière Principale
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium">
                      {viewingDecharge.saisiPar}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 italic">[Cachet & Signature Caisse]</div>
                </div>

                <div className="space-y-10">
                  <div>
                    <span className="font-bold text-slate-900 uppercase text-[10px] block">
                      Contrôle & Visa DAF
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium">
                      {viewingDecharge.visaDaf || 'En cours de validation'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 italic">[Visa Direction Financière]</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE SAISIE DU RAPPORT D'AGENT PAR LA CAISSIÈRE */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {editingReport ? 'Modifier le Rapport d\'Agent' : 'Saisie Caisse : Rapport de Tournée d\'un Agent'}
                </h2>
                <p className="text-xs text-slate-500">
                  Enregistrement effectué par la Caissière Principale : <strong>{currentUser.nom}</strong>
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {/* Agent et Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Agent de Terrain / Gestionnaire *
                  </label>
                  <select
                    value={agentNom}
                    onChange={(e) => handleAgentSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white"
                  >
                    {gestionnaires.map((g) => (
                      <option key={g.id} value={`${g.nom} ${g.prenom} (${g.code})`}>
                        {g.nom} {g.prenom} ({g.code}) — {g.zoneSecteur}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date de la Tournée *</label>
                  <input
                    type="date"
                    required
                    value={dateRapport}
                    onChange={(e) => setDateRapport(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              {/* Secteur & Mission */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Zone / Marché / Secteur *</label>
                  <input
                    type="text"
                    required
                    value={zoneSecteur}
                    onChange={(e) => setZoneSecteur(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    placeholder="Ex: Marché Central d'Adjamé..."
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Type de Mission *</label>
                  <input
                    type="text"
                    required
                    value={typeMission}
                    onChange={(e) => setTypeMission(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    placeholder="Ex: Tournée de collecte journalière, relance..."
                  />
                </div>
              </div>

              {/* Bilan des visites */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wider block mb-3">
                  1. Bilan Opérationnel des Visites sur le Terrain
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Adhérents visités</label>
                    <input
                      type="number"
                      min={0}
                      value={adherentsVisites}
                      onChange={(e) => setAdherentsVisites(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Adhérents ayant cotisé</label>
                    <input
                      type="number"
                      min={0}
                      value={adherentsCotisants}
                      onChange={(e) => setAdherentsCotisants(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nouvelles adhésions</label>
                    <input
                      type="number"
                      min={0}
                      value={nouvellesAdhesions}
                      onChange={(e) => setNouvellesAdhesions(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-indigo-700"
                    />
                  </div>
                </div>
              </div>

              {/* Encaissement Caisse & Mobile Money */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                <span className="font-bold text-emerald-950 uppercase text-[11px] tracking-wider block mb-3">
                  2. Remise des Fonds & Contrôle Caisse (Guichet)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Espèces Remises au Tiroir-Caisse (FCFA) *
                    </label>
                    <input
                      type="number"
                      step={100}
                      min={0}
                      required
                      value={montantEspecesRemis}
                      onChange={(e) => setMontantEspecesRemis(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-mono font-black text-emerald-800 text-sm"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Billets et pièces physiques comptés au guichet
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Mobile Money Déclaré (FCFA)
                    </label>
                    <input
                      type="number"
                      step={100}
                      min={0}
                      value={montantMobileMoneyDeclare}
                      onChange={(e) => setMontantMobileMoneyDeclare(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-800 text-sm"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Wave, Orange Money, MoMo avec reçus numériques
                    </span>
                  </div>
                </div>

                {/* Calcul automatique du total */}
                <div className="mt-3 p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 text-xs uppercase">
                    Total Encaissé de la Tournée :
                  </span>
                  <span className="font-mono font-black text-base text-emerald-900">
                    {(totalSaisieCalculee || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              {/* Conformité et Écarts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Conformité du Versement en Caisse *
                  </label>
                  <select
                    value={conformiteCaisse}
                    onChange={(e) => setConformiteCaisse(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="Conforme (Fonds complets)">Conforme (Fonds complets reçus)</option>
                    <option value="Écart constaté (À justifier)">Écart constaté (À justifier)</option>
                  </select>
                </div>

                {conformiteCaisse.includes('Écart') && (
                  <div>
                    <label className="block font-bold text-rose-700 mb-1">
                      Justification / Montant de l'écart *
                    </label>
                    <input
                      type="text"
                      required
                      value={explicationEcart}
                      onChange={(e) => setExplicationEcart(e.target.value)}
                      placeholder="Ex: Différence de 5 000 F à combler demain..."
                      className="w-full px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl font-medium text-rose-900"
                    />
                  </div>
                )}
              </div>

              {/* Remarques et difficultés */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observations de la Caissière Principale
                </label>
                <input
                  type="text"
                  value={commentairesCaissiere}
                  onChange={(e) => setCommentairesCaissiere(e.target.value)}
                  placeholder="Notes de vérification des carnets, reçu délivré..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Difficultés de Terrain & Réclamations
                  </label>
                  <textarea
                    rows={2}
                    value={difficultesTerrain}
                    onChange={(e) => setDifficultesTerrain(e.target.value)}
                    placeholder="Problèmes signalés par l'agent ou les adhérents..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Actions Prioritaires à Mener
                  </label>
                  <textarea
                    rows={2}
                    value={actionsPrioritaires}
                    onChange={(e) => setActionsPrioritaires(e.target.value)}
                    placeholder="Relance urgente, dossiers à régulariser..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingReport ? 'Mettre à Jour le Rapport' : 'Enregistrer le Rapport en Caisse'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOÎTE DE DIALOGUE : VISA DE CONTRÔLE DAF */}
      {visaReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-snug">
                      Boîte de Dialogue : Visa de Contrôle DAF
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Contrôle formel et clôture comptable de la tournée
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setVisaReport(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Récapitulatif du rapport contrôlé */}
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-500 font-medium">Agent audité :</span>
                  <span className="font-extrabold text-slate-900">{visaReport.agentNom}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-500 font-medium">Date & Secteur :</span>
                  <span className="font-bold text-slate-800">
                    {formatDateShort(visaReport.dateRapport)} • {visaReport.zoneSecteur}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-500 font-medium">Espèces Caisse :</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {(visaReport?.montantEspecesRemis ?? 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-500 font-medium">Mobile Money Déclaré :</span>
                  <span className="font-mono font-bold text-slate-700">
                    {(visaReport?.montantMobileMoneyDeclare ?? 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-900 font-extrabold">
                  <span>Total Encaissé Vérifié :</span>
                  <span className="font-mono text-sm text-indigo-950">
                    {(visaReport?.totalCollecte ?? 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-500 font-medium">Conformité Caisse :</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      visaReport.conformiteCaisse.includes('Conforme')
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {visaReport.conformiteCaisse}
                  </span>
                </div>
              </div>

              {/* Saisie des observations de visa */}
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Mention & Observations du Contrôleur DAF :
                </label>
                <textarea
                  rows={3}
                  value={visaObservations}
                  onChange={(e) => setVisaObservations(e.target.value)}
                  placeholder="Mentionner le constat d'audit, comptage des espèces..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Ce visa sera consigné de façon définitive avec le nom de l'utilisateur actif ({currentUser.nom}).
                </p>
              </div>

              {/* Boutons d'action */}
              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setVisaReport(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVisaDaf}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Apposer le Visa DAF et Clôturer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
