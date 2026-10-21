import { sumMoney } from '../utils/money';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Cotisation, ModePaiement } from '../types';
import { formatFCFA, formatDateShort } from '../utils/helpers';
import { exporterListe } from '../api/excel';
import { getUserPermissions, canUserRegulariser } from '../utils/permissions';
import { RegularisationModal } from './RegularisationModal';
import { generateReceiptA5Pdf } from '../utils/pdfReceiptGenerator';
import {
  CreditCard,
  Search,
  PlusCircle,
  FileSpreadsheet,
  Printer,
  FileDown,
  Edit,
  Trash2,
  Calendar,
  X,
  Filter,
  User,
  Eye,
  Scale,
  ShieldCheck,
  Layers,
  Receipt,
  CheckCircle2,
} from 'lucide-react';

interface CotisationsViewProps {
  onOpenNewCotisation: () => void;
  onSelectAdherent: (id: string) => void;
  onViewReceipt: (cot: Cotisation) => void;
  onEditCotisation: (cot: Cotisation) => void;
  onDeleteCotisation: (cot: Cotisation) => void;
}

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

export const CotisationsView: React.FC<CotisationsViewProps> = ({
  onOpenNewCotisation,
  onSelectAdherent,
  onViewReceipt,
  onEditCotisation,
  onDeleteCotisation,
}) => {
  const { cotisations, currentUser, adherents, parametres } = useApp();
  const permissions = getUserPermissions(currentUser);
  const canRegulariser = canUserRegulariser(currentUser);

  const [search, setSearch] = useState('');
  const [filterAdherent, setFilterAdherent] = useState<string>('TOUS');
  const [filterMode, setFilterMode] = useState<string>('TOUS');
  const [filterMois, setFilterMois] = useState<string>('TOUS');
  const [filterAnnee, setFilterAnnee] = useState<string>('TOUS');
  const [filterAgent, setFilterAgent] = useState<string>('TOUS');
  const [filterRegul, setFilterRegul] = useState<string>('TOUS');

  const [isRegularisationModalOpen, setIsRegularisationModalOpen] = useState(false);
  const [regTargetCotisationId, setRegTargetCotisationId] = useState<string | null>(null);
  const [regTargetAdherentId, setRegTargetAdherentId] = useState<string | null>(null);

  // Modal d'impression directe du cumul mensuel d'un adhérent
  const [isCumulModalOpen, setIsCumulModalOpen] = useState(false);
  const [selectedCumulAdherentId, setSelectedCumulAdherentId] = useState<string>(
    adherents && adherents.length > 0 ? adherents[0].id : ''
  );
  const [selectedCumulMois, setSelectedCumulMois] = useState<string>(
    MOIS_LIST[new Date().getMonth()] || 'Mars'
  );
  const [selectedCumulAnnee, setSelectedCumulAnnee] = useState<number>(new Date().getFullYear());

  // Helper pour calculer le cumul mensuel d'un adhérent pour un versement
  const getAdherentCumulMois = (cot: Cotisation) => {
    const adhId = cot.adherentId;
    const mat = cot.matricule;
    const targetMois = cot.mois;
    const targetAnnee = cot.annee;
    const targetDateMois = cot.datePaiement ? cot.datePaiement.slice(0, 7) : '';

    const versementsMois = (cotisations || []).filter((c) => {
      const matchAdh = (adhId && c.adherentId === adhId) || (mat && c.matricule === mat);
      if (!matchAdh) return false;
      const matchMoisAnnee =
        (targetMois && targetAnnee && c.mois === targetMois && c.annee === targetAnnee) ||
        (targetDateMois && c.datePaiement && c.datePaiement.startsWith(targetDateMois));
      return matchMoisAnnee;
    });

    const cumul = sumMoney(versementsMois);
    return {
      cumul: cumul > 0 ? cumul : cot.montant,
      versements: versementsMois,
      count: versementsMois.length,
    };
  };

  // Extraire agents uniques
  const distinctAgents = Array.from(new Set(cotisations.map((c) => c.agentEnregistreur)));

  // Filtrage
  const filteredCotisations = (cotisations || [])
    .filter((cot) => {
      if (!cot) return false;
      const q = (search || '').toLowerCase().trim();
      const mat = (cot.matricule || '').toLowerCase();
      const nomPrenom = (cot.adherentNomPrenom || '').toLowerCase();
      const ref = (cot.reference || '').toLowerCase();
      const date = (cot.datePaiement || '').toLowerCase();
      const motif = (cot.motifRegularisation || '').toLowerCase();
      const montantStr = String(cot.montant ?? '');

      const matchesSearch =
        !q ||
        mat.includes(q) ||
        nomPrenom.includes(q) ||
        ref.includes(q) ||
        date.includes(q) ||
        montantStr.includes(q) ||
        motif.includes(q);

      const matchesAdherent =
        filterAdherent === 'TOUS' ||
        cot.adherentId === filterAdherent ||
        cot.matricule === filterAdherent;
      const matchesMode = filterMode === 'TOUS' || cot.modePaiement === filterMode;
      const matchesMois = filterMois === 'TOUS' || cot.mois === filterMois;
      const matchesAnnee = filterAnnee === 'TOUS' || String(cot.annee) === filterAnnee;
      const matchesAgent = filterAgent === 'TOUS' || cot.agentEnregistreur === filterAgent;
      const matchesRegul =
        filterRegul === 'TOUS' ||
        (filterRegul === 'REGULARISATIONS' && cot.estRegularisation) ||
        (filterRegul === 'ORDINAIRES' && !cot.estRegularisation);

      return (
        matchesSearch &&
        matchesAdherent &&
        matchesMode &&
        matchesMois &&
        matchesAnnee &&
        matchesAgent &&
        matchesRegul
      );
    })
    .sort((a, b) => new Date(b.datePaiement || 0).getTime() - new Date(a.datePaiement || 0).getTime());

  // Calcul du montant total filtré
  const totalEncaisse = sumMoney(filteredCotisations);

  const handleExportExcel = () => {
    // Format d'échange (réimportable) produit par le serveur, limité à la liste filtrée affichée
    void exporterListe('cotisations', filteredCotisations.map((c) => c.id));
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Registre des Cotisations Journalières
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des encaissements (700 F & 1 000 F / jour), versements groupés et reçus officiels
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bouton Impression Reçu Cumul Mensuel direct */}
          <button
            onClick={() => setIsCumulModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-98 border border-emerald-950/20"
            title="Imprimer le reçu officiel certifié au montant du cumul mensuel d'un adhérent"
          >
            <Layers className="w-4 h-4 text-emerald-300" />
            <span>Reçu Cumul Mensuel</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Exporter la liste en Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Excel</span>
          </button>

          {canRegulariser && (
            <button
              id="btn-ouvrir-regularisation-daf"
              onClick={() => {
                setRegTargetCotisationId(null);
                setRegTargetAdherentId(null);
                setIsRegularisationModalOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-98 border border-indigo-900/30"
              title="Régulariser une cotisation antérieure ou compléter un montant (DAF & DGA)"
            >
              <Scale className="w-4 h-4 text-amber-300" />
              <span>Régularisation DAF/DGA</span>
            </button>
          )}

          {permissions.canRecord && (
            <button
              onClick={onOpenNewCotisation}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-98"
            >
              <CreditCard className="w-4 h-4" />
              <span>Encaisser une cotisation</span>
            </button>
          )}
        </div>
      </div>

      {/* Bannière d'information si Profil Consultation */}
      {permissions.isReadOnly && (
        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Eye className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Profil {currentUser.role} (Accès Consultation) :</strong> Consultation exhaustive du registre, export Excel et réimpression des reçus de caisse autorisés. L'encaissement direct est réservé à la Caissière et aux profils habilités.
            </span>
          </div>
        </div>
      )}

      {/* Barre de recherche et filtres rapides */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Recherche */}
          <div className="sm:col-span-2 lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher par Matricule, Adhérent, Référence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Adhérent spécifique */}
          <div>
            <select
              value={filterAdherent}
              onChange={(e) => setFilterAdherent(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            >
              <option value="TOUS">Tous les adhérents</option>
              {adherents.map((adh) => (
                <option key={adh.id} value={adh.id}>
                  {adh.matricule} — {adh.nom} {adh.prenom}
                </option>
              ))}
            </select>
          </div>

          {/* Mode de paiement */}
          <div>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            >
              <option value="TOUS">Tous les modes</option>
              <option value="Espèces">Espèces</option>
              <option value="Wave">Wave</option>
              <option value="Orange Money">Orange Money</option>
              <option value="MTN MoMo">MTN MoMo</option>
              <option value="Moov Money">Moov Money</option>
              <option value="Virement bancaire">Virement bancaire</option>
              <option value="Chèque">Chèque</option>
            </select>
          </div>

          {/* Mois */}
          <div>
            <select
              value={filterMois}
              onChange={(e) => setFilterMois(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            >
              <option value="TOUS">Tous les mois</option>
              {MOIS_LIST.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre Type de Cotisation (Ordinaire vs Régularisation DAF/DGA) */}
          <div>
            <select
              id="select-filtre-type-cotisation"
              value={filterRegul}
              onChange={(e) => setFilterRegul(e.target.value)}
              className="w-full px-3 py-2 bg-indigo-50/70 border border-indigo-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-indigo-900"
            >
              <option value="TOUS">Tous types</option>
              <option value="REGULARISATIONS">Régularisations</option>
              <option value="ORDINAIRES">Ordinaires</option>
            </select>
          </div>
        </div>

        {/* Indicateurs synthèse du tableau */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-slate-100 gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">
              <strong>{filteredCotisations.length}</strong> versement(s) trouvé(s)
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-700">
              Total cumulé filtré :{' '}
              <strong className="text-emerald-800 font-mono font-extrabold">
                {formatFCFA(totalEncaisse)}
              </strong>
            </span>
          </div>

          {(search || filterAdherent !== 'TOUS' || filterMode !== 'TOUS' || filterMois !== 'TOUS' || filterAgent !== 'TOUS' || filterRegul !== 'TOUS') && (
            <button
              onClick={() => {
                setSearch('');
                setFilterAdherent('TOUS');
                setFilterMode('TOUS');
                setFilterMois('TOUS');
                setFilterAnnee('TOUS');
                setFilterAgent('TOUS');
                setFilterRegul('TOUS');
              }}
              className="text-emerald-700 font-semibold hover:underline text-[11px] cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* Tableau des cotisations */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredCotisations.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Aucune cotisation trouvée pour ces critères.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Matricule & Adhérent</th>
                  <th className="px-4 py-3.5">Versement & Cumul Mensuel</th>
                  <th className="px-4 py-3.5">Mode de paiement</th>
                  <th className="px-4 py-3.5">Référence</th>
                  <th className="px-4 py-3.5">Période</th>
                  <th className="px-4 py-3.5">Agent</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCotisations.map((cot) => {
                  const cumulInfo = getAdherentCumulMois(cot);
                  return (
                    <tr key={cot.id} className="hover:bg-slate-50 transition-colors">
                      {/* Date */}
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {formatDateShort(cot.datePaiement)}
                      </td>

                      {/* Matricule & Nom */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onSelectAdherent(cot.adherentId)}
                          className="text-left group cursor-pointer block"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] border border-emerald-200/60">
                              {cot.matricule}
                            </span>
                            <span className="font-bold text-slate-900 group-hover:text-emerald-700 group-hover:underline">
                              {cot.adherentNomPrenom}
                            </span>
                          </div>
                          {cot.estRegularisation && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                                <Scale className="w-3 h-3 text-indigo-600" />
                                Régularisation DAF/DGA
                              </span>
                              {cot.motifRegularisation && (
                                <span className="text-[10px] text-slate-500 truncate max-w-[200px]" title={cot.motifRegularisation}>
                                  ({cot.motifRegularisation})
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      </td>

                      {/* Montant & Cumul Mensuel */}
                      <td className="px-4 py-3">
                        <div className="font-mono font-extrabold text-slate-900 text-sm">
                          {formatFCFA(cot.montant)}
                        </div>
                        {/* Cumul mensuel certifié de l'adhérent */}
                        <div
                          className="text-[10px] text-emerald-800 bg-emerald-50/90 border border-emerald-200/80 rounded px-1.5 py-0.5 mt-1 inline-flex items-center gap-1 font-semibold"
                          title={`Cumul mensuel total cotisé par l'adhérent en ${cot.mois} ${cot.annee}`}
                        >
                          <Layers className="w-3 h-3 text-emerald-700 shrink-0" />
                          <span>Cumul :</span>
                          <span className="font-mono font-bold text-emerald-900">
                            {formatFCFA(cumulInfo.cumul)}
                          </span>
                          {cumulInfo.count > 1 && (
                            <span className="text-[9px] text-emerald-600 font-normal">
                              ({cumulInfo.count} v.)
                            </span>
                          )}
                        </div>
                        {cot.montantComplementaire && cot.montantComplementaire > 0 && (
                          <div className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                            +{formatFCFA(cot.montantComplementaire)} régul.
                          </div>
                        )}
                      </td>

                      {/* Mode */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {cot.modePaiement}
                        </span>
                      </td>

                      {/* Référence */}
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                        {cot.reference || '—'}
                      </td>

                      {/* Période */}
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium">{cot.mois} {cot.annee}</div>
                        {cot.datePaiementEffective && cot.datePaiementEffective !== cot.datePaiement && (
                          <div className="text-[10px] text-slate-400">
                            Eff. {formatDateShort(cot.datePaiementEffective)}
                          </div>
                        )}
                      </td>

                      {/* Agent */}
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        <div>{cot.agentEnregistreur}</div>
                        {cot.regularisePar && (
                          <div className="text-[10px] text-indigo-600 font-medium">
                            Visa : {cot.regularisePar}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Imprimer le reçu officiel (au montant du cumul mensuel) */}
                          <button
                            onClick={() => onViewReceipt(cot)}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer shadow-xs"
                            title="Ouvrir le reçu officiel imprimable au montant du cumul mensuel de cet adhérent"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Reçu Cumul</span>
                          </button>

                          {/* Télécharger directement le reçu PDF en format A5 (Cumul Mensuel) */}
                          <button
                            onClick={() => {
                              const adh = adherents?.find(
                                (a) => a.id === cot.adherentId || a.matricule === cot.matricule
                              );
                              generateReceiptA5Pdf({
                                cotisation: cot,
                                adherent: adh,
                                parametres,
                                typeMontant: 'CUMUL_MENSUEL',
                                cumulMensuel: cumulInfo.cumul,
                                cotisationsDuMois: cumulInfo.versements,
                              });
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-900 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer border border-slate-200"
                            title="Télécharger directement le reçu en fichier PDF A5 au montant du cumul mensuel"
                          >
                            <FileDown className="w-3.5 h-3.5 text-emerald-700" />
                            <span>PDF A5</span>
                          </button>

                          {/* Action Régulariser / Compléter pour DAF & DGA */}
                          {canRegulariser && (
                            <button
                              onClick={() => {
                                setRegTargetCotisationId(cot.id);
                                setRegTargetAdherentId(cot.adherentId);
                                setIsRegularisationModalOpen(true);
                              }}
                              className="p-1.5 text-indigo-700 hover:text-indigo-950 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-indigo-200"
                              title="Régulariser ou compléter ce versement antérieur (DAF & DGA)"
                            >
                              <Scale className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Modifier cotisation (code 0000 requis) */}
                          {permissions.canEditRecords && (
                            <button
                              onClick={() => onEditCotisation(cot)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Modifier ce versement (Code 0000 requis)"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Supprimer cotisation (code 0000 requis) */}
                          {permissions.canDeleteRecords && (
                            <button
                              onClick={() => onDeleteCotisation(cot)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer ce versement (Code 0000 requis)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Régularisation des Cotisations (DAF / DGA) */}
      <RegularisationModal
        isOpen={isRegularisationModalOpen}
        onClose={() => {
          setIsRegularisationModalOpen(false);
          setRegTargetCotisationId(null);
          setRegTargetAdherentId(null);
        }}
        targetCotisationId={regTargetCotisationId}
        targetAdherentId={regTargetAdherentId}
      />

      {/* Modale d'Impression du Reçu au Montant du Cumul Mensuel d'un Adhérent */}
      {isCumulModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-8">
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-bold text-sm">Impression Reçu — Cumul Mensuel</h3>
                  <p className="text-[11px] text-emerald-200">
                    Reçu officiel certifié au montant total cotisé dans le mois par l'adhérent
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCumulModalOpen(false)}
                className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Choix de l'adhérent */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sélectionner l'adhérent :
                </label>
                <select
                  value={selectedCumulAdherentId}
                  onChange={(e) => setSelectedCumulAdherentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {adherents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.matricule} — {a.nom} {a.prenom} ({a.profession})
                    </option>
                  ))}
                </select>
              </div>

              {/* Choix du mois & de l'année */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mois concerné :
                  </label>
                  <select
                    value={selectedCumulMois}
                    onChange={(e) => setSelectedCumulMois(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {MOIS_LIST.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Année :
                  </label>
                  <select
                    value={selectedCumulAnnee}
                    onChange={(e) => setSelectedCumulAnnee(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Calcul et aperçu du cumul pour cet adhérent */}
              {(() => {
                const targetAdh = adherents.find((a) => a.id === selectedCumulAdherentId) || adherents[0];
                const mat = targetAdh?.matricule;
                const versementsDuMois = (cotisations || []).filter(
                  (c) =>
                    ((targetAdh && c.adherentId === targetAdh.id) || (mat && c.matricule === mat)) &&
                    c.mois === selectedCumulMois &&
                    c.annee === selectedCumulAnnee
                );
                const totalCumule = sumMoney(versementsDuMois);
                const tarif = targetAdh?.tarifJournalier || 700;
                const joursCouverts = Math.floor(totalCumule / tarif);

                return (
                  <div className="space-y-3 pt-2">
                    <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider">
                          Cumul Mensuel Calculé
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {selectedCumulMois} {selectedCumulAnnee}
                        </span>
                      </div>
                      <div className="text-2xl font-black text-emerald-900 font-mono">
                        {formatFCFA(totalCumule)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600 border-t border-emerald-200/60">
                        <div>
                          Nombre de versements :{' '}
                          <strong className="text-slate-900">{versementsDuMois.length}</strong>
                        </div>
                        <div>
                          Jours couverts ({tarif} F/j) :{' '}
                          <strong className="text-slate-900">{joursCouverts} jours</strong>
                        </div>
                        <div className="col-span-2">
                          Seuil immatriculation CNPS (15 000 F) :{' '}
                          <strong
                            className={
                              totalCumule >= 15000 ? 'text-emerald-700' : 'text-amber-700'
                            }
                          >
                            {totalCumule >= 15000
                              ? 'Atteint (Éligible)'
                              : `${formatFCFA(Math.max(0, 15000 - totalCumule))} restant`}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Liste des versements du mois */}
                    {versementsDuMois.length > 0 ? (
                      <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[10px] text-slate-500 font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-1 px-2.5">Date</th>
                              <th className="py-1 px-2">Mode</th>
                              <th className="py-1 px-2.5 text-right">Montant</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {versementsDuMois.map((v) => (
                              <tr key={v.id} className="hover:bg-slate-50">
                                <td className="py-1.5 px-2.5">{formatDateShort(v.datePaiement)}</td>
                                <td className="py-1.5 px-2 text-slate-500">{v.modePaiement}</td>
                                <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                                  {formatFCFA(v.montant)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs text-center">
                        Aucun versement enregistré pour cet adhérent en {selectedCumulMois} {selectedCumulAnnee}.
                      </div>
                    )}

                    {/* Boutons d'action */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsCumulModalOpen(false)}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Fermer
                      </button>

                      {versementsDuMois.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const representativeCot = versementsDuMois[0];
                              generateReceiptA5Pdf({
                                cotisation: representativeCot,
                                adherent: targetAdh,
                                parametres,
                                typeMontant: 'CUMUL_MENSUEL',
                                cumulMensuel: totalCumule,
                                cotisationsDuMois: versementsDuMois,
                              });
                            }}
                            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-98"
                            title="Télécharger directement le fichier PDF A5"
                          >
                            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Télécharger PDF (A5)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const representativeCot = versementsDuMois[0];
                              setIsCumulModalOpen(false);
                              onViewReceipt(representativeCot);
                            }}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-98"
                            title="Ouvrir le reçu officiel imprimable"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimer Reçu Cumul</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
