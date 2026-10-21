import React, { useCallback, useEffect, useState } from 'react';
import { X, Printer, Loader2, Activity, LogIn, ShieldAlert, Clock, Filter, ChevronLeft, ChevronRight, Shield, Mail, Briefcase, Phone } from 'lucide-react';
import type { Utilisateur } from '../types';
import { useApp, type ActiviteUtilisateur } from '../context/AppContext';
import { request, errorMessage, logEvent, type ModuleAcces } from '../api/client';
import { libelleOperation, toneOperation, fmtDateHeure, imprimerRapportAudit } from '../utils/auditReport';

const TONES: Record<string, string> = {
  auth: 'bg-sky-50 text-sky-800 border-sky-200',
  danger: 'bg-rose-50 text-rose-800 border-rose-200',
  create: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  update: 'bg-amber-50 text-amber-800 border-amber-200',
  other: 'bg-slate-50 text-slate-700 border-slate-200',
};
const NIVEAU: Record<string, string> = { ecriture: 'bg-emerald-100 text-emerald-800', lecture: 'bg-sky-100 text-sky-800', aucun: 'bg-slate-100 text-slate-500' };
const PAGE = 50;

/**
 * Profil d'un acteur : identité, droits, et TOUTES les actions qu'il a menées sur la plateforme (journal d'audit),
 * avec filtres et impression du rapport d'audit. Accès : profils d'audit, ou l'acteur lui-même.
 */
export const UtilisateurProfilModal: React.FC<{ user: Utilisateur | null; onClose: () => void }> = ({ user, onClose }) => {
  const { fetchActiviteUtilisateur, fetchRapportAudit } = useApp();
  const [tab, setTab] = useState<'activite' | 'droits'>('activite');
  const [du, setDu] = useState('');
  const [au, setAu] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ActiviteUtilisateur | null>(null);
  const [modules, setModules] = useState<ModuleAcces[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setData(await fetchActiviteUtilisateur(user.id, { du: du || undefined, au: au || undefined, typeOperation: type || undefined, page, pageSize: PAGE }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user, du, au, type, page, fetchActiviteUtilisateur]);

  useEffect(() => {
    if (!user) return;
    setTab('activite');
    setDu('');
    setAu('');
    setType('');
    setPage(1);
    setData(null);
    request('GET', `/utilisateurs/${encodeURIComponent(user.id)}`)
      .then((r) => setModules(r.data.modules || []))
      .catch(() => setModules([]));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  const imprimer = async () => {
    setPrinting(true);
    try {
      const rapport = await fetchRapportAudit(user.id, { du: du || undefined, au: au || undefined });
      imprimerRapportAudit(rapport);
      logEvent('IMPRESSION_RAPPORT_AUDIT', `Impression du rapport d'audit de ${user.nom} (${user.role})`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPrinting(false);
    }
  };

  const s = data?.statistiques;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;
  const derAcces = user.dernierAcces && /^\d{4}-/.test(user.dernierAcces) ? fmtDateHeure(user.dernierAcces) : user.dernierAcces || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs" role="dialog" aria-modal="true" aria-label={`Profil de ${user.nom}`}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 bg-gradient-to-r from-[#FFF8EE] to-white">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 shrink-0 rounded-2xl bg-[#D97F2E] text-white flex items-center justify-center text-xl font-extrabold">{user.nom.charAt(0)}</div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-900 truncate">{user.nom}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 font-semibold text-[#5B8A4A]"><Shield className="w-3.5 h-3.5" />{user.role}</span>
                <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{user.email}</span>
                {(user.poste || user.titreComplet) && <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{user.poste || user.titreComplet}</span>}
                {user.telephone && <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{user.telephone}</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                <span className={`px-2 py-0.5 rounded-full font-bold ${user.actif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{user.actif ? 'Compte actif' : 'Compte désactivé'}</span>
                {user.mustChangePassword && <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">Mot de passe temporaire</span>}
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Dernier accès : {derAcces}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={imprimer} disabled={printing} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#D97F2E] hover:bg-[#C46F22] text-white text-sm font-bold disabled:opacity-60">
              {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} Rapport d'audit
            </button>
            <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Indicateurs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 pt-4">
          {[
            { icon: Activity, label: 'Actions enregistrées', value: s?.total ?? '…' },
            { icon: LogIn, label: 'Connexions', value: s?.connexions ?? '…' },
            { icon: ShieldAlert, label: 'Échecs de connexion', value: s?.echecsConnexion ?? '…' },
            { icon: Clock, label: 'Dernière action', value: s ? fmtDateHeure(s.derniereAction) : '…' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-slate-200 px-3.5 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><Icon className="w-3.5 h-3.5" />{label}</div>
              <div className="mt-0.5 text-lg font-extrabold text-slate-900 truncate">{value}</div>
            </div>
          ))}
        </div>

        {/* Onglets */}
        <div className="px-6 mt-4 flex gap-1 border-b border-slate-100">
          {(['activite', 'droits'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === t ? 'border-[#D97F2E] text-[#3A2A1C]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t === 'activite' ? 'Actions menées' : 'Droits du profil'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && <div role="alert" className="mb-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}

          {tab === 'activite' && (
            <>
              <div className="flex flex-wrap items-end gap-3 mb-3 text-sm">
                <label className="flex flex-col"><span className="text-[11px] font-semibold text-slate-500">Du</span>
                  <input type="date" value={du} onChange={(e) => { setDu(e.target.value); setPage(1); }} className="border border-slate-300 rounded-lg px-2 py-1.5" /></label>
                <label className="flex flex-col"><span className="text-[11px] font-semibold text-slate-500">Au</span>
                  <input type="date" value={au} onChange={(e) => { setAu(e.target.value); setPage(1); }} className="border border-slate-300 rounded-lg px-2 py-1.5" /></label>
                <label className="flex flex-col min-w-56"><span className="text-[11px] font-semibold text-slate-500">Type d'opération</span>
                  <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="border border-slate-300 rounded-lg px-2 py-1.5">
                    <option value="">Toutes ({s?.total ?? 0})</option>
                    {s && Object.entries(s.parTypeOperation).map(([k, n]) => <option key={k} value={k}>{libelleOperation(k)} ({n})</option>)}
                  </select></label>
                {(du || au || type) && <button onClick={() => { setDu(''); setAu(''); setType(''); setPage(1); }} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><Filter className="w-3.5 h-3.5" />Effacer les filtres</button>}
                {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400 mb-2" />}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-3 py-2 whitespace-nowrap">Date / heure</th><th className="px-3 py-2">Opération</th><th className="px-3 py-2">Module</th><th className="px-3 py-2">Détail</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.items.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/70 align-top">
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-slate-600">{fmtDateHeure(a.dateHeure)}</td>
                        <td className="px-3 py-2"><span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold ${TONES[toneOperation(a.typeOperation)]}`}>{libelleOperation(a.typeOperation)}</span></td>
                        <td className="px-3 py-2 text-slate-600 text-xs">{a.entite}</td>
                        <td className="px-3 py-2 text-slate-800">{a.description || a.details}{a.matricule && <span className="ml-1 text-xs font-semibold text-[#5B8A4A]">[{a.matricule}]</span>}</td>
                      </tr>
                    ))}
                    {data && data.items.length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">Aucune action sur cette période.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {data && data.total > PAGE && (
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                  <span>{data.total} action(s) — page {page}/{pages}</span>
                  <div className="flex gap-1">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                    <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'droits' && (
            <div className="grid sm:grid-cols-2 gap-3">
              {modules.map((m) => (
                <div key={m.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-slate-800">{m.label}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${NIVEAU[m.niveau]}`}>{m.niveau === 'ecriture' ? 'Écriture' : m.niveau === 'lecture' ? 'Lecture' : 'Aucun accès'}</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs">
                    {m.actions.map((a) => (
                      <li key={a.id} className={a.autorise ? 'text-slate-700' : 'text-slate-400 line-through'}>{a.autorise ? '✓' : '✗'} {a.label}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
