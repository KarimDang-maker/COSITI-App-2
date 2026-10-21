import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Menu,
  Search,
  PlusCircle,
  Bell,
  User,
  ShieldCheck,
  CreditCard,
  UserPlus,
  ChevronDown,
  X,
  Eye,
  Shield,
  LogOut,
  History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UtilisateurProfilModal } from './UtilisateurProfilModal';
import { formatDateShort } from '../utils/helpers';
import { getUserPermissions, getTypeAcces } from '../utils/permissions';
import { Utilisateur } from '../types';

interface HeaderProps {
  onToggleMobile: () => void;
  onToggleCollapseSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onOpenNewAdherent: () => void;
  onOpenNewCotisation: () => void;
  onSelectAdherent?: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobile,
  onToggleCollapseSidebar,
  isSidebarCollapsed = false,
  onOpenNewAdherent,
  onOpenNewCotisation,
  onSelectAdherent,
}) => {
  const {
    currentUser,
    setCurrentUser,
    utilisateurs,
    alerts,
    setActiveTab,
    setSelectedAdherentId,
    adherents,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAlertsMenu, setShowAlertsMenu] = useState(false);
  const [showMyProfile, setShowMyProfile] = useState(false);
  const { logout } = useAuth();

  // Recherche instantanée multi-critères
  const filteredAdherents = searchQuery && searchQuery.trim()
    ? (adherents || []).filter((adh) => {
        if (!adh) return false;
        const q = (searchQuery || '').toLowerCase().trim();
        const mat = (adh.matricule || '').toLowerCase();
        const nom = (adh.nom || '').toLowerCase();
        const prenom = (adh.prenom || '').toLowerCase();
        const tel = (adh.telephone || '').toLowerCase();
        const cni = (adh.cni || '').toLowerCase();
        const cnps = (adh.numeroCnps || '').toLowerCase();
        return (
          mat.includes(q) ||
          nom.includes(q) ||
          prenom.includes(q) ||
          tel.includes(q) ||
          cni.includes(q) ||
          cnps.includes(q)
        );
      }).slice(0, 5)
    : [];

  const handleSelectSearchResult = (adherentId: string) => {
    if (onSelectAdherent) {
      onSelectAdherent(adherentId);
    } else {
      setSelectedAdherentId(adherentId);
      setActiveTab('adherents');
    }
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const urgentCount = alerts.filter((a) => a.niveau === 'urgent').length;
  const permissions = getUserPermissions(currentUser);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 shadow-xs">
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onToggleMobile}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop sidebar toggle button */}
        {onToggleCollapseSidebar && (
          <button
            type="button"
            onClick={onToggleCollapseSidebar}
            className="hidden lg:flex p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title={isSidebarCollapsed ? 'Agrandir la barre latérale' : 'Réduire la barre latérale'}
            aria-label={isSidebarCollapsed ? 'Agrandir la barre latérale' : 'Réduire la barre latérale'}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Barre de recherche rapide */}
        <div className="relative w-36 xs:w-48 sm:w-72 md:w-80 lg:w-96 min-w-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Rechercher..."
              className="w-full pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 sm:py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown résultats de recherche */}
          {showSearchResults && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Résultats rapides ({filteredAdherents.length})
              </div>
              {filteredAdherents.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-500 text-center">
                  Aucun adhérent trouvé pour « {searchQuery} »
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredAdherents.map((adh) => (
                    <button
                      key={adh.id}
                      onClick={() => handleSelectSearchResult(adh.id)}
                      className="w-full px-3 py-2.5 text-left hover:bg-emerald-50 flex items-center justify-between transition-colors group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                            {adh.matricule}
                          </span>
                          <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-950">
                            {adh.nom} {adh.prenom}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {adh.profession} • Tél : {adh.telephone}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {adh.statutImmatriculation}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions rapides droite */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Badge mode consultation si read-only */}
        {permissions.isReadOnly && (
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
            <Eye className="w-3.5 h-3.5 text-amber-700" />
            <span>Consultation ({currentUser.role})</span>
          </div>
        )}

        {/* Bouton Nouvel Adhérent (si habilité) */}
        {permissions.canRecord && (
          <button
            onClick={onOpenNewAdherent}
            className="hidden sm:inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            title="Enregistrer un nouvel adhérent"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
            <span>Adhérent</span>
          </button>
        )}

        {/* Bouton Encaisser Cotisation (si habilité) */}
        {permissions.canRecord && (
          <button
            onClick={onOpenNewCotisation}
            className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs hover:shadow-emerald-600/20 transition-all cursor-pointer active:scale-98"
            title="Encaisser une cotisation"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
            <span className="hidden xs:inline">Encaisser</span>
            <span className="xs:hidden">+</span>
          </button>
        )}

        {/* Cloche d'alertes */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAlertsMenu(!showAlertsMenu)}
            className="relative p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            title="Alertes administratives"
          >
            <Bell className="w-5 h-5" />
            {alerts.length > 0 && (
              <span
                className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                  urgentCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
            )}
          </button>

          {/* Menu dropdown des alertes */}
          {showAlertsMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Alertes administratives
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {alerts.length} alerte(s) active(s) nécessitant attention
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('alertes');
                    setShowAlertsMenu(false);
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Tout voir
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {alerts.slice(0, 4).map((al) => (
                  <div
                    key={al.id}
                    onClick={() => {
                      setSelectedAdherentId(al.adherentId);
                      setActiveTab('adherents');
                      setShowAlertsMenu(false);
                    }}
                    className="p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          al.niveau === 'urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {al.matricule}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDateShort(al.dateDeclenchement)}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-1">{al.titre}</div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{al.message}</p>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    setActiveTab('alertes');
                    setShowAlertsMenu(false);
                  }}
                  className="w-full py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  Accéder au centre des alertes
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profil & Sélecteur de rôle COSITI */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
            title="Changer de profil utilisateur (Test des rôles COSITI)"
          >
            <div
              className={`w-7 h-7 rounded-lg ${permissions.badgeBgColor} ${permissions.badgeTextColor} flex items-center justify-center font-bold text-xs border ${permissions.badgeBorderColor}`}
            >
              {currentUser.nom.charAt(0)}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-none">{currentUser.nom}</div>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-[10px] text-slate-600 font-semibold">{currentUser.role}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${permissions.badgeBgColor} ${permissions.badgeTextColor}`}
                >
                  {permissions.typeAcces}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User selector dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Connecté : {currentUser.email}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setShowUserMenu(false); setShowMyProfile(true); }}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700"
                  >
                    <History className="w-3.5 h-3.5" /> Mon profil & activité
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowUserMenu(false); logout(); }}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 px-2 py-1.5 text-[11px] font-semibold text-rose-700"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Se déconnecter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <UtilisateurProfilModal user={showMyProfile ? currentUser : null} onClose={() => setShowMyProfile(false)} />
    </header>
  );
};
