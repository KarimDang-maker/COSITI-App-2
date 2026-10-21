import React from 'react';
import { useApp } from '../context/AppContext';
import { getUserPermissions } from '../utils/permissions';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BadgeCheck,
  FolderHeart,
  BellRing,
  FileSpreadsheet,
  UserCheck,
  Settings,
  History,
  Shield,
  Layers,
  ChevronRight,
  Menu,
  X,
  Landmark,
  CalendarDays,
  CalendarRange,
  Briefcase,
  FileText,
  ReceiptText,
  Banknote,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { activeTab, setActiveTab, alerts, parametres, currentUser } = useApp();

  const urgentAlertsCount = alerts.filter((a) => a.niveau === 'urgent').length;
  const totalAlertsCount = alerts.length;
  const permissions = getUserPermissions(currentUser);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'adherents',
      label: 'Adhérents',
      icon: Users,
      badge: null,
    },
    {
      id: 'gestionnaires',
      label: 'Gestionnaires (Portefeuille)',
      icon: Briefcase,
      badge: null,
    },
    {
      id: 'cotisations',
      label: 'Cotisations',
      icon: CreditCard,
      badge: null,
    },
    ...(permissions.canManageFinances
      ? [
          {
            id: 'finances',
            label: 'Finances & Dépenses (DAF)',
            icon: Landmark,
            badge: null,
          },
          {
            id: 'paie',
            label: 'Gestion de la Paie (DAF)',
            icon: Banknote,
            badge: 'Loi & CNPS',
            badgeColor: 'bg-emerald-600 text-white',
          },
        ]
      : []),
    {
      id: 'rapports-agents',
      label: 'Rapports Agents (Caisse)',
      icon: ReceiptText,
      badge: currentUser.role === 'Caissière & Agent d\'enregistrement' ? 'Saisie' : null,
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'immatriculations',
      label: 'Immatriculations',
      icon: BadgeCheck,
      badge: '15 000 F',
    },
    {
      id: 'dossiers',
      label: 'Dossiers CNPS',
      icon: FolderHeart,
      badge: null,
    },
    ...(permissions.canManageAgenda
      ? [
          {
            id: 'agenda',
            label: 'Agenda Direction (DG/DGA)',
            icon: CalendarDays,
            badge: null,
          },
        ]
      : []),
    {
      id: 'rapports-reunions',
      label: 'Rapports de Réunion (PV)',
      icon: FileText,
      badge: null,
    },
    {
      id: 'alertes',
      label: 'Alertes & Relances',
      icon: BellRing,
      badge: totalAlertsCount > 0 ? totalAlertsCount : null,
      badgeColor: urgentAlertsCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white',
    },
    {
      id: 'etats-mensuels',
      label: 'États Mensuels (Clôture)',
      icon: CalendarRange,
      badge: null,
    },
    {
      id: 'rapports',
      label: 'Rapports & Exports',
      icon: FileSpreadsheet,
      badge: null,
    },
    {
      id: 'utilisateurs',
      label: 'Utilisateurs',
      icon: UserCheck,
      badge: null,
    },
    {
      id: 'parametres',
      label: 'Paramètres',
      icon: Settings,
      badge: null,
    },
    {
      id: 'journal',
      label: 'Journal des opérations',
      icon: History,
      badge: null,
    },
  ];

  const handleNav = (id: string) => {
    setActiveTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container: static in flexbox on desktop (lg:static), fixed drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:inset-auto lg:z-auto bg-emerald-950 text-emerald-100 flex flex-col transition-all duration-300 ease-in-out border-r border-emerald-900/60 shadow-2xl lg:shadow-none shrink-0 h-full ${
          isCollapsed ? 'lg:w-20' : 'lg:w-72'
        } w-72 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className={`p-4 border-b border-emerald-900/70 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-950">
              <Layers className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-lg text-white tracking-tight">
                    {parametres?.sigle || 'COSITI'}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-800 text-emerald-200 shrink-0">
                    Coopérative
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300 font-medium truncate">
                  Secteur Informel
                </p>
              </div>
            )}
          </div>

          {/* Close on mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-900 cursor-pointer"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Bar */}
        <div className={`px-4 py-3 bg-emerald-900/40 border-b border-emerald-900/50 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div
              className="w-8 h-8 shrink-0 rounded-full bg-emerald-800 border border-emerald-700 flex items-center justify-center text-xs font-bold text-emerald-100"
              title={`${currentUser.nom} (${currentUser.role} - ${permissions.typeAcces})`}
            >
              {currentUser.nom.charAt(0)}
            </div>
            {!isCollapsed && (
              <div className="leading-tight min-w-0">
                <div className="text-xs font-semibold text-white truncate max-w-[130px]">
                  {currentUser.nom}
                </div>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="text-[10px] text-emerald-300 truncate">{currentUser.role}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-800/80 text-emerald-200 border border-emerald-700 shrink-0">
                    {permissions.typeAcces}
                  </span>
                </div>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-900 shrink-0" title="Connecté" />
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-emerald-800">
          {!isCollapsed && (
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
              Menu Principal
            </div>
          )}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-2.5'
                } rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-emerald-200/90 hover:bg-emerald-900/70 hover:text-white'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-emerald-400'
                    }`}
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      item.badgeColor || 'bg-emerald-900 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {isCollapsed && item.badge && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2" />
                )}
                {!isCollapsed && !item.badge && isActive && (
                  <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info: Code sécurité */}
        <div className="p-3 border-t border-emerald-900/60 bg-emerald-950/80">
          {!isCollapsed ? (
            <div className="rounded-xl p-2.5 bg-emerald-900/50 border border-emerald-800/60 text-[11px] text-emerald-200/80 space-y-1">
              <div className="flex items-center justify-between font-semibold text-emerald-100">
                <span className="flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Code de confirmation</span>
                </span>
              </div>
              <p className="text-[10px] text-emerald-300/70">
                Demandé pour toute modification ou suppression sensible. Vérifié par le serveur ; toutes les actions sont journalisées.
              </p>
            </div>
          ) : (
            <div className="flex justify-center" title="Code de confirmation requis pour les opérations sensibles">
              <span className="p-2 rounded-lg bg-emerald-900/50 text-emerald-300 text-xs font-mono font-bold flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
