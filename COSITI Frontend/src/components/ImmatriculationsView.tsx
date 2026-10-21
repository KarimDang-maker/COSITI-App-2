import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Adherent } from '../types';
import {
  formatFCFA,
  formatDateShort,
} from '../utils/helpers';
import { exportToExcel } from '../utils/exportUtils';
import {
  BadgeCheck,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Shield,
  FolderHeart,
  Clock,
  Search,
  Eye,
} from 'lucide-react';
import { getUserPermissions } from '../utils/permissions';

interface ImmatriculationsViewProps {
  onSelectAdherent: (id: string) => void;
  onImmatriculerAdherent: (adh: Adherent) => void;
  onOpenDossier: (adh: Adherent) => void;
}

export const ImmatriculationsView: React.FC<ImmatriculationsViewProps> = ({
  onSelectAdherent,
  onImmatriculerAdherent,
  onOpenDossier,
}) => {
  const { adherents, cotisations, dossiers, parametres, currentUser, statsOf } = useApp();
  const permissions = getUserPermissions(currentUser);

  const [activeSubTab, setActiveSubTab] = useState<'A_IMMATRICULER' | 'CYCLE_15_30' | 'IMMATRICULES'>('A_IMMATRICULER');
  const [search, setSearch] = useState('');

  // Classification des adhérents
  const adherentsWithStats = adherents.map((adh) => {
    const stats = statsOf(adh);
    return { adh, stats };
  });

  // 1. À immatriculer : seuil atteint (>= 15 000 F) ET pas encore immatriculé
  const aImmatriculerList = adherentsWithStats.filter(
    ({ adh, stats }) => stats.seuilAtteint && adh.statutImmatriculation !== 'Immatriculé'
  );

  // 2. Déjà immatriculés
  const immatriculesList = adherentsWithStats.filter(
    ({ adh }) => adh.statutImmatriculation === 'Immatriculé'
  );

  // 3. Proches du seuil ou vérification 15 / 30
  const cycleVerifList = adherentsWithStats.filter(
    ({ adh, stats }) => stats.seuilAtteint || stats.pourcentageSeuil >= 70
  );

  // Filtrage selon recherche
  const filterList = (list: typeof adherentsWithStats) => {
    if (!search || !search.trim()) return list;
    const q = (search || '').toLowerCase().trim();
    return (list || []).filter(
      ({ adh }) => {
        if (!adh) return false;
        const mat = (adh.matricule || '').toLowerCase();
        const nom = (adh.nom || '').toLowerCase();
        const prenom = (adh.prenom || '').toLowerCase();
        const prof = (adh.profession || '').toLowerCase();
        const cnps = (adh.numeroCnps || '').toLowerCase();
        return (
          mat.includes(q) ||
          nom.includes(q) ||
          prenom.includes(q) ||
          prof.includes(q) ||
          cnps.includes(q)
        );
      }
    );
  };

  const currentFilteredList = filterList(
    activeSubTab === 'A_IMMATRICULER'
      ? aImmatriculerList
      : activeSubTab === 'IMMATRICULES'
      ? immatriculesList
      : cycleVerifList
  );

  const handleExportExcel = () => {
    const data = currentFilteredList.map(({ adh, stats }) => ({
      Matricule: adh.matricule,
      Nom: adh.nom,
      Prénom: adh.prenom,
      Téléphone: adh.telephone,
      Profession: adh.profession,
      'Total Cumulé (FCFA)': stats.totalCumule,
      'Seuil Atteint ?': stats.seuilAtteint ? 'OUI' : 'NON',
      'Statut Immatriculation': adh.statutImmatriculation,
      'Numéro CNPS': adh.numeroCnps || 'En attente',
      'Date Immatriculation': adh.dateImmatriculation || '—',
    }));

    exportToExcel(data, `Immatriculations_CNPS_${activeSubTab}_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Gestion des Immatriculations CNPS
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Seuil réglementaire obligatoire fixé à {formatFCFA(parametres.seuilImmatriculation)} • Contrôle cyclique au 15 et au 30 du mois
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Règle Métier 15 et 30 Explicative */}
      <div className="p-4 bg-emerald-900 text-white rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 bg-emerald-700 rounded-xl text-white shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded">
                Règle Métier COSITI
              </span>
              <span className="text-xs text-emerald-200">Point de contrôle bimensuel</span>
            </div>
            <h3 className="text-sm font-bold text-white mt-1">
              Contrôle automatique au 15 et au 30 de chaque mois
            </h3>
            <p className="text-xs text-emerald-200 mt-0.5 max-w-2xl leading-relaxed">
              Le système vérifie systématiquement à ces deux dates charnières tous les adhérents ayant totalisé 15 000 FCFA de cotisations cumulées afin de déclencher immédiatement la constitution des listes d'immatriculation CNPS.
            </p>
          </div>
        </div>

        <div className="p-3 bg-emerald-800/80 rounded-xl border border-emerald-700 text-center shrink-0">
          <span className="text-[10px] uppercase font-bold text-emerald-200 block">
            Adhérents éligibles en attente
          </span>
          <span className="text-2xl font-extrabold text-white font-mono">
            {aImmatriculerList.length}
          </span>
          <span className="text-[10px] text-emerald-300 block">À immatriculer</span>
        </div>
      </div>

      {/* Onglets de navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('A_IMMATRICULER')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'A_IMMATRICULER'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>À immatriculer d'urgence ({aImmatriculerList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('CYCLE_15_30')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'CYCLE_15_30'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Vérification cycle 15 / 30 ({cycleVerifList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('IMMATRICULES')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'IMMATRICULES'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BadgeCheck className="w-4 h-4" />
            <span>Déjà immatriculés CNPS ({immatriculesList.length})</span>
          </button>
        </div>

        {/* Barre de filtre */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrer la liste..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Liste / Tableau */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {currentFilteredList.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Aucun adhérent dans cette catégorie.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-4 py-3.5">Matricule</th>
                  <th className="px-4 py-3.5">Nom & Prénom(s)</th>
                  <th className="px-4 py-3.5">Métier & Contact</th>
                  <th className="px-4 py-3.5">Cumul Cotisé</th>
                  <th className="px-4 py-3.5">Progression Seuil (15k)</th>
                  <th className="px-4 py-3.5">Numéro CNPS</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentFilteredList.map(({ adh, stats }) => {
                  const dossier = dossiers.find(
                    (d) => d.adherentId === adh.id || d.matricule === adh.matricule
                  );

                  return (
                    <tr key={adh.id} className="hover:bg-slate-50 transition-colors">
                      {/* Matricule */}
                      <td className="px-4 py-3 font-mono font-bold">
                        <button
                          onClick={() => onSelectAdherent(adh.id)}
                          className="text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200 transition-colors cursor-pointer"
                        >
                          {adh.matricule}
                        </button>
                      </td>

                      {/* Nom */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onSelectAdherent(adh.id)}
                          className="font-bold text-slate-900 hover:text-emerald-700 text-left cursor-pointer group"
                        >
                          <span className="group-hover:underline">
                            {adh.nom} {adh.prenom}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal block">
                            Adhésion: {formatDateShort(adh.dateAdhesion)}
                          </span>
                        </button>
                      </td>

                      {/* Métier */}
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-medium text-slate-800">{adh.profession}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{adh.telephone}</div>
                      </td>

                      {/* Cumul */}
                      <td className="px-4 py-3">
                        <div className="font-mono font-extrabold text-emerald-800 text-sm">
                          {formatFCFA(stats.totalCumule)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {stats.nombreJoursCotises} jours à {adh.tarifJournalier} F
                        </div>
                      </td>

                      {/* Progression seuil */}
                      <td className="px-4 py-3">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                            <span
                              className={
                                stats.seuilAtteint ? 'text-emerald-700' : 'text-slate-600'
                              }
                            >
                              {stats.pourcentageSeuil}%
                            </span>
                            <span className="text-slate-400 font-normal">/ 15 000 F</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                stats.seuilAtteint ? 'bg-emerald-600' : 'bg-amber-500'
                              }`}
                              style={{ width: `${stats.pourcentageSeuil}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Numéro CNPS & Statut */}
                      <td className="px-4 py-3">
                        {adh.statutImmatriculation === 'Immatriculé' ? (
                          <div>
                            <span className="font-mono font-bold text-blue-900 text-[11px] block">
                              {adh.numeroCnps}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Immat. le {formatDateShort(adh.dateImmatriculation)}
                            </span>
                          </div>
                        ) : stats.seuilAtteint ? (
                          <span className="inline-flex items-center text-emerald-800 font-bold text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full">
                            <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
                            Seuil 15k atteint !
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Reste {formatFCFA(stats.montantRestantPourSeuil)}
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        {adh.statutImmatriculation !== 'Immatriculé' ? (
                          stats.seuilAtteint ? (
                            permissions.canImmatriculer ? (
                              <button
                                onClick={() => onImmatriculerAdherent(adh)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1 ml-auto cursor-pointer"
                              >
                                <BadgeCheck className="w-3.5 h-3.5" />
                                <span>Immatriculer</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center text-emerald-800 text-[11px] font-bold bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                                Éligible CNPS
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-400">En cours de cotisation</span>
                          )
                        ) : (
                          <button
                            onClick={() => onOpenDossier(adh)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 ml-auto cursor-pointer"
                          >
                            <FolderHeart className="w-3.5 h-3.5 text-blue-600" />
                            <span>Dossier Allocations</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
