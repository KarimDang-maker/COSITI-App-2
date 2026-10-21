import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { Utilisateur } from '../types';
import { Users, UserPlus, Edit, Trash2, Search, History, Lock, KeyRound, ShieldCheck, Info, Loader2, CheckCircle2, MinusCircle, Eye } from 'lucide-react';
import { getUserPermissions } from '../utils/permissions';
import { request, errorMessage, type ModuleAcces } from '../api/client';
import { fmtDateHeure } from '../utils/auditReport';
import { UtilisateurEditModal } from './UtilisateurEditModal';
import { UtilisateurProfilModal } from './UtilisateurProfilModal';

interface RoleSheet {
  role: string;
  titreOfficiel: string;
  description: string;
  droitsCles: string[];
  restrictions: string[];
  modules: ModuleAcces[];
}

const NIVEAU_ICON: Record<string, React.ReactNode> = {
  ecriture: <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" aria-label="Écriture" />,
  lecture: <Eye className="w-4 h-4 text-sky-600 mx-auto" aria-label="Lecture" />,
  aucun: <MinusCircle className="w-4 h-4 text-slate-300 mx-auto" aria-label="Aucun accès" />,
};

/**
 * Acteurs de la plateforme.
 *  - Super Administrateur : crée les comptes (tous rôles), modifie profils et informations de connexion, supprime.
 *  - Profils d'audit (DG, DGA, DAF, PCA, Conseil de Surveillance, Administrateur) : consultent le profil et les actions
 *    de chaque acteur et impriment son rapport d'audit.
 *  - Chacun : son propre profil et son activité.
 */
export const UtilisateursView: React.FC = () => {
  const { utilisateurs, currentUser, deleteUtilisateur } = useApp();
  const dialog = useDialog();
  const perms = getUserPermissions(currentUser);
  const isSuperAdmin = currentUser.role === 'Super Administrateur';

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editing, setEditing] = useState<Utilisateur | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [profil, setProfil] = useState<Utilisateur | null>(null);
  const [roles, setRoles] = useState<RoleSheet[]>([]);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [openRole, setOpenRole] = useState<string | null>(null);

  useEffect(() => {
    request('GET', '/roles')
      .then((r) => setRoles(r.data))
      .catch((e) => setRolesError(errorMessage(e)));
  }, []);

  const liste = useMemo(() => {
    const q = query.trim().toLowerCase();
    return utilisateurs.filter((u) => (!roleFilter || u.role === roleFilter) && (!q || [u.nom, u.email, u.role, u.poste].some((v) => v?.toLowerCase().includes(q))));
  }, [utilisateurs, query, roleFilter]);

  const stats = {
    total: utilisateurs.length,
    actifs: utilisateurs.filter((u) => u.actif).length,
    verrouilles: utilisateurs.filter((u) => u.lockedUntil && new Date(u.lockedUntil) > new Date()).length,
    temporaires: utilisateurs.filter((u) => u.mustChangePassword).length,
  };

  const canSeeProfile = (u: Utilisateur) => perms.canAuditUsers || u.id === currentUser.id;

  const supprimer = async (u: Utilisateur) => {
    const ok = await dialog.confirm({
      title: 'Supprimer le compte',
      message: `Supprimer définitivement le compte de ${u.nom} ? Ses actions passées restent dans le journal d'audit.`,
      confirmText: 'Supprimer',
      variant: 'danger',
      icon: 'trash',
      details: [
        { label: 'Utilisateur', value: u.nom },
        { label: 'Rôle', value: u.role },
        { label: 'E-mail', value: u.email },
      ],
    });
    if (ok) await deleteUtilisateur(u.id);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Users className="w-6 h-6 text-emerald-700" /> Acteurs de la plateforme</h2>
          <p className="text-sm text-slate-500">Comptes, rôles, activité et rapports d'audit — données de la base MySQL.</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => { setEditing(null); setIsEditOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs">
            <UserPlus className="w-4 h-4" /> Nouveau compte
          </button>
        )}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          Seul le <strong>Super Administrateur</strong> crée les comptes et modifie les informations de connexion (e-mail, mot de passe, code PIN).
          {perms.canAuditUsers ? ' Cliquez sur un acteur pour voir toutes ses actions et imprimer son rapport d\'audit.' : ' Vous pouvez consulter votre propre activité.'}
        </p>
      </div>

      {perms.canAuditUsers && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['Comptes', stats.total],
            ['Actifs', stats.actifs],
            ['Mot de passe temporaire', stats.temporaires],
            ['Verrouillés', stats.verrouilles],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] font-semibold uppercase text-slate-500">{l}</div>
              <div className="text-2xl font-extrabold text-slate-900">{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un acteur (nom, e-mail, poste)…" className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-sm" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">Tous les rôles</option>
          {[...new Set(utilisateurs.map((u) => u.role))].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Liste des acteurs */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {liste.map((u) => {
          const up = getUserPermissions(u);
          const self = u.id === currentUser.id;
          const locked = u.lockedUntil && new Date(u.lockedUntil) > new Date();
          return (
            <div key={u.id} className={`rounded-2xl border bg-white p-4 flex flex-col gap-3 ${self ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
              <button type="button" disabled={!canSeeProfile(u)} onClick={() => setProfil(u)} className="flex items-start gap-3 text-left disabled:cursor-default group">
                <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center font-extrabold ${up.badgeBgColor} ${up.badgeTextColor}`}>{u.nom.charAt(0)}</div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate group-enabled:group-hover:text-[#D97F2E]">{u.nom}{self && <span className="ml-1.5 text-[10px] font-bold text-emerald-700">(vous)</span>}</div>
                  <div className="text-xs text-slate-600 truncate">{u.poste || u.titreComplet || u.role}</div>
                  <span className={`mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${up.badgeBgColor} ${up.badgeTextColor} ${up.badgeBorderColor}`}>{u.role}</span>
                </div>
              </button>
              {u.email && <div className="text-xs text-slate-500 truncate">{u.email}</div>}
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {u.actif === false && <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold">Désactivé</span>}
                {locked && <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold inline-flex items-center gap-1"><Lock className="w-3 h-3" />Verrouillé</span>}
                {u.mustChangePassword && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">Mot de passe temporaire</span>}
                {u.dernierAcces && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Accès : {/^\d{4}-/.test(u.dernierAcces) ? fmtDateHeure(u.dernierAcces) : u.dernierAcces}</span>}
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                {canSeeProfile(u) && (
                  <button onClick={() => setProfil(u)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FFF3E0] text-[#A85A16] text-xs font-semibold hover:bg-[#FDE6C6]"><History className="w-3.5 h-3.5" />Activité & audit</button>
                )}
                {(isSuperAdmin || self) && (
                  <button onClick={() => { setEditing(u); setIsEditOpen(true); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"><Edit className="w-3.5 h-3.5" />{isSuperAdmin ? 'Modifier' : 'Mon profil'}</button>
                )}
                {isSuperAdmin && !self && (
                  <button onClick={() => supprimer(u)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 ml-auto"><Trash2 className="w-3.5 h-3.5" />Supprimer</button>
                )}
              </div>
            </div>
          );
        })}
        {liste.length === 0 && <p className="text-sm text-slate-500 col-span-full text-center py-8">Aucun acteur ne correspond.</p>}
      </div>

      {/* Fonctionnalités par rôle (matrice appliquée par le serveur) */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-700" />
          <div>
            <h3 className="font-bold text-slate-900">Fonctionnalités par rôle</h3>
            <p className="text-xs text-slate-500">Matrice appliquée par le serveur : un même module peut être accessible à plusieurs rôles, en lecture ou en écriture.</p>
          </div>
        </div>
        {rolesError && <p className="p-4 text-sm text-rose-700">{rolesError}</p>}
        {!roles.length && !rolesError && <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}
        {roles.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50">Module</th>
                    {roles.map((r) => (
                      <th key={r.role} className="px-2 py-2 font-semibold text-slate-600 text-center min-w-20">
                        <button onClick={() => setOpenRole(openRole === r.role ? null : r.role)} className={`hover:text-[#D97F2E] ${openRole === r.role ? 'text-[#D97F2E]' : ''}`}>{r.role.replace("Caissière & Agent d'enregistrement", 'Caissière').replace('Conseil de Surveillance', 'Conseil Surv.')}</button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roles[0].modules.map((m, i) => (
                    <tr key={m.id}>
                      <td className="px-3 py-2 font-medium text-slate-700 sticky left-0 bg-white whitespace-nowrap">{m.label}</td>
                      {roles.map((r) => <td key={r.role} className="px-2 py-2 text-center">{NIVEAU_ICON[r.modules[i].niveau]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap gap-4">
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />Écriture</span>
              <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-sky-600" />Lecture</span>
              <span className="inline-flex items-center gap-1"><MinusCircle className="w-3.5 h-3.5 text-slate-300" />Aucun accès</span>
              <span>Cliquez sur un rôle pour le détail de ses droits.</span>
            </div>
            {openRole && (() => {
              const r = roles.find((x) => x.role === openRole)!;
              return (
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60 grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h4 className="font-bold text-slate-900">{r.role}</h4>
                    <p className="text-xs text-slate-500 italic">{r.titreOfficiel}</p>
                    <p className="mt-2 text-slate-700 text-xs leading-relaxed">{r.description}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold uppercase text-emerald-700 mb-1">Droits clés</h5>
                    <ul className="space-y-1 text-xs text-slate-700 list-disc pl-4">{r.droitsCles.map((d) => <li key={d}>{d}</li>)}</ul>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold uppercase text-rose-700 mb-1">Restrictions</h5>
                    <ul className="space-y-1 text-xs text-slate-700 list-disc pl-4">{r.restrictions.length ? r.restrictions.map((d) => <li key={d}>{d}</li>) : <li>Aucune</li>}</ul>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </section>

      <UtilisateurEditModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} userToEdit={editing} />
      <UtilisateurProfilModal user={profil} onClose={() => setProfil(null)} />

    </div>
  );
};
