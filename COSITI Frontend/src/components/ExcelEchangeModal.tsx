import React, { useEffect, useRef, useState } from 'react';
import { X, FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle, Loader2, FileCheck2, Info } from 'lucide-react';
import { excel } from '../api/excel';
import { errorMessage } from '../api/client';
import type { CatalogueFeuille, RapportImport } from '../api/models';
import { useApp } from '../context/AppContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** donnée présélectionnée (ex. 'cotisations') */
  entite?: string;
}

/**
 * Échange de données Excel : exporter un ensemble de données pour le traiter hors de l'application, puis le réimporter.
 * Le serveur produit et relit exactement le même format ; l'import se fait en deux temps (simulation, puis import réel).
 */
export const ExcelEchangeModal: React.FC<Props> = ({ isOpen, onClose, entite }) => {
  const { refreshAll } = useApp();
  const [onglet, setOnglet] = useState<'export' | 'import'>('export');
  const [catalogue, setCatalogue] = useState<CatalogueFeuille[]>([]);
  const [choix, setChoix] = useState<Set<string>>(new Set());
  const [du, setDu] = useState('');
  const [au, setAu] = useState('');
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const [fichier, setFichier] = useState<File | null>(null);
  const [ignorerErreurs, setIgnorerErreurs] = useState(false);
  const [rapport, setRapport] = useState<RapportImport | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErreur(null);
    setRapport(null);
    setFichier(null);
    excel
      .catalogue()
      .then((c) => {
        setCatalogue(c);
        const exportables = c.filter((x) => x.exportable);
        setChoix(new Set(entite && exportables.some((x) => x.id === entite) ? [entite] : exportables.map((x) => x.id)));
      })
      .catch((e) => setErreur(errorMessage(e)));
  }, [isOpen, entite]);

  if (!isOpen) return null;

  const exportables = catalogue.filter((c) => c.exportable);
  const basculer = (id: string) =>
    setChoix((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErreur(null);
    try {
      await fn();
    } catch (e) {
      setErreur(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const exporter = () =>
    run(async () => {
      await excel.exporter({ entites: [...choix], du: du || undefined, au: au || undefined });
    });
  const modele = () => run(async () => void (await excel.modele([...choix].filter((id) => catalogue.find((c) => c.id === id)?.importable))));

  const simuler = () =>
    run(async () => {
      if (!fichier) throw new Error('Choisissez d’abord un fichier .xlsx.');
      setRapport(await excel.importer(fichier, { mode: 'simulation', ignorerErreurs }));
    });
  const importer = () =>
    run(async () => {
      if (!fichier) throw new Error('Choisissez d’abord un fichier .xlsx.');
      const r = await excel.importer(fichier, { mode: 'import', ignorerErreurs });
      setRapport(r);
      if (r.applique) await refreshAll();
    });

  const peutImporter = !!rapport && rapport.mode === 'simulation' && rapport.totaux.lignes > 0 && (rapport.ok || ignorerErreurs);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden border border-slate-200 flex flex-col">
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-base">Échange de données Excel</h3>
              <p className="text-xs text-emerald-200">Exportez, traitez hors de l’application, puis réimportez : le format est le même dans les deux sens.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-emerald-800 rounded-lg cursor-pointer" title="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 text-sm font-semibold shrink-0">
          {(['export', 'import'] as const).map((o) => (
            <button
              key={o}
              onClick={() => setOnglet(o)}
              className={`px-5 py-2.5 cursor-pointer ${onglet === o ? 'text-emerald-800 border-b-2 border-emerald-700' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {o === 'export' ? 'Exporter' : 'Importer'}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-sm">
          {erreur && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erreur}</span>
            </div>
          )}

          {onglet === 'export' && (
            <>
              <p className="text-xs text-slate-600">
                Cochez les données à exporter. Le classeur contient une feuille par donnée (montants numériques en FCFA, dates AAAA-MM-JJ), plus des feuilles d’informations et
                d’instructions. Les colonnes marquées « [calculé] » sont fournies pour information et ignorées à l’import.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {exportables.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={choix.has(c.id)} onChange={() => basculer(c.id)} className="w-4 h-4 accent-emerald-700" />
                    <span className="font-semibold text-slate-800">{c.feuille}</span>
                    {c.exportSeul && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">export seul</span>}
                    {!c.exportSeul && !c.importable && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">lecture</span>}
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-slate-600">
                  Du (optionnel)
                  <input type="date" value={du} onChange={(e) => setDu(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Au (optionnel)
                  <input type="date" value={au} onChange={(e) => setAu(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
                </label>
              </div>
              <p className="text-[11px] text-slate-500 flex gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                La période s’applique aux cotisations, dépenses, versements, frais Mobile Money et bulletins.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={exporter}
                  disabled={busy || choix.size === 0}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Télécharger l’export (.xlsx)
                </button>
                <button onClick={modele} disabled={busy} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer">
                  Télécharger le modèle vierge
                </button>
              </div>
            </>
          )}

          {onglet === 'import' && (
            <>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                <p className="font-bold">Comment ça marche</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Utilisez un fichier exporté par COSITI (ou le modèle) : ne modifiez ni les en-têtes ni la colonne « ID ».</li>
                  <li>
                    <strong>1. Analyser</strong> exécute tout puis annule : vous voyez exactement ce qui sera créé, modifié ou refusé (règles métier comprises).
                  </li>
                  <li>
                    <strong>2. Importer</strong> écrit réellement (code de confirmation exigé). Tout ou rien : une seule ligne refusée annule l’import, sauf si vous cochez l’option.
                  </li>
                  <li>Un import ne supprime jamais de donnée, et une cellule vide laisse la valeur existante inchangée.</li>
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => {
                    setFichier(e.target.files?.[0] ?? null);
                    setRapport(null);
                  }}
                  className="text-xs"
                />
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={ignorerErreurs} onChange={(e) => { setIgnorerErreurs(e.target.checked); setRapport(null); }} className="w-4 h-4 accent-emerald-700" />
                  Importer les lignes valides même si d’autres sont refusées
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={simuler}
                  disabled={busy || !fichier}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
                  1. Analyser le fichier (simulation)
                </button>
                <button
                  onClick={importer}
                  disabled={busy || !peutImporter}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  2. Importer dans la base
                </button>
              </div>

              {rapport && <RapportImportVue rapport={rapport} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Puce: React.FC<{ n: number; label: string; ton: string }> = ({ n, label, ton }) => (
  <div className={`px-3 py-2 rounded-xl border text-center ${ton}`}>
    <div className="text-lg font-extrabold leading-none">{n}</div>
    <div className="text-[10px] font-semibold uppercase tracking-wide mt-1">{label}</div>
  </div>
);

const RapportImportVue: React.FC<{ rapport: RapportImport }> = ({ rapport }) => {
  const t = rapport.totaux;
  const titre = rapport.applique
    ? 'Import effectué : les données sont enregistrées en base.'
    : rapport.mode === 'import'
    ? 'Import refusé : aucune donnée n’a été modifiée.'
    : rapport.ok
    ? 'Analyse terminée : le fichier est valide. Rien n’est encore enregistré.'
    : 'Analyse terminée : des lignes sont refusées. Rien n’est enregistré.';
  return (
    <div className="space-y-3">
      <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${rapport.applique || rapport.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
        {rapport.applique || rapport.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        {titre}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Puce n={t.lignes} label="Lignes lues" ton="bg-slate-50 border-slate-200 text-slate-800" />
        <Puce n={t.crees} label={rapport.applique ? 'Créées' : 'À créer'} ton="bg-emerald-50 border-emerald-200 text-emerald-800" />
        <Puce n={t.misAJour} label={rapport.applique ? 'Mises à jour' : 'À mettre à jour'} ton="bg-blue-50 border-blue-200 text-blue-800" />
        <Puce n={t.inchanges} label="Inchangées" ton="bg-slate-50 border-slate-200 text-slate-600" />
        <Puce n={t.erreurs} label="Refusées" ton={t.erreurs ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-500'} />
      </div>
      {rapport.feuillesInconnues.length > 0 && (
        <p className="text-[11px] text-amber-800">Feuilles non reconnues (ignorées) : {rapport.feuillesInconnues.join(', ')}</p>
      )}
      <div className="space-y-2">
        {rapport.feuilles.map((f) => (
          <div key={f.id} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="font-bold text-slate-900">{f.feuille}</span>
              <span className="text-slate-500">{f.lignes} ligne(s)</span>
              <span className="text-emerald-700">{f.crees} créée(s)</span>
              <span className="text-blue-700">{f.misAJour} modifiée(s)</span>
              <span className="text-slate-500">{f.inchanges} inchangée(s){f.doublons ? ` dont ${f.doublons} doublon(s)` : ''}</span>
              {f.erreurs.length > 0 && <span className="text-rose-700 font-bold">{f.erreurs.length} refusée(s)</span>}
            </div>
            {f.avertissements.map((a, i) => (
              <p key={i} className="px-3 py-1.5 text-[11px] text-amber-800 bg-amber-50 border-t border-amber-100">{a}</p>
            ))}
            {f.erreurs.length > 0 && (
              <ul className="divide-y divide-rose-100 max-h-48 overflow-y-auto">
                {f.erreurs.map((e, i) => (
                  <li key={i} className="px-3 py-1.5 text-[11px] text-rose-800 bg-rose-50/50">
                    {e.ligne ? <strong>Ligne {e.ligne} : </strong> : null}
                    {e.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
