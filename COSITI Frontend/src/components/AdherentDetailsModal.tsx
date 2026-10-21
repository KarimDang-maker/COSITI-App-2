import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Adherent, Cotisation } from '../types';
import {
  formatFCFA,
  formatDateFr,
  formatDateShort,
} from '../utils/helpers';
import { exportToExcel } from '../utils/exportUtils';
import { canUserRegulariser, canUserChangeStatut } from '../utils/permissions';
import { RegularisationModal } from './RegularisationModal';
import { StatutAdherentModal } from './StatutAdherentModal';
import { generateReceiptA5Pdf } from '../utils/pdfReceiptGenerator';
import {
  X,
  Printer,
  FileDown,
  FileSpreadsheet,
  PlusCircle,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  BadgeCheck,
  CheckCircle2,
  AlertCircle,
  FolderHeart,
  Search,
  FileText,
  User,
  Scale,
  UserCheck,
} from 'lucide-react';

interface AdherentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  adherentId: string | null;
  onEditAdherent: (adh: Adherent) => void;
  onDeleteAdherent: (adh: Adherent) => void;
  onNewCotisationForAdherent: (adh: Adherent) => void;
  onViewReceipt: (cot: Cotisation) => void;
  onOpenImmatriculer: (adh: Adherent) => void;
  onOpenDossier: (adh: Adherent) => void;
}

export const AdherentDetailsModal: React.FC<AdherentDetailsModalProps> = ({
  isOpen,
  onClose,
  adherentId,
  onEditAdherent,
  onDeleteAdherent,
  onNewCotisationForAdherent,
  onViewReceipt,
  onOpenImmatriculer,
  onOpenDossier,
}) => {
  const { adherents, cotisations, dossiers, parametres, currentUser, statsOf } = useApp();
  const canRegulariser = canUserRegulariser(currentUser);
  const canChangeStatut = canUserChangeStatut(currentUser);

  const [historySearch, setHistorySearch] = useState('');
  const [filterMode, setFilterMode] = useState<string>('TOUS');

  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [targetCotId, setTargetCotId] = useState<string | null>(null);
  const [isStatutModalOpen, setIsStatutModalOpen] = useState(false);

  if (!isOpen || !adherentId) return null;

  const adherent = adherents.find((a) => a.id === adherentId);
  if (!adherent) return null;

  const stats = statsOf(adherent);

  // Historique des cotisations
  const memberCotisations = cotisations
    .filter((c) => c.adherentId === adherent.id || c.matricule === adherent.matricule)
    .sort((a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime());

  // Filtrage historique
  const filteredCotisations = (memberCotisations || []).filter((c) => {
    if (!c) return false;
    const q = (historySearch || '').toLowerCase().trim();
    const ref = (c.reference || '').toLowerCase();
    const date = (c.datePaiement || '').toLowerCase();
    const mois = (c.mois || '').toLowerCase();
    const agent = (c.agentEnregistreur || '').toLowerCase();
    const montantStr = String(c.montant ?? '');

    const matchesSearch =
      !q ||
      ref.includes(q) ||
      date.includes(q) ||
      mois.includes(q) ||
      agent.includes(q) ||
      montantStr.includes(q);

    const matchesMode = filterMode === 'TOUS' || c.modePaiement === filterMode;
    return matchesSearch && matchesMode;
  });

  const dossier = dossiers.find(
    (d) => d.adherentId === adherent.id || d.matricule === adherent.matricule
  );

  const handleExportExcel = () => {
    const exportData = memberCotisations.map((c) => ({
      Matricule: c.matricule,
      Adhérent: c.adherentNomPrenom,
      Date: c.datePaiement,
      'Montant (FCFA)': c.montant,
      'Mois concerné': c.mois,
      Année: c.annee,
      'Mode de paiement': c.modePaiement,
      Référence: c.reference || '',
      'Agent enregistreur': c.agentEnregistreur,
      Observations: c.observations || '',
    }));
    exportToExcel(exportData, `Historique_Cotisations_${adherent.matricule}`);
  };

  const handlePrintFiche = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Header (Top bar) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-lg text-white">
              {adherent.nom.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 text-xs">
                  {adherent.matricule}
                </span>
                <h2 className="text-base font-bold text-white">
                  {adherent.nom} {adherent.prenom}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {adherent.profession} • Adhésion le {formatDateShort(adherent.dateAdhesion)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrintFiche}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Imprimer la fiche adhérent"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
          {/* Printable Header for Fiche */}
          <div className="hidden print:block text-center border-b pb-4 mb-4">
            <h1 className="text-lg font-bold">{parametres.nomOrganisation}</h1>
            <p className="text-xs text-slate-600">Fiche Adhérent & Relevé de cotisations</p>
            <p className="text-xs font-mono font-bold mt-1">Matricule : {adherent.matricule}</p>
          </div>

          {/* Cartes d'identité & Statut */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Colonne 1 : Coordonnées */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                État Civil & Contact
              </span>
              <div className="space-y-1 text-slate-700">
                <div className="flex items-center space-x-2">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Sexe : <strong>{adherent.sexe === 'M' ? 'Masculin' : 'Féminin'}</strong>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Né(e) le {formatDateShort(adherent.dateNaissance)} à {adherent.lieuNaissance || '—'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono font-semibold">{adherent.telephone}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{adherent.adresse || '—'}</span>
                </div>
                <div className="pt-1 border-t border-slate-200/80">
                  <span className="text-slate-500">CNI : </span>
                  <span className="font-mono font-bold text-slate-800">
                    {adherent.cni || 'Non renseignée'}
                  </span>
                </div>
              </div>
            </div>

            {/* Colonne 2 : Statut Adhésion & Prestations */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Statut Administratif & CNPS
              </span>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Statut adhérent :</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {adherent.statut}
                    </span>
                    {canChangeStatut && (
                      <button
                        onClick={() => setIsStatutModalOpen(true)}
                        className="p-1 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                        title="Modifier le statut adhérent (DAF / DGA / DG)"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Immatriculation :</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md ${
                      adherent.statutImmatriculation === 'Immatriculé'
                        ? 'bg-blue-100 text-blue-800'
                        : stats.seuilAtteint
                        ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-400'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {adherent.statutImmatriculation}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">N° CNPS :</span>
                  <span className="font-mono font-bold text-slate-900">
                    {adherent.numeroCnps || 'En attente'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Cotisation choisie :</span>
                  <span className="font-bold text-emerald-800">
                    {adherent.tarifJournalier} FCFA / jour
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Portefeuille :</span>
                  <span className="font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {adherent.gestionnaireNom || 'Non affecté'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Situation familiale :</span>
                  <span className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${adherent.sansEnfant ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'text-slate-800'}`}>
                    {adherent.sansEnfant ? 'Sans enfant à charge' : `${adherent.nombreEnfants || 0} enfant(s) à charge`}
                  </span>
                </div>
              </div>
            </div>

            {/* Colonne 3 : Baromètre du Seuil 15 000 FCFA */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2 text-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                  Seuil d'immatriculation (15 000 F)
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-extrabold text-emerald-950 font-mono">
                    {formatFCFA(stats.totalCumule)}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    {stats.pourcentageSeuil}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-emerald-200/60 rounded-full h-2 mt-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${stats.pourcentageSeuil}%` }}
                  />
                </div>

                <p className="text-[11px] text-emerald-800 mt-2 font-medium">
                  {stats.seuilAtteint ? (
                    <span className="flex items-center text-emerald-800 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Seuil requis atteint pour l'immatriculation CNPS !
                    </span>
                  ) : (
                    `Reste ${formatFCFA(stats.montantRestantPourSeuil)} pour déclencher l'immatriculation.`
                  )}
                </p>
              </div>

              {/* Bouton d'action direct si éligible */}
              {stats.seuilAtteint && adherent.statutImmatriculation !== 'Immatriculé' && (
                <button
                  onClick={() => onOpenImmatriculer(adherent)}
                  className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>Procéder à l'immatriculation CNPS</span>
                </button>
              )}
            </div>
          </div>

          {/* Barres d'actions rapides sous profil */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 rounded-xl border border-slate-200 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              {currentUser.role !== 'Agent de consultation' && (
                <button
                  onClick={() => onNewCotisationForAdherent(adherent)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Encaisser cotisation</span>
                </button>
              )}

              {/* Régularisation DAF & DGA */}
              {canRegulariser && (
                <button
                  onClick={() => {
                    setTargetCotId(null);
                    setIsRegModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer border border-indigo-900/40"
                  title="Régulariser des montants ou dates de cotisations antérieures pour cet adhérent (DAF / DGA)"
                >
                  <Scale className="w-3.5 h-3.5 text-amber-300" />
                  <span>Régularisation DAF/DGA</span>
                </button>
              )}

              {/* Changement Statut DAF & DGA */}
              {canChangeStatut && (
                <button
                  onClick={() => setIsStatutModalOpen(true)}
                  className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold rounded-lg shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                  title="Modifier le statut de cet adhérent (DAF / DGA / DG)"
                >
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Statut Adhérent</span>
                </button>
              )}

              {adherent.statutImmatriculation === 'Immatriculé' && (
                <button
                  onClick={() => onOpenDossier(adherent)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <FolderHeart className="w-3.5 h-3.5" />
                  <span>Dossier Allocations {dossier ? `(${dossier.statut})` : ''}</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {currentUser.role !== 'Agent de consultation' && (
                <button
                  onClick={() => onEditAdherent(adherent)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  title="Modifier l'adhérent (Code de confirmation requis)"
                >
                  <Edit className="w-3 h-3 text-slate-500" />
                  <span>Modifier (0000)</span>
                </button>
              )}

              {currentUser.role === 'Administrateur' && (
                <button
                  onClick={() => onDeleteAdherent(adherent)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  title="Supprimer l'adhérent (Code de confirmation requis)"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span>Supprimer (0000)</span>
                </button>
              )}
            </div>
          </div>

          {/* Tableau Récapitulatif Chiffré */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Cumulé
              </span>
              <span className="text-base font-extrabold text-emerald-800 font-mono">
                {formatFCFA(stats.totalCumule)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {stats.nombreVersements} versement(s)
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Ce Mois-ci
              </span>
              <span className="text-base font-extrabold text-slate-900 font-mono">
                {formatFCFA(stats.totalCeMois)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Mois en cours</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Cette Année
              </span>
              <span className="text-base font-extrabold text-slate-900 font-mono">
                {formatFCFA(stats.totalCetteAnnee)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Année 2026</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Jours Couverts
              </span>
              <span className="text-base font-extrabold text-slate-900 font-mono">
                {stats.nombreJoursCotises} j
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                à {adherent.tarifJournalier} F/j
              </span>
            </div>
          </div>

          {/* Section Historique des cotisations */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Historique complet des paiements ({memberCotisations.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Détail de chaque cotisation enregistrée pour {adherent.matricule}
                </p>
              </div>

              <div className="flex items-center space-x-2 print:hidden">
                <button
                  onClick={handleExportExcel}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  title="Exporter cet historique vers Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {/* Barre de recherche dans l'historique */}
            <div className="flex items-center space-x-3 print:hidden">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher par date, référence, mois, agent..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="TOUS">Tous les modes</option>
                <option value="Espèces">Espèces</option>
                <option value="Wave">Wave</option>
                <option value="Orange Money">Orange Money</option>
                <option value="MTN MoMo">MTN MoMo</option>
                <option value="Moov Money">Moov Money</option>
                <option value="Virement bancaire">Virement bancaire</option>
              </select>
            </div>

            {/* Tableau */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              {filteredCotisations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Aucune cotisation trouvée pour cette recherche.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Montant</th>
                        <th className="px-3 py-2.5">Mois concerné</th>
                        <th className="px-3 py-2.5">Mode</th>
                        <th className="px-3 py-2.5">Référence</th>
                        <th className="px-3 py-2.5">Agent</th>
                        <th className="px-3 py-2.5 text-right print:hidden">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCotisations.map((cot) => (
                        <tr key={cot.id} className={`hover:bg-slate-50 transition-colors ${cot.estRegularisation ? 'bg-indigo-50/20' : ''}`}>
                          <td className="px-3 py-2.5 font-medium text-slate-800">
                            <div>{formatDateShort(cot.datePaiement)}</div>
                            {cot.estRegularisation && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 mt-0.5">
                                <Scale className="w-2.5 h-2.5" /> Régularisée
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-bold font-mono text-emerald-800">
                            <div>{formatFCFA(cot.montant)}</div>
                            {cot.estRegularisation && cot.montantComplementaire ? (
                              <div className="text-[10px] text-indigo-700 font-semibold">
                                +{formatFCFA(cot.montantComplementaire)} régul.
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">
                            {cot.mois} {cot.annee}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 font-medium text-[11px] text-slate-700">
                              {cot.modePaiement}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-500 text-[11px]">
                            {cot.reference || '—'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            <div>{cot.agentEnregistreur}</div>
                            {cot.regularisePar && (
                              <div className="text-[9px] text-indigo-600 font-medium">
                                Visa : {cot.regularisePar}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right print:hidden">
                            <div className="flex items-center justify-end space-x-1">
                              {canRegulariser && (
                                <button
                                  onClick={() => {
                                    setTargetCotId(cot.id);
                                    setIsRegModalOpen(true);
                                  }}
                                  className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                  title="Compléter ou corriger ce versement antérieur (DAF & DGA)"
                                >
                                  <Scale className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => onViewReceipt(cot)}
                                className="px-2 py-1 text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded font-semibold transition-colors cursor-pointer flex items-center space-x-1"
                                title="Afficher le reçu officiel de versement"
                              >
                                <span>Reçu</span>
                              </button>

                              <button
                                onClick={() =>
                                  generateReceiptA5Pdf({
                                    cotisation: cot,
                                    adherent,
                                    parametres,
                                  })
                                }
                                className="px-2 py-1 text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 rounded font-semibold transition-colors cursor-pointer flex items-center space-x-1"
                                title="Télécharger directement le reçu en fichier PDF A5"
                              >
                                <FileDown className="w-3 h-3 text-emerald-700" />
                                <span>PDF A5</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Régularisation Cotisation DAF/DGA */}
      <RegularisationModal
        isOpen={isRegModalOpen}
        onClose={() => {
          setIsRegModalOpen(false);
          setTargetCotId(null);
        }}
        targetAdherentId={adherent.id}
        targetCotisationId={targetCotId}
      />

      {/* Modal Changement Statut Adhérent DAF/DGA */}
      <StatutAdherentModal
        isOpen={isStatutModalOpen}
        onClose={() => setIsStatutModalOpen(false)}
        adherent={adherent}
      />
    </div>
  );
};
