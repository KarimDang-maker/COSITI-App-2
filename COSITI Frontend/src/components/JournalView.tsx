import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { formatDateShort } from '../utils/helpers';
import { exportToExcel } from '../utils/exportUtils';
import { getUserPermissions } from '../utils/permissions';
import {
  History,
  Search,
  FileSpreadsheet,
  Shield,
  CheckCircle2,
  Trash2,
  Edit,
  PlusCircle,
  BadgeCheck,
  User,
  Filter,
} from 'lucide-react';

export const JournalView: React.FC = () => {
  const { journal, clearJournal, currentUser } = useApp();
  const dialog = useDialog();
  const permissions = getUserPermissions(currentUser);

  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('TOUS');
  const [filterUser, setFilterUser] = useState<string>('TOUS');

  // Extraire la liste distincte des utilisateurs enregistreurs
  const distinctUsers = useMemo(() => {
    const set = new Set<string>();
    journal.forEach((j) => {
      if (j.utilisateur) set.add(j.utilisateur);
      if (j.agentEnregistreur) set.add(j.agentEnregistreur);
    });
    return Array.from(set).sort();
  }, [journal]);

  const filteredJournal = useMemo(() => {
    return (journal || []).filter((entry) => {
      if (!entry) return false;
      const q = (search || '').toLowerCase().trim();
      const userStr = (entry.utilisateur || '').toLowerCase();
      const agentStr = (entry.agentEnregistreur || '').toLowerCase();
      const actionStr = (entry.action || entry.typeOperation || '').toLowerCase();
      const detailsStr = (entry.details || entry.description || '').toLowerCase();
      const matriculeStr = (entry.matricule || entry.adherentMatricule || '').toLowerCase();

      const matchesSearch =
        !q ||
        userStr.includes(q) ||
        agentStr.includes(q) ||
        actionStr.includes(q) ||
        detailsStr.includes(q) ||
        matriculeStr.includes(q);

      // Filtre Action
      let matchesAction = true;
      if (filterAction !== 'TOUS') {
        if (filterAction === 'COTISATION') {
          matchesAction =
            entry.entite === 'Cotisation' ||
            (entry.typeOperation || '').includes('COTISATION');
        } else if (filterAction === 'AJOUT') {
          matchesAction =
            entry.action === 'AJOUT' ||
            (entry.typeOperation || '').startsWith('CREATION') ||
            (entry.typeOperation || '').startsWith('ENREGISTREMENT');
        } else if (filterAction === 'MODIFICATION') {
          matchesAction =
            entry.action === 'MODIFICATION' ||
            (entry.typeOperation || '').startsWith('MODIFICATION');
        } else if (filterAction === 'SUPPRESSION') {
          matchesAction =
            entry.action === 'SUPPRESSION' ||
            (entry.typeOperation || '').startsWith('SUPPRESSION');
        } else if (filterAction === 'IMMATRICULATION') {
          matchesAction =
            entry.action === 'IMMATRICULATION' ||
            (entry.typeOperation || '').includes('IMMATRICULATION');
        } else if (filterAction === 'DOSSIER') {
          matchesAction =
            entry.entite.includes('Dossier') ||
            (entry.typeOperation || '').includes('DOSSIER');
        } else {
          matchesAction = entry.action === filterAction;
        }
      }

      // Filtre Utilisateur
      let matchesUser = true;
      if (filterUser !== 'TOUS') {
        matchesUser =
          entry.utilisateur === filterUser || entry.agentEnregistreur === filterUser;
      }

      return matchesSearch && matchesAction && matchesUser;
    });
  }, [journal, search, filterAction, filterUser]);

  const handleExportExcel = () => {
    const data = filteredJournal.map((j) => ({
      'Date & Heure': j.dateHeure || j.date,
      'Utilisateur Enregistreur': j.utilisateur,
      'Agent Enregistreur (Cotisation)': j.agentEnregistreur || j.utilisateur,
      Rôle: j.role,
      Action: j.action || j.typeOperation,
      Entité: j.entite,
      Matricule: j.matricule || j.adherentMatricule || 'N/A',
      'Code Sécurité Validé': j.codeSecuriteValide ? 'OUI' : 'NON',
      'Détails de l\'Opération': j.details || j.description || '',
    }));
    exportToExcel(data, `Journal_Audit_COSITI_${new Date().toISOString().slice(0, 10)}`);
  };

  const formatEntryDate = (entry: any) => {
    const raw = entry.dateHeure || entry.date;
    if (!raw) return '—';
    try {
      const dt = new Date(raw);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch {
      // fallback
    }
    return String(raw);
  };

  const getActionBadge = (entry: any) => {
    const action = entry.action;
    const typeOp = entry.typeOperation || '';

    if (action === 'AJOUT' || typeOp === 'AJOUT_BANQUE' || typeOp.startsWith('CREATION') || typeOp.startsWith('ENREGISTREMENT')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
          {typeOp.includes('COTISATION') ? 'Cotisation' : typeOp === 'AJOUT_BANQUE' ? 'Banque' : 'Création'}
        </span>
      );
    }
    if (action === 'MODIFICATION' || typeOp.startsWith('MODIFICATION')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
          Modification
        </span>
      );
    }
    if (action === 'SUPPRESSION' || typeOp.startsWith('SUPPRESSION')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
          Suppression
        </span>
      );
    }
    if (action === 'IMMATRICULATION' || typeOp.includes('IMMATRICULATION')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
          Immatriculation CNPS
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
        {action || typeOp || 'Action'}
      </span>
    );
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Journal d'Audit & Traçabilité des Opérations</span>
            <span className="text-xs bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded-md">
              {journal.length} opération(s)
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Historique complet, horodaté et nominatif : identification précise de l'utilisateur ayant enregistré chaque cotisation et opération
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Excel</span>
          </button>

          {permissions.canManageUsers && (
            <button
              onClick={async () => {
                const confirmed = await dialog.confirm({
                  title: "Réinitialisation du journal d'audit",
                  message: "Voulez-vous réinitialiser l'historique complet des actions d'audit ? Cette opération efface tous les enregistrements de traçabilité.",
                  confirmText: "Vider le journal",
                  cancelText: "Conserver",
                  variant: "danger",
                  icon: "trash",
                });
                if (confirmed) {
                  clearJournal();
                  await dialog.alert({
                    title: "Journal réinitialisé",
                    message: "Le journal d'audit a été vidé avec succès.",
                    variant: "info",
                  });
                }
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Vider le journal
            </button>
          )}
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher par utilisateur, action, matricule..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Filtre par Utilisateur Enregistreur */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-semibold shrink-0">Utilisateur :</span>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium max-w-[200px]"
            >
              <option value="TOUS">Tous les utilisateurs</option>
              {distinctUsers.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par Action */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-semibold shrink-0">Action :</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="TOUS">Toutes les actions</option>
              <option value="COTISATION">Cotisations uniquement</option>
              <option value="AJOUT">Créations / Encaissements</option>
              <option value="MODIFICATION">Modifications (Code 0000)</option>
              <option value="SUPPRESSION">Suppressions (Code 0000)</option>
              <option value="IMMATRICULATION">Immatriculations CNPS</option>
              <option value="DOSSIER">Dossiers Allocations</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau du Journal */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredJournal.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Aucun enregistrement dans le journal pour ces critères.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-4 py-3.5">Date & Heure</th>
                  <th className="px-4 py-3.5">Utilisateur / Enregistreur</th>
                  <th className="px-4 py-3.5">Action</th>
                  <th className="px-4 py-3.5">Entité / Matricule</th>
                  <th className="px-4 py-3.5">Sécurité</th>
                  <th className="px-4 py-3.5">Détails de l'opération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJournal.map((entry) => {
                  const matricule = entry.matricule || entry.adherentMatricule;
                  const isCotisation =
                    entry.entite === 'Cotisation' ||
                    (entry.typeOperation || '').includes('COTISATION');

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      {/* Date */}
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {formatEntryDate(entry)}
                      </td>

                      {/* Utilisateur / Agent Enregistreur */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10px] shrink-0">
                            {entry.utilisateur ? entry.utilisateur.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center space-x-1">
                              <span>{entry.utilisateur}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                              <span className="font-medium bg-slate-100 px-1.5 py-0.2 rounded text-[10px] text-slate-600">
                                {entry.role}
                              </span>
                              {entry.agentEnregistreur && entry.agentEnregistreur !== entry.utilisateur && (
                                <span className="text-emerald-700 font-semibold">
                                  • Agent : {entry.agentEnregistreur}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">{getActionBadge(entry)}</td>

                      {/* Entité & Matricule */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-700">{entry.entite}</div>
                        {matricule && (
                          <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                            {matricule}
                          </span>
                        )}
                        {entry.adherentNom && (
                          <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                            {entry.adherentNom}
                          </div>
                        )}
                      </td>

                      {/* Sécurité */}
                      <td className="px-4 py-3">
                        {entry.codeSecuriteValide ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Shield className="w-3 h-3 mr-1 text-amber-600" />
                            Code 0000 validé
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>

                      {/* Détails */}
                      <td className="px-4 py-3 text-slate-600 text-xs max-w-md">
                        {isCotisation && (
                          <div className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mb-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Enregistré par : <strong>{entry.agentEnregistreur || entry.utilisateur}</strong> ({entry.role})</span>
                          </div>
                        )}
                        <div className="leading-relaxed">
                          {entry.details || entry.description}
                        </div>
                        {entry.nouvellesInformations && (
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {entry.nouvellesInformations}
                          </div>
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
