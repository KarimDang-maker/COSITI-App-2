import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';
import { request, errorMessage } from '../../api/client';

interface Anomalie {
  gravite: 'erreur' | 'avertissement' | 'information';
  code: string;
  message: string;
  ref?: string;
}
interface Controle {
  ok: boolean;
  genereLe: string;
  verifie: Record<string, number>;
  resume: { erreurs: number; avertissements: number; informations: number };
  anomalies: Anomalie[];
}

const TON: Record<Anomalie['gravite'], string> = {
  erreur: 'bg-rose-50 border-rose-200 text-rose-900',
  avertissement: 'bg-amber-50 border-amber-200 text-amber-900',
  information: 'bg-slate-50 border-slate-200 text-slate-700',
};

/**
 * Contrôle d'intégrité des données financières (GET /finances/controle) : le serveur recoupe cotisations, dépenses,
 * versements, frais Mobile Money, paie et rapports d'agents, et signale toute incohérence. Lecture seule.
 */
export const ControleIntegritePanel: React.FC = () => {
  const [data, setData] = useState<Controle | null>(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const lancer = async () => {
    setBusy(true);
    setErreur(null);
    try {
      setData((await request('GET', '/finances/controle')).data as Controle);
    } catch (e) {
      setErreur(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
          {data && !data.ok ? <ShieldAlert className="w-5 h-5 text-rose-600" /> : <ShieldCheck className="w-5 h-5 text-emerald-600" />}
          Contrôle d’intégrité des données financières
        </h2>
        <button onClick={lancer} disabled={busy} className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {data ? 'Relancer le contrôle' : 'Lancer le contrôle'}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Le serveur recoupe les cotisations, dépenses, versements, frais Mobile Money, la paie et les rapports d’agents (montants, doublons, orphelins, écarts de calcul).
        Lecture seule : rien n’est modifié.
      </p>
      {erreur && <p className="text-xs text-rose-700">{erreur}</p>}
      {data && (
        <div className="space-y-2">
          <div className={`p-3 rounded-xl border text-xs font-semibold ${data.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
            {data.ok ? 'Aucune erreur : les données financières sont cohérentes.' : `${data.resume.erreurs} erreur(s) à corriger.`}{' '}
            {data.resume.avertissements > 0 && `${data.resume.avertissements} avertissement(s). `}
            <span className="font-normal text-slate-600">
              Vérifié : {Object.entries(data.verifie).map(([k, v]) => `${v} ${k}`).join(' · ')}
            </span>
          </div>
          {data.anomalies.length > 0 && (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {data.anomalies.map((a, i) => (
                <li key={i} className={`px-3 py-2 rounded-lg border text-[11px] ${TON[a.gravite]}`}>
                  <span className="font-bold uppercase mr-2">{a.gravite}</span>
                  {a.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
