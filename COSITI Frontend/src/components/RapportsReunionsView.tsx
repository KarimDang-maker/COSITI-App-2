import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { RapportReunion, TypeReunion, TYPES_REUNIONS, DecisionReunion } from '../types';
import { formatDateShort } from '../utils/helpers';
import { exportToExcel } from '../utils/exportUtils';
import {
  FileText,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Plus,
  Edit2,
  Trash2,
  Printer,
  FileSpreadsheet,
  Search,
  X,
  Building,
  CheckSquare,
  Sparkles,
} from 'lucide-react';

export const RapportsReunionsView: React.FC = () => {
  const {
    rapportsReunions,
    addRapportReunion,
    updateRapportReunion,
    deleteRapportReunion,
    currentUser,
    parametres,
    signataires,
  } = useApp();
  const dialog = useDialog();

  const [selectedType, setSelectedType] = useState<string>('TOUS');
  const [selectedStatut, setSelectedStatut] = useState<string>('TOUS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modales
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingReport, setEditingReport] = useState<RapportReunion | null>(null);
  const [viewingReport, setViewingReport] = useState<RapportReunion | null>(null);

  // Boîte de dialogue pour ajout/édition d'une décision
  const [isDecisionDialogOpen, setIsDecisionDialogOpen] = useState<boolean>(false);
  const [editingDecision, setEditingDecision] = useState<DecisionReunion | null>(null);
  const [dialogDecDesc, setDialogDecDesc] = useState<string>('');
  const [dialogDecResp, setDialogDecResp] = useState<string>('Direction COSITI');
  const [dialogDecDate, setDialogDecDate] = useState<string>('');
  const [dialogDecStatut, setDialogDecStatut] = useState<'À faire' | 'En cours' | 'Réalisé'>('À faire');

  // Formulaire
  const [titre, setTitre] = useState<string>('');
  const [typeReunion, setTypeReunion] = useState<TypeReunion>('Comité de Direction (DG / DGA / DAF)');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [heureDebut, setHeureDebut] = useState<string>('10:00');
  const [heureFin, setHeureFin] = useState<string>('12:00');
  const [lieu, setLieu] = useState<string>('Salle de Réunion du Siège COSITI');
  const [presidentSeance, setPresidentSeance] = useState<string>(
    currentUser.role === 'PCA'
      ? `${currentUser.nom} (PCA)`
      : currentUser.role === 'DG'
      ? `${currentUser.nom} (DG)`
      : `${signataires.dg} (Directeur Général - DG)`
  );
  const [secretaireSeance, setSecretaireSeance] = useState<string>(`${signataires.dga} (Directrice Générale Adjointe - DGA)`);
  const [participantsPresents, setParticipantsPresents] = useState<string>('');
  const [participantsAbsents, setParticipantsAbsents] = useState<string>('Néant');
  const [ordreDuJour, setOrdreDuJour] = useState<string>('');
  const [syntheseDiscussions, setSyntheseDiscussions] = useState<string>('');
  const [decisions, setDecisions] = useState<DecisionReunion[]>([]);
  const [prochaineReunionDate, setProchaineReunionDate] = useState<string>('');
  const [statut, setStatut] = useState<'Brouillon' | 'Validé & Signé' | 'Diffusé'>('Validé & Signé');
  const [piecesJointesOuNotes, setPiecesJointesOuNotes] = useState<string>('');

  // Nouvelle décision temporaire dans le formulaire
  const [newDecDesc, setNewDecDesc] = useState<string>('');
  const [newDecResp, setNewDecResp] = useState<string>('');
  const [newDecDate, setNewDecDate] = useState<string>('');

  // Statistiques
  const stats = useMemo(() => {
    const total = rapportsReunions.length;
    let totalDecisions = 0;
    let decisionsRealisees = 0;
    rapportsReunions.forEach((r) => {
      if (r.decisions) {
        totalDecisions += r.decisions.length;
        decisionsRealisees += r.decisions.filter((d) => d.statut === 'Réalisé').length;
      }
    });
    const ca = rapportsReunions.filter((r) => r.typeReunion === 'Conseil d\'Administration').length;
    const codir = rapportsReunions.filter((r) => r.typeReunion.includes('Direction')).length;
    return {
      total,
      totalDecisions,
      decisionsRealisees,
      tauxDecisions: totalDecisions > 0 ? Math.round((decisionsRealisees / totalDecisions) * 100) : 0,
      ca,
      codir,
    };
  }, [rapportsReunions]);

  // Filtrage
  const filteredReports = useMemo(() => {
    return (rapportsReunions || []).filter((r) => {
      if (!r) return false;
      const matchType = selectedType === 'TOUS' || r.typeReunion === selectedType;
      const matchStatut = selectedStatut === 'TOUS' || r.statut === selectedStatut;
      const q = (searchTerm || '').toLowerCase().trim();
      const titre = (r.titre || '').toLowerCase();
      const pres = (r.presidentSeance || '').toLowerCase();
      const part = (r.participantsPresents || '').toLowerCase();
      const ordre = (r.ordreDuJour || '').toLowerCase();
      const matchSearch =
        !q ||
        titre.includes(q) ||
        pres.includes(q) ||
        part.includes(q) ||
        ordre.includes(q);
      return matchType && matchStatut && matchSearch;
    });
  }, [rapportsReunions, selectedType, selectedStatut, searchTerm]);

  const handleOpenAdd = () => {
    setEditingReport(null);
    setTitre('');
    setTypeReunion('Comité de Direction (DG / DGA / DAF)');
    setDate(new Date().toISOString().split('T')[0]);
    setHeureDebut('10:00');
    setHeureFin('12:00');
    setLieu('Salle de Réunion du Siège COSITI');
    setPresidentSeance(
      currentUser.role === 'PCA'
        ? `${currentUser.nom} (PCA)`
        : currentUser.role === 'DG'
        ? `${currentUser.nom} (DG)`
        : `${signataires.dg} (Directeur Général - DG)`
    );
    setSecretaireSeance(`${signataires.dga} (Directrice Générale Adjointe - DGA)`);
    setParticipantsPresents(`${signataires.dg} (DG), ${signataires.dga} (DGA), ${signataires.daf} (DAF)`);
    setParticipantsAbsents('Néant');
    setOrdreDuJour('1. Examen des états de caisse et de recouvrement\n2. Point sur les dossiers d\'immatriculation CNPS\n3. Organisation des tournées de terrain des agents\n4. Divers');
    setSyntheseDiscussions('');
    setDecisions([]);
    setProchaineReunionDate('');
    setStatut('Validé & Signé');
    setPiecesJointesOuNotes('PV officiel signé par la Présidence de séance et la Direction.');
    setShowModal(true);
  };

  const handleOpenEdit = (rep: RapportReunion) => {
    setEditingReport(rep);
    setTitre(rep.titre);
    setTypeReunion(rep.typeReunion);
    setDate(rep.date);
    setHeureDebut(rep.heureDebut);
    setHeureFin(rep.heureFin || '');
    setLieu(rep.lieu);
    setPresidentSeance(rep.presidentSeance);
    setSecretaireSeance(rep.secretaireSeance);
    setParticipantsPresents(rep.participantsPresents);
    setParticipantsAbsents(rep.participantsAbsents || 'Néant');
    setOrdreDuJour(rep.ordreDuJour);
    setSyntheseDiscussions(rep.syntheseDiscussions);
    setDecisions(rep.decisions || []);
    setProchaineReunionDate(rep.prochaineReunionDate || '');
    setStatut(rep.statut);
    setPiecesJointesOuNotes(rep.piecesJointesOuNotes || '');
    setShowModal(true);
  };

  const handleOpenNewDecisionDialog = () => {
    setEditingDecision(null);
    setDialogDecDesc('');
    setDialogDecResp('Direction COSITI');
    setDialogDecDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setDialogDecStatut('À faire');
    setIsDecisionDialogOpen(true);
  };

  const handleOpenEditDecisionDialog = (dec: DecisionReunion) => {
    setEditingDecision(dec);
    setDialogDecDesc(dec.description);
    setDialogDecResp(dec.responsable);
    setDialogDecDate(dec.echeance);
    setDialogDecStatut(dec.statut);
    setIsDecisionDialogOpen(true);
  };

  const handleSaveDecisionFromDialog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialogDecDesc.trim()) return;

    if (editingDecision) {
      setDecisions(
        decisions.map((d) =>
          d.id === editingDecision.id
            ? {
                ...d,
                description: dialogDecDesc.trim(),
                responsable: dialogDecResp.trim() || 'Direction COSITI',
                echeance: dialogDecDate || new Date().toISOString().split('T')[0],
                statut: dialogDecStatut,
              }
            : d
        )
      );
    } else {
      const newDec: DecisionReunion = {
        id: `dec-${Date.now()}`,
        description: dialogDecDesc.trim(),
        responsable: dialogDecResp.trim() || 'Direction COSITI',
        echeance: dialogDecDate || new Date().toISOString().split('T')[0],
        statut: dialogDecStatut,
      };
      setDecisions([...decisions, newDec]);
    }

    setIsDecisionDialogOpen(false);
  };

  const handleAddDecision = () => {
    if (!newDecDesc.trim()) return;
    const newDec: DecisionReunion = {
      id: `dec-${Date.now()}`,
      description: newDecDesc.trim(),
      responsable: newDecResp.trim() || 'Direction COSITI',
      echeance: newDecDate || new Date().toISOString().split('T')[0],
      statut: 'À faire',
    };
    setDecisions([...decisions, newDec]);
    setNewDecDesc('');
    setNewDecResp('');
    setNewDecDate('');
  };

  const handleRemoveDecision = async (id: string, decDesc?: string) => {
    const confirmed = await dialog.confirm({
      title: 'Suppression de la décision',
      message: 'Voulez-vous retirer cette résolution / décision du procès-verbal ?',
      details: decDesc ? [{ label: 'Résolution', value: decDesc }] : undefined,
      confirmText: 'Supprimer',
      cancelText: 'Conserver',
      variant: 'danger',
      icon: 'trash',
    });
    if (confirmed) {
      setDecisions(decisions.filter((d) => d.id !== id));
    }
  };

  const handleToggleDecisionStatut = (id: string) => {
    setDecisions(
      decisions.map((d) => {
        if (d.id === id) {
          const nextStatut = d.statut === 'À faire' ? 'En cours' : d.statut === 'En cours' ? 'Réalisé' : 'À faire';
          return { ...d, statut: nextStatut };
        }
        return d;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim() || !date || !presidentSeance.trim()) {
      await dialog.alert({
        title: 'Champs obligatoires requis',
        message: 'Veuillez renseigner le titre de la réunion, la date et le président de séance.',
        variant: 'warning',
      });
      return;
    }

    if (editingReport) {
      updateRapportReunion(editingReport.id, {
        titre: titre.trim(),
        typeReunion,
        date,
        heureDebut,
        heureFin,
        lieu: lieu.trim(),
        presidentSeance: presidentSeance.trim(),
        secretaireSeance: secretaireSeance.trim(),
        participantsPresents: participantsPresents.trim(),
        participantsAbsents: participantsAbsents.trim(),
        ordreDuJour: ordreDuJour.trim(),
        syntheseDiscussions: syntheseDiscussions.trim(),
        decisions,
        prochaineReunionDate: prochaineReunionDate || undefined,
        statut,
        piecesJointesOuNotes: piecesJointesOuNotes.trim(),
      });
    } else {
      addRapportReunion({
        titre: titre.trim(),
        typeReunion,
        date,
        heureDebut,
        heureFin,
        lieu: lieu.trim(),
        presidentSeance: presidentSeance.trim(),
        secretaireSeance: secretaireSeance.trim(),
        participantsPresents: participantsPresents.trim(),
        participantsAbsents: participantsAbsents.trim(),
        ordreDuJour: ordreDuJour.trim(),
        syntheseDiscussions: syntheseDiscussions.trim(),
        decisions,
        prochaineReunionDate: prochaineReunionDate || undefined,
        statut,
        redigePar: `${currentUser.nom} (${currentUser.role})`,
        piecesJointesOuNotes: piecesJointesOuNotes.trim(),
      });
    }

    setShowModal(false);

    await dialog.alert({
      title: editingReport ? 'Procès-Verbal actualisé' : 'Procès-Verbal enregistré',
      message: `Le rapport « ${titre.trim()} » a été enregistré avec succès avec ${decisions.length} décision(s) tracée(s).`,
      variant: 'success',
    });
  };

  const handleDelete = async (id: string, repTitre: string) => {
    const target = rapportsReunions.find((r) => r.id === id);
    const confirmed = await dialog.confirm({
      title: 'Suppression du Procès-Verbal',
      message: `Confirmez-vous la suppression définitive du rapport de réunion « ${repTitre} » ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash',
      details: [
        { label: 'Titre', value: repTitre },
        { label: 'Date', value: formatDateShort(target?.date || '') },
        { label: 'Type', value: target?.typeReunion || '' },
      ],
    });

    if (confirmed) {
      deleteRapportReunion(id);
      if (viewingReport?.id === id) setViewingReport(null);
      await dialog.alert({
        title: 'Procès-Verbal supprimé',
        message: 'Le procès-verbal a été supprimé des archives avec succès.',
        variant: 'info',
      });
    }
  };

  const handleExportAll = () => {
    const dataToExport = filteredReports.map((r) => ({
      Date: r.date,
      Titre: r.titre,
      Type: r.typeReunion,
      Lieu: r.lieu,
      'Heure Début': r.heureDebut,
      'Heure Fin': r.heureFin || '—',
      Président: r.presidentSeance,
      Secrétaire: r.secretaireSeance,
      Statut: r.statut,
      'Nb Décisions': r.decisions?.length || 0,
      'Rédigé Par': r.redigePar,
    }));
    exportToExcel(dataToExport, `COSITI_Rapports_Reunions_${new Date().toISOString().split('T')[0]}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full">
              Gouvernance & Délibérations
            </span>
            <span className="text-xs text-slate-500">• PV Officiels</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
            Rapports de Réunion & Procès-Verbaux
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tenue des délibérations, ordres du jour, synthèses des débats et suivi des résolutions prises
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
            <span>Nouveau Rapport de Réunion</span>
          </button>
        </div>
      </div>

      {/* Cartes KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Réunions Enregistrées</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.total}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            {stats.ca} Conseils d'Admin • {stats.codir} Comités Dir.
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Décisions Arrêtées</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{stats.totalDecisions}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Résolutions et actions consignées
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actions Réalisées</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{stats.decisionsRealisees}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Taux d'exécution : <strong className="text-emerald-700">{stats.tauxDecisions}%</strong>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Authentification</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900 mt-2">Visas Numériques</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Signature conjointe PCA, DG & DAF
          </div>
        </div>
      </div>

      {/* Barre de Filtres */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par objet, participant, ordre du jour..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium w-64 sm:w-80 focus:bg-white focus:outline-indigo-500"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white"
          >
            <option value="TOUS">Tous les types de réunions</option>
            {TYPES_REUNIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={selectedStatut}
            onChange={(e) => setSelectedStatut(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white"
          >
            <option value="TOUS">Tous les statuts</option>
            <option value="Brouillon">Brouillon</option>
            <option value="Validé & Signé">Validé & Signé</option>
            <option value="Diffusé">Diffusé</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-bold self-end sm:self-center">
          {filteredReports.length} procès-verbal(aux) trouvé(s)
        </div>
      </div>

      {/* Liste des Rapports de Réunion */}
      <div className="space-y-4 print:hidden">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-700">Aucun rapport de réunion ne correspond à vos filtres</p>
            <p className="text-xs text-slate-400 mt-1">Créez un nouveau procès-verbal en cliquant sur le bouton ci-dessus.</p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const decisionsCount = report.decisions?.length || 0;
            const decisionsDone = report.decisions?.filter((d) => d.statut === 'Réalisé').length || 0;

            return (
              <div
                key={report.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="space-y-2.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                      {report.typeReunion}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        report.statut === 'Validé & Signé'
                          ? 'bg-emerald-100 text-emerald-800'
                          : report.statut === 'Diffusé'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {report.statut}
                    </span>
                    <span className="text-xs font-medium text-slate-400 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 inline mr-1" />
                      {formatDateShort(report.date)}
                    </span>
                    <span className="text-xs font-medium text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 inline mr-1" />
                      {report.heureDebut} {report.heureFin ? `à ${report.heureFin}` : ''}
                    </span>
                  </div>

                  <h2 className="text-base font-black text-slate-900 leading-snug">
                    {report.titre}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">{report.lieu}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span><strong>Présidence :</strong> {report.presidentSeance}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span><strong>Secrétaire :</strong> {report.secretaireSeance}</span>
                    </div>
                  </div>

                  {report.syntheseDiscussions && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 line-clamp-2 italic">
                      « {report.syntheseDiscussions} »
                    </p>
                  )}

                  {decisionsCount > 0 && (
                    <div className="flex items-center space-x-2 text-xs pt-1">
                      <span className="font-bold text-slate-700 flex items-center space-x-1">
                        <CheckSquare className="w-3.5 h-3.5 text-amber-500 inline mr-1" />
                        {decisionsCount} décision(s) prise(s) :
                      </span>
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {decisionsDone}/{decisionsCount} action(s) réalisée(s)
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    onClick={() => setViewingReport(report)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Consulter & Imprimer PV</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(report)}
                      title="Modifier le rapport"
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(report.id, report.titre)}
                      title="Supprimer le rapport"
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODALE DE VISUALISATION DÉTAILLÉE / IMPRESSION OFFICIELLE DU PV */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Barre d'action modale */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10 print:hidden">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full">
                  Procès-Verbal Officiel de Séance
                </span>
                <span className="text-xs text-slate-400">Réf: {viewingReport.id}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer / PDF</span>
                </button>
                <button
                  onClick={() => setViewingReport(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* CONTENU IMPRIMABLE DU PROCÈS-VERBAL */}
            <div className="p-8 space-y-6 text-slate-800" id="pv-printable-content">
              {/* En-tête officiel */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                <div className="text-base font-black text-slate-950 uppercase tracking-wide">
                  {parametres?.nomOrganisation || 'COSITI'}
                </div>
                <div className="text-xs font-bold text-slate-600">
                  {parametres?.sigle || 'COSITI'} • {parametres?.slogan || 'Solidarité • Prévoyance • Dignité'}
                </div>
                <div className="text-xs text-slate-500">
                  {parametres?.adresse || ''} | Tél: {parametres?.telephone || ''} | Email: {parametres?.email || ''}
                </div>
              </div>

              {/* Titre du PV */}
              <div className="text-center py-2 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">
                  {viewingReport.typeReunion}
                </span>
                <h1 className="text-lg font-black text-slate-900 mt-1 px-4">
                  PROCÈS-VERBAL : {viewingReport.titre.toUpperCase()}
                </h1>
                <div className="text-xs font-medium text-slate-500 mt-1">
                  Séance du {formatDateShort(viewingReport.date)} • De {viewingReport.heureDebut} à {viewingReport.heureFin || '—'}
                </div>
              </div>

              {/* Renseignements généraux de la séance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Lieu de réunion :</span>
                  <span className="font-semibold text-slate-900">{viewingReport.lieu}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Statut du Procès-Verbal :</span>
                  <span className="font-bold text-emerald-700">{viewingReport.statut}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Président de Séance :</span>
                  <span className="font-semibold text-slate-900">{viewingReport.presidentSeance}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Secrétaire de Séance :</span>
                  <span className="font-semibold text-slate-900">{viewingReport.secretaireSeance}</span>
                </div>
              </div>

              {/* Participants */}
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1 uppercase text-[10px] tracking-wider">
                    Membres et Participants Présents :
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {viewingReport.participantsPresents}
                  </p>
                </div>
                {viewingReport.participantsAbsents && viewingReport.participantsAbsents !== 'Néant' && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1 uppercase text-[10px] tracking-wider">
                      Absents Excusés :
                    </span>
                    <p className="text-slate-700 leading-relaxed font-medium">
                      {viewingReport.participantsAbsents}
                    </p>
                  </div>
                )}
              </div>

              {/* Ordre du jour */}
              <div className="space-y-2 text-xs">
                <h3 className="font-black text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 text-xs">
                  I. Ordre du Jour
                </h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-line text-slate-800 leading-relaxed font-medium">
                  {viewingReport.ordreDuJour}
                </div>
              </div>

              {/* Délibérations et Synthèse */}
              <div className="space-y-2 text-xs">
                <h3 className="font-black text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 text-xs">
                  II. Déroulement de la Séance & Synthèse des Délibérations
                </h3>
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-line font-medium text-justify">
                  {viewingReport.syntheseDiscussions || 'Les délibérations ont porté sur les points inscrits à l\'ordre du jour.'}
                </div>
              </div>

              {/* Décisions & Résolutions arrêtées */}
              <div className="space-y-2 text-xs">
                <h3 className="font-black text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 text-xs flex items-center justify-between">
                  <span>III. Décisions, Résolutions & Plan d'Action Retenus</span>
                  <span className="text-slate-500 font-normal">
                    ({viewingReport.decisions?.length || 0} résolution(s))
                  </span>
                </h3>

                {(!viewingReport.decisions || viewingReport.decisions.length === 0) ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">
                    Aucune décision spécifique soumise à échéancier.
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                          <th className="py-2.5 px-3">N°</th>
                          <th className="py-2.5 px-3">Description de la Résolution / Action</th>
                          <th className="py-2.5 px-3">Responsable</th>
                          <th className="py-2.5 px-3">Échéance</th>
                          <th className="py-2.5 px-3 text-center">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {viewingReport.decisions.map((dec, idx) => (
                          <tr key={dec.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">{dec.description}</td>
                            <td className="py-2.5 px-3 text-slate-700 font-semibold">{dec.responsable}</td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono">{formatDateShort(dec.echeance)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  dec.statut === 'Réalisé'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : dec.statut === 'En cours'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {dec.statut}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {viewingReport.prochaineReunionDate && (
                <div className="text-xs bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <span className="font-bold text-indigo-900">Prochaine réunion programmée :</span>
                  <span className="font-mono font-bold text-indigo-800">{formatDateShort(viewingReport.prochaineReunionDate)}</span>
                </div>
              )}

              {/* Cartouche de Signatures Officielles */}
              <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-center text-xs">
                <div className="space-y-12">
                  <div>
                    <span className="font-bold text-slate-900 uppercase text-[10px] block">
                      Le Président de Séance
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium">
                      {viewingReport.presidentSeance}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 italic">
                    [Visa & Paraphe officiel]
                  </div>
                </div>

                <div className="space-y-12">
                  <div>
                    <span className="font-bold text-slate-900 uppercase text-[10px] block">
                      La Secrétaire de Séance
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium">
                      {viewingReport.secretaireSeance}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 italic">
                    [Visa & Signature]
                  </div>
                </div>

                <div className="space-y-12">
                  <div>
                    <span className="font-bold text-slate-900 uppercase text-[10px] block">
                      La Direction Administrative & Financière
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium">
                      {signataires.daf} (DAF)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 italic">
                    [Visa d'archivage & Conformité]
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE D'AJOUT / MODIFICATION D'UN RAPPORT DE RÉUNION */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <h2 className="text-base font-black text-slate-900">
                {editingReport ? 'Modifier le Procès-Verbal de Réunion' : 'Nouveau Rapport de Réunion & Procès-Verbal'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Intitulé / Objet de la Réunion *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Réunion de Coordination Mensuelle des Gestionnaires de Portefeuille"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Type d'instance *</label>
                  <select
                    value={typeReunion}
                    onChange={(e) => setTypeReunion(e.target.value as TypeReunion)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    {TYPES_REUNIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Statut du Procès-Verbal *</label>
                  <select
                    value={statut}
                    onChange={(e) => setStatut(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-700"
                  >
                    <option value="Brouillon">Brouillon</option>
                    <option value="Validé & Signé">Validé & Signé</option>
                    <option value="Diffusé">Diffusé</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date de la séance *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Heure de début *</label>
                  <input
                    type="time"
                    required
                    value={heureDebut}
                    onChange={(e) => setHeureDebut(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Heure de fin</label>
                  <input
                    type="time"
                    value={heureFin}
                    onChange={(e) => setHeureFin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lieu de la réunion</label>
                <input
                  type="text"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Président(e) de séance *</label>
                  <input
                    type="text"
                    required
                    value={presidentSeance}
                    onChange={(e) => setPresidentSeance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Secrétaire de séance *</label>
                  <input
                    type="text"
                    required
                    value={secretaireSeance}
                    onChange={(e) => setSecretaireSeance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Membres Présents</label>
                <textarea
                  rows={2}
                  value={participantsPresents}
                  onChange={(e) => setParticipantsPresents(e.target.value)}
                  placeholder="Noms et titres des participants présents..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ordre du Jour Détaillé *</label>
                <textarea
                  rows={3}
                  required
                  value={ordreDuJour}
                  onChange={(e) => setOrdreDuJour(e.target.value)}
                  placeholder="1. Examen des comptes&#10;2. Bilan d'immatriculation&#10;3. Divers..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Synthèse des Débats & Délibérations
                </label>
                <textarea
                  rows={4}
                  value={syntheseDiscussions}
                  onChange={(e) => setSyntheseDiscussions(e.target.value)}
                  placeholder="Résumé fidèle des échanges, interventions et arbitrages intervenus..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              {/* Section dynamique des décisions et résolutions */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                    Décisions, Résolutions & Plan d'Action ({decisions.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenNewDecisionDialog}
                    className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold text-xs rounded-xl flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Boîte de Dialogue : Nouvelle Résolution</span>
                  </button>
                </div>

                {decisions.length > 0 && (
                  <div className="space-y-2">
                    {decisions.map((dec, idx) => (
                      <div
                        key={dec.id}
                        className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 text-xs"
                      >
                        <div className="flex-1 pr-3">
                          <span className="font-bold text-slate-900">{idx + 1}. {dec.description}</span>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Responsable : <strong>{dec.responsable}</strong> • Échéance : {dec.echeance}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleToggleDecisionStatut(dec.id)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                              dec.statut === 'Réalisé'
                                ? 'bg-emerald-100 text-emerald-800'
                                : dec.statut === 'En cours'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {dec.statut}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditDecisionDialog(dec)}
                            title="Modifier via la boîte de dialogue"
                            className="p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDecision(dec.id, dec.description)}
                            className="p-1 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ajout rapide d'une décision */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                  <input
                    type="text"
                    placeholder="Description de la décision..."
                    value={newDecDesc}
                    onChange={(e) => setNewDecDesc(e.target.value)}
                    className="sm:col-span-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Responsable désigné..."
                    value={newDecResp}
                    onChange={(e) => setNewDecResp(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="date"
                      value={newDecDate}
                      onChange={(e) => setNewDecDate(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddDecision}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date de la prochaine séance</label>
                <input
                  type="date"
                  value={prochaineReunionDate}
                  onChange={(e) => setProchaineReunionDate(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                />
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
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingReport ? 'Enregistrer les Modifications' : 'Créer le Procès-Verbal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOÎTE DE DIALOGUE : AJOUT / MODIFICATION D'UNE RÉSOLUTION */}
      {isDecisionDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <form onSubmit={handleSaveDecisionFromDialog} className="p-6">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-snug">
                      {editingDecision ? 'Boîte de Dialogue : Modifier Résolution' : 'Boîte de Dialogue : Nouvelle Résolution'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Assignation et suivi de la décision de séance
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDecisionDialogOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Libellé / Objet de la résolution *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={dialogDecDesc}
                    onChange={(e) => setDialogDecDesc(e.target.value)}
                    placeholder="Ex: Procéder à l'audit contradictoire de la caisse..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Responsable désigné *</label>
                    <input
                      type="text"
                      required
                      value={dialogDecResp}
                      onChange={(e) => setDialogDecResp(e.target.value)}
                      placeholder="Direction Financière, DG, Caissière..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Échéance calendaire</label>
                    <input
                      type="date"
                      value={dialogDecDate}
                      onChange={(e) => setDialogDecDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Statut d'exécution</label>
                  <select
                    value={dialogDecStatut}
                    onChange={(e) => setDialogDecStatut(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-indigo-500"
                  >
                    <option value="À faire">À faire (En attente d'engagement)</option>
                    <option value="En cours">En cours (En cours de traitement)</option>
                    <option value="Réalisé">Réalisé (Exécuté & clôturé)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsDecisionDialogOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>{editingDecision ? 'Enregistrer les modifications' : 'Consigner la décision'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
