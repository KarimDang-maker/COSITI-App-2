import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  CreditCard,
  BadgeCheck,
  FolderHeart,
  AlertTriangle,
  TrendingUp,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  PlusCircle,
  Eye,
  Landmark,
  CalendarDays,
} from 'lucide-react';
import { formatFCFA, formatDateShort } from '../utils/helpers';
import { getUserPermissions } from '../utils/permissions';
import { Adherent, Cotisation } from '../types';

interface DashboardViewProps {
  onOpenNewAdherent: () => void;
  onOpenNewCotisation: () => void;
  onSelectAdherent: (id: string) => void;
  onViewReceipt: (cot: Cotisation) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewAdherent,
  onOpenNewCotisation,
  onSelectAdherent,
  onViewReceipt,
}) => {
  const { dashboard, alerts, parametres, setActiveTab, currentUser } = useApp();

  const permissions = getUserPermissions(currentUser);

  // TOUS les chiffres viennent du serveur (GET /dashboard) : le navigateur ne calcule rien.
  const d = dashboard;
  const totalAdherents = d?.adherents.total ?? 0;
  const adherentsActifs = d?.adherents.actifs ?? 0;
  const adherentsImmatricules = d?.adherents.immatricules ?? 0;
  const adherentsNonImmatricules = d?.adherents.nonImmatricules ?? 0;
  const adherentsAJour = d?.adherents.aJour ?? 0;
  const adherentsNonAJour = d?.adherents.nonAJour ?? 0;
  const adherentsSeuil15k = d?.adherents.seuilAtteint ?? 0;
  const adherentsAImmatriculer = d?.adherents.aImmatriculer ?? 0;
  const dossiersAConstituer = d?.dossiers.aConstituer ?? 0;
  const cotisationsAujourdhui = d?.cotisations.aujourdHui ?? 0;
  const cotisationsMois = d?.cotisations.ceMois ?? 0;
  const cotisationsAnnee = d?.cotisations.cetteAnnee ?? 0;
  const recentCotisations = (d?.cotisations.dernieres ?? []).slice(0, 5);

  const urgentAlerts = alerts.filter((a) => a.niveau === 'urgent').slice(0, 3);

  return (
    <div className="space-y-6 pb-12">
      {/* Bannière de Bienvenue */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-widest bg-emerald-700 text-emerald-100 px-2.5 py-0.5 rounded-md">
                Portail Administratif
              </span>
              <span className="text-xs text-emerald-200">
                • {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date())}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1.5 tracking-tight">
              Tableau de bord {parametres?.sigle || 'COSITI'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-2xl font-normal leading-relaxed">
              Gestion centralisée des adhérents du secteur informel, encaissements des cotisations journalières, immatriculations CNPS et suivi des allocations familiales.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {permissions.canManageFinances && (
              <button
                onClick={() => setActiveTab('finances')}
                className="px-3.5 py-2.5 bg-emerald-800/90 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold border border-emerald-600 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                title="Espace DAF : Dépenses, Versements bancaires & Frais Mobile Money"
              >
                <Landmark className="w-4 h-4 text-emerald-300" />
                <span>Finances DAF</span>
              </button>
            )}

            {permissions.canManageAgenda && (
              <button
                onClick={() => setActiveTab('agenda')}
                className="px-3.5 py-2.5 bg-indigo-900/90 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold border border-indigo-600 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                title="Espace DG / DGA : Partenaires, Agenda & Notes spécifiques"
              >
                <CalendarDays className="w-4 h-4 text-indigo-300" />
                <span>Agenda Direction</span>
              </button>
            )}

            {permissions.canRecord ? (
              <>
                <button
                  onClick={onOpenNewCotisation}
                  className="px-4 py-2.5 bg-white text-emerald-950 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-98"
                >
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <span>Encaisser cotisation</span>
                </button>
                <button
                  onClick={onOpenNewAdherent}
                  className="px-4 py-2.5 bg-emerald-700/80 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold border border-emerald-600 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Nouvel adhérent</span>
                </button>
              </>
            ) : (
              <div className="px-3 py-2 bg-emerald-950/40 border border-emerald-700/50 rounded-xl text-xs font-semibold text-emerald-200 flex items-center space-x-2">
                <Eye className="w-4 h-4 text-emerald-300" />
                <span>Profil {currentUser.role}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alertes prioritaires (Notification cards) */}
      {urgentAlerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Alertes administratives prioritaires ({urgentAlerts.length})</span>
            </h2>
            <button
              onClick={() => setActiveTab('alertes')}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center space-x-1"
            >
              <span>Voir les {alerts.length} alertes</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {urgentAlerts.map((al) => (
              <div
                key={al.id}
                onClick={() => {
                  if (al.type === 'SEUIL_15000_ATTEINT' || al.type === 'VERIFICATION_15_30') {
                    setActiveTab('immatriculations');
                  } else if (al.type === 'DOSSIER_ALLOCATIONS') {
                    setActiveTab('dossiers');
                  } else {
                    onSelectAdherent(al.adherentId);
                  }
                }}
                className="p-3.5 bg-rose-50/70 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-extrabold text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded">
                    {al.matricule}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                    Priorité haute
                  </span>
                </div>
                <div className="text-xs font-bold text-rose-950 mt-1.5 group-hover:text-rose-700 transition-colors">
                  {al.titre}
                </div>
                <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                  {al.message}
                </p>
                <div className="mt-2.5 pt-2 border-t border-rose-200/60 flex items-center justify-between text-[11px] font-bold text-rose-700">
                  <span>Traiter l'alerte</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bloc 1 : Métriques Financières (Cotisations du jour, mois, année) */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Cotisations Encaissées (Règles COSITI 700 / 1 000 FCFA)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Aujourd'hui
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-900 mt-2 font-mono">
              {formatFCFA(cotisationsAujourdhui)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Encaissements du jour en cours
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Mois en cours
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
              {formatFCFA(cotisationsMois)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Cumul mensuel de toutes les cotisations
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Année 2026
              </span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
              {formatFCFA(cotisationsAnnee)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Volume annuel total encaissé
            </p>
          </div>
        </div>
      </div>

      {/* Bloc 2 : Indicateurs Clés Adhérents & Immatriculations */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
          <Users className="w-4 h-4 text-emerald-600" />
          <span>Indicateurs Adhérents & Prestations Sociales</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Total Adhérents */}
          <div
            onClick={() => setActiveTab('adherents')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Adhérents
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
              {totalAdherents}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">
              {adherentsActifs} adhérents actifs
            </span>
          </div>

          {/* Adhérents Immatriculés */}
          <div
            onClick={() => setActiveTab('immatriculations')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Immatriculés CNPS
            </span>
            <div className="text-2xl font-extrabold text-blue-900 mt-1 font-mono">
              {adherentsImmatricules}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {adherentsNonImmatricules} non immatriculés
            </span>
          </div>

          {/* À Jour vs Non à jour */}
          <div
            onClick={() => setActiveTab('alertes')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Cotisations à jour
            </span>
            <div className="text-2xl font-extrabold text-emerald-800 mt-1 font-mono">
              {adherentsAJour}
            </div>
            <span className="text-[11px] text-amber-700 font-semibold block mt-0.5">
              {adherentsNonAJour} en retard / sans versement
            </span>
          </div>

          {/* Ayant atteint 15 000 FCFA */}
          <div
            onClick={() => setActiveTab('immatriculations')}
            className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-xs hover:border-emerald-400 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
              Seuil 15 000 F Atteint
            </span>
            <div className="text-2xl font-extrabold text-emerald-950 mt-1 font-mono">
              {adherentsSeuil15k}
            </div>
            <span className="text-[11px] text-emerald-800 font-bold block mt-0.5">
              {adherentsAImmatriculer} en attente d'immatriculation
            </span>
          </div>

          {/* Dossiers Allocations à constituer */}
          <div
            onClick={() => setActiveTab('dossiers')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Dossiers Allocations
            </span>
            <div className="text-2xl font-extrabold text-blue-900 mt-1 font-mono">
              {dossiersAConstituer}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Dossiers à compléter / transmettre
            </span>
          </div>

          {/* Règle Cycle 15 / 30 */}
          <div
            onClick={() => setActiveTab('immatriculations')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Cycle Vérification 15 / 30
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
              15 & 30
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Contrôle automatique du seuil
            </span>
          </div>

          {/* Alertes administratives */}
          <div
            onClick={() => setActiveTab('alertes')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-rose-300 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Alertes
            </span>
            <div className="text-2xl font-extrabold text-rose-800 mt-1 font-mono">
              {alerts.length}
            </div>
            <span className="text-[11px] text-rose-600 font-semibold block mt-0.5">
              Retards & immatriculations
            </span>
          </div>

          {/* Raccourci Rapports */}
          <div
            onClick={() => setActiveTab('rapports')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              États & Statistiques
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
              10
            </div>
            <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
              Rapports exportables Excel/PDF
            </span>
          </div>
        </div>
      </div>

      {/* Bloc 3 : Dernières cotisations enregistrées */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Derniers encaissements enregistrés
            </h3>
            <p className="text-xs text-slate-500">
              Transactions récentes dans le registre des cotisations
            </p>
          </div>
          <button
            onClick={() => setActiveTab('cotisations')}
            className="text-xs font-bold text-emerald-700 hover:underline flex items-center space-x-1"
          >
            <span>Voir toutes les cotisations</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Adhérent</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Période</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentCotisations.map((cot) => (
                <tr key={cot.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {formatDateShort(cot.datePaiement)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onSelectAdherent(cot.adherentId)}
                      className="text-left group cursor-pointer"
                    >
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] mr-1.5">
                        {cot.matricule}
                      </span>
                      <span className="font-bold text-slate-900 group-hover:text-emerald-700">
                        {cot.adherentNomPrenom}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 font-extrabold font-mono text-emerald-800">
                    {formatFCFA(cot.montant)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700 text-[11px]">
                      {cot.modePaiement}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {cot.mois} {cot.annee}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{cot.agentEnregistreur}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onViewReceipt(cot)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Reçu
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
