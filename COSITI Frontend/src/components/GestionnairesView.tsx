import { sumMoney } from '../utils/money';
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { GestionnairePortefeuille, Adherent } from '../types';
import { formatFCFA } from '../utils/helpers';
import { exporterListe } from '../api/excel';
import {
  UserPlus,
  Search,
  Filter,
  Users,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Target,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  FileSpreadsheet,
  Edit,
  Trash2,
  ChevronRight,
  UserCheck,
  UserX,
  ExternalLink,
  ShieldAlert,
  ArrowRightLeft,
  X,
} from 'lucide-react';
import { GestionnaireModal } from './GestionnaireModal';

export const GestionnairesView: React.FC = () => {
  const {
    gestionnaires,
    adherents,
    cotisations,
    parametres,
    deleteGestionnaire,
    assignerPortefeuille,
    statsOf,
    dashboard,
  } = useApp();
  const dialog = useDialog();

  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('TOUS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gestionnaireToEdit, setGestionnaireToEdit] = useState<GestionnairePortefeuille | null>(null);

  // Portfolio viewer drawer state
  const [selectedPortfolioGestionnaire, setSelectedPortfolioGestionnaire] =
    useState<GestionnairePortefeuille | null>(null);

  // Quick assignment modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetGestionnaire, setAssignTargetGestionnaire] =
    useState<GestionnairePortefeuille | null>(null);
  const [assignAdherentSearch, setAssignAdherentSearch] = useState('');

  // Sécurité suppression PIN
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Calculs statistiques
  const totalAdherents = adherents.length;
  const adherentsAvecPortefeuille = adherents.filter((a) => a.gestionnaireId).length;
  const adherentsSansPortefeuille = totalAdherents - adherentsAvecPortefeuille;
  const tauxCouverture = totalAdherents > 0
    ? Math.round((adherentsAvecPortefeuille / totalAdherents) * 100)
    : 0;

  // Montant recouvré ce mois et adhérents en retard par gestionnaire : calculés par le serveur (GET /dashboard)
  const statsParGestionnaire = useMemo(() => {
    const map = new Map<string, { totalRecouvre: number; countAdherents: number; adherentsEnRetard: number }>();
    gestionnaires.forEach((g) => map.set(g.id, { totalRecouvre: 0, countAdherents: 0, adherentsEnRetard: 0 }));
    (dashboard?.gestionnaires || []).forEach((g) => {
      if (map.has(g.id)) map.set(g.id, { totalRecouvre: g.recouvreCeMois, countAdherents: g.adherents, adherentsEnRetard: g.adherentsEnRetard });
    });
    return map;
  }, [gestionnaires, dashboard]);

  // Filtrage des gestionnaires
  const filteredGestionnaires = (gestionnaires || []).filter((g) => {
    if (!g) return false;
    const q = (search || '').toLowerCase().trim();
    const nom = (g.nom || '').toLowerCase();
    const prenom = (g.prenom || '').toLowerCase();
    const code = (g.code || '').toLowerCase();
    const tel = (g.telephone || '').toLowerCase();
    const zone = (g.zoneSecteur || '').toLowerCase();

    const matchesSearch =
      !q ||
      nom.includes(q) ||
      prenom.includes(q) ||
      code.includes(q) ||
      tel.includes(q) ||
      zone.includes(q);

    const matchesStatut = filterStatut === 'TOUS' || g.statut === filterStatut;
    return matchesSearch && matchesStatut;
  });

  // Gestionnaires objectifs globaux
  const objectifCumule = sumMoney(gestionnaires, (g) => g.objectifsRecouvrementMensuel);
  let totalRecouvreCeMois = 0;
  statsParGestionnaire.forEach((val) => {
    totalRecouvreCeMois += val.totalRecouvre;
  });

  const handleOpenNew = () => {
    setGestionnaireToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (g: GestionnairePortefeuille) => {
    setGestionnaireToEdit(g);
    setIsModalOpen(true);
  };

  const handleDeletePrompt = (g: GestionnairePortefeuille) => {
    setConfirmDeleteId(g.id);
    setPinCode('');
    setPinError(null);
  };

  const confirmDelete = () => {
    if (pinCode !== '0000' && pinCode !== '1111' && pinCode !== parametres.codeConfirmationSecurite) {
      setPinError('Code de sécurité incorrect. Code requis : 0000.');
      return;
    }

    if (confirmDeleteId) {
      deleteGestionnaire(confirmDeleteId);
      setConfirmDeleteId(null);
      setPinCode('');
      setPinError(null);
    }
  };

  const handleExportExcel = () => {
    // Format d'échange (réimportable) produit par le serveur, limité à la liste filtrée affichée
    void exporterListe('gestionnaires', filteredGestionnaires.map((g) => g.id));
  };

  // Adhérents attribués au gestionnaire sélectionné pour la consultation
  const portfolioAdherents = useMemo(() => {
    if (!selectedPortfolioGestionnaire) return [];
    return adherents.filter((a) => a.gestionnaireId === selectedPortfolioGestionnaire.id);
  }, [selectedPortfolioGestionnaire, adherents]);

  // Adhérents sans gestionnaire pour l'affectation rapide
  const unassignedAdherents = useMemo(() => {
    const q = (assignAdherentSearch || '').toLowerCase().trim();
    return (adherents || [])
      .filter((a) => !a.gestionnaireId || a.gestionnaireId !== assignTargetGestionnaire?.id)
      .filter((a) => {
        if (!a) return false;
        if (!q) return true;
        const mat = (a.matricule || '').toLowerCase();
        const nom = (a.nom || '').toLowerCase();
        const prenom = (a.prenom || '').toLowerCase();
        const tel = (a.telephone || '').toLowerCase();
        const adr = (a.adresse || '').toLowerCase();
        return (
          mat.includes(q) ||
          nom.includes(q) ||
          prenom.includes(q) ||
          tel.includes(q) ||
          adr.includes(q)
        );
      });
  }, [adherents, assignTargetGestionnaire, assignAdherentSearch]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Gestionnaires de Portefeuille
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Suivi personnalisé des adhérents par portefeuille et agent de recouvrement (Cameroun)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-2 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Exporter Excel
          </button>

          <button
            onClick={handleOpenNew}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            Enregistrer un gestionnaire
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Gestionnaires Actifs</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {gestionnaires.filter((g) => g.statut === 'Actif').length}
              <span className="text-xs font-normal text-slate-400 ml-1.5">
                / {gestionnaires.length} total
              </span>
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Équipes de terrain COSITI
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Couverture Portefeuille</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {tauxCouverture}%
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {adherentsAvecPortefeuille} sur {totalAdherents} adhérents suivis
            </p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Sans Portefeuille</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {adherentsSansPortefeuille}
            </p>
            <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> À affecter à un gestionnaire
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <UserX className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Recouvrement du mois</p>
            <p className="text-xl font-bold text-slate-800 mt-1">
              {formatFCFA(totalRecouvreCeMois)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Objectif: {formatFCFA(objectifCumule)}
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom, code, téléphone, zone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="TOUS">Tous les statuts</option>
            <option value="Actif">Actif uniquement</option>
            <option value="En congé">En congé</option>
            <option value="Inactif">Inactif / Suspendu</option>
          </select>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredGestionnaires.map((g) => {
          const stats = statsParGestionnaire.get(g.id) || {
            totalRecouvre: 0,
            countAdherents: 0,
            adherentsEnRetard: 0,
          };
          const pct =
            g.objectifsRecouvrementMensuel && g.objectifsRecouvrementMensuel > 0
              ? Math.min(100, Math.round((stats.totalRecouvre / g.objectifsRecouvrementMensuel) * 100))
              : 0;

          return (
            <div
              key={g.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5">
                {/* Header card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-700 to-teal-800 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                      {g.nom.slice(0, 1)}
                      {g.prenom.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-sm">
                          {g.nom} {g.prenom}
                        </h3>
                      </div>
                      <span className="inline-block font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5">
                        {g.code}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      g.statut === 'Actif'
                        ? 'bg-emerald-100 text-emerald-800'
                        : g.statut === 'En congé'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {g.statut}
                  </span>
                </div>

                {/* Contact & Zone details */}
                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate font-medium text-slate-700">{g.zoneSecteur}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <a
                        href={`tel:${g.telephone.replace(/\s+/g, '')}`}
                        className="hover:underline font-mono text-slate-700"
                      >
                        {g.telephone}
                      </a>
                    </div>
                    <a
                      href={`https://wa.me/${g.telephone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition"
                    >
                      WhatsApp
                    </a>
                  </div>
                  {g.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate text-slate-500">{g.email}</span>
                    </div>
                  )}
                </div>

                {/* Performance stats */}
                <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Adhérents assignés :</span>
                    <span className="font-bold text-slate-800">
                      {stats.countAdherents} adhérents
                      {stats.adherentsEnRetard > 0 && (
                        <span className="text-rose-600 font-normal text-[11px] ml-1.5">
                          ({stats.adherentsEnRetard} en retard)
                        </span>
                      )}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-500">Recouvrement mensuel</span>
                      <span className="font-semibold text-slate-700">
                        {formatFCFA(stats.totalRecouvre)} / {formatFCFA(g.objectifsRecouvrementMensuel || 0)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {g.notes && (
                  <p className="mt-3 text-[11px] text-slate-500 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                    "{g.notes}"
                  </p>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedPortfolioGestionnaire(g)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
                >
                  <Users className="w-3.5 h-3.5" />
                  Portefeuille ({stats.countAdherents})
                  <ChevronRight className="w-3 h-3" />
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignTargetGestionnaire(g);
                      setIsAssignModalOpen(true);
                    }}
                    title="Attribuer des adhérents"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEdit(g)}
                    title="Modifier le gestionnaire"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePrompt(g)}
                    title="Supprimer le gestionnaire (Code 0000)"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredGestionnaires.length === 0 && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold text-sm">
            Aucun gestionnaire de portefeuille trouvé
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Utilisez le bouton ci-dessous pour enregistrer votre premier gestionnaire de portefeuille.
          </p>
          <button
            onClick={handleOpenNew}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition"
          >
            + Enregistrer un gestionnaire
          </button>
        </div>
      )}

      {/* --- MODALE D'ENREGISTREMENT / MODIFICATION DU GESTIONNAIRE --- */}
      <GestionnaireModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        gestionnaireToEdit={gestionnaireToEdit}
      />

      {/* --- MODALE CONSULTATION DU PORTEFEUILLE D'UN GESTIONNAIRE --- */}
      {selectedPortfolioGestionnaire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in duration-200 my-8">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold">
                  {selectedPortfolioGestionnaire.code}
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    Portefeuille de {selectedPortfolioGestionnaire.nom} {selectedPortfolioGestionnaire.prenom}
                  </h2>
                  <p className="text-xs text-emerald-100">
                    Zone : {selectedPortfolioGestionnaire.zoneSecteur} • {portfolioAdherents.length} adhérent(s) rattaché(s)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPortfolioGestionnaire(null)}
                className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Liste des adhérents suivis par ce gestionnaire pour les cotisations journalières et la conformité CNPS :
                </p>
                <button
                  onClick={() => {
                    setAssignTargetGestionnaire(selectedPortfolioGestionnaire);
                    setIsAssignModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Affecter un adhérent
                </button>
              </div>

              {portfolioAdherents.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200">
                  <UserX className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">Aucun adhérent dans ce portefeuille</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Cliquez sur "+ Affecter un adhérent" pour lui confier le suivi d'adhérents.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {portfolioAdherents.map((adh) => {
                    const stats = statsOf(adh);
                    return (
                      <div
                        key={adh.id}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {adh.matricule}
                            </span>
                            <span className="font-semibold text-sm text-slate-900">
                              {adh.nom} {adh.prenom}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                stats.statutCotisation === 'À jour'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : stats.statutCotisation === 'En retard'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {stats.statutCotisation}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                            <span>Tél: {adh.telephone}</span>
                            <span>•</span>
                            <span>Adresse: {adh.adresse}</span>
                            <span>•</span>
                            <span>Tarif: {formatFCFA(adh.tarifJournalier)}/j</span>
                            {stats.joursRetard > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-rose-600 font-semibold">
                                  Retard: {stats.joursRetard} jour(s) ({formatFCFA(stats.montantRetard)})
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              const confirmed = await dialog.confirm({
                                title: 'Désaffectation du portefeuille',
                                message: `Voulez-vous retirer ${adh.nom} ${adh.prenom} (${adh.matricule}) du portefeuille de ${selectedPortfolioGestionnaire.nom} ?`,
                                confirmText: 'Désaffecter',
                                cancelText: 'Annuler',
                                variant: 'warning',
                                icon: 'warning',
                                details: [
                                  { label: 'Adhérent', value: `${adh.nom} ${adh.prenom}` },
                                  { label: 'Matricule', value: adh.matricule },
                                  { label: 'Gestionnaire actuel', value: selectedPortfolioGestionnaire.nom },
                                ],
                              });
                              if (confirmed) {
                                assignerPortefeuille(adh.id, null);
                              }
                            }}
                            className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition cursor-pointer"
                          >
                            Désaffecter
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setSelectedPortfolioGestionnaire(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE D'AFFECTATION RAPIDE D'ADHÉRENTS AU GESTIONNAIRE --- */}
      {isAssignModalOpen && assignTargetGestionnaire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in duration-200 my-8">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Affecter des adhérents au portefeuille</h2>
                <p className="text-xs text-emerald-100">
                  Gestionnaire : {assignTargetGestionnaire.nom} {assignTargetGestionnaire.prenom} ({assignTargetGestionnaire.code})
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rechercher un adhérent (par nom, matricule, ville, téléphone)
                </label>
                <input
                  type="text"
                  placeholder="Tapez pour filtrer les adhérents..."
                  value={assignAdherentSearch}
                  onChange={(e) => setAssignAdherentSearch(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-80 overflow-y-auto">
                {unassignedAdherents.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">
                    Aucun adhérent disponible trouvé pour ce critère.
                  </p>
                ) : (
                  unassignedAdherents.map((adh) => (
                    <div
                      key={adh.id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {adh.matricule}
                          </span>
                          <span className="font-semibold text-xs text-slate-900">
                            {adh.nom} {adh.prenom}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {adh.profession} • {adh.adresse} • Tél: {adh.telephone}
                          {adh.gestionnaireNom && (
                            <span className="text-amber-700 font-medium ml-1.5">
                              (Actuellement chez: {adh.gestionnaireNom})
                            </span>
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          assignerPortefeuille(adh.id, assignTargetGestionnaire.id);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shrink-0"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Affecter
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE SÉCURITÉ SUPPRESSION PIN (0000) --- */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900">
                Confirmation de suppression (Code 0000)
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              La suppression de ce gestionnaire désaffectera automatiquement tous les adhérents de son portefeuille. Veuillez saisir le code de sécurité pour confirmer.
            </p>

            {pinError && (
              <p className="text-xs text-rose-600 font-semibold mb-2">{pinError}</p>
            )}

            <input
              type="password"
              maxLength={4}
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              placeholder="Code PIN (0000)"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-rose-500 mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteId(null);
                  setPinCode('');
                  setPinError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
