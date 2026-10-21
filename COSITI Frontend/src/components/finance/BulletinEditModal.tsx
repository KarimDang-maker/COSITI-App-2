import React, { useState, useEffect } from 'react';
import { BulletinPaie, Employe } from '../../types';
import { request } from '../../api/client';
import {
  FileEdit,
  Save,
  X,
  DollarSign,
  Calculator,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface BulletinEditModalProps {
  bulletin: BulletinPaie | null;
  employe?: Employe;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedBulletin: BulletinPaie) => void;
}

export const BulletinEditModal: React.FC<BulletinEditModalProps> = ({
  bulletin,
  employe,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !bulletin) return null;

  // Form state
  const [salaireBase, setSalaireBase] = useState(bulletin.salaireBase || 60000);
  const [sursalaire, setSursalaire] = useState(bulletin.sursalaire || 0);
  const [primeAnciennete, setPrimeAnciennete] = useState(bulletin.primeAnciennete || 0);
  const [primeRendement, setPrimeRendement] = useState(bulletin.primeRendement || 0);
  const [indemniteTransport, setIndemniteTransport] = useState(bulletin.indemniteTransport || 0);
  const [indemniteLogement, setIndemniteLogement] = useState(bulletin.indemniteLogement || 0);
  const [autresPrimes, setAutresPrimes] = useState(bulletin.autresPrimes || 0);
  const [acomptesAvances, setAcomptesAvances] = useState(bulletin.acomptesAvances || 0);
  const [retenuesDiverses, setRetenuesDiverses] = useState(bulletin.retenuesDiverses || 0);
  const [heuresTravaillees, setHeuresTravaillees] = useState(bulletin.heuresTravaillees || 173.33);
  const [joursTravailles, setJoursTravailles] = useState(bulletin.joursTravailles || 30);
  const [notesCommentaires, setNotesCommentaires] = useState(bulletin.notesCommentaires || '');

  // Live calculated preview
  const [preview, setPreview] = useState<BulletinPaie>(bulletin);

  // Aperçu en direct : le bulletin est CALCULÉ PAR LE SERVEUR (barème CNPS / CGI) avec les éléments saisis —
  // POST /paie/bulletins/:id/apercu (rien n'est enregistré avant « Enregistrer »).
  useEffect(() => {
    let annule = false;
    const t = setTimeout(() => {
      request('POST', `/paie/bulletins/${encodeURIComponent(bulletin.id)}/apercu`, {
        body: {
          salaireBase, sursalaire, primeAnciennete, primeRendement, indemniteTransport, indemniteLogement,
          autresPrimes, acomptesAvances, retenuesDiverses, heuresTravaillees, joursTravailles, notesCommentaires,
        },
      })
        .then((r) => !annule && setPreview(r.data as BulletinPaie))
        .catch(() => undefined);
    }, 250);
    return () => {
      annule = true;
      clearTimeout(t);
    };
  }, [
    salaireBase,
    sursalaire,
    primeAnciennete,
    primeRendement,
    indemniteTransport,
    indemniteLogement,
    autresPrimes,
    acomptesAvances,
    retenuesDiverses,
    heuresTravaillees,
    joursTravailles,
    notesCommentaires,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(preview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* En-tête */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">
                Ajuster les Éléments de Paie
              </h3>
              <p className="text-xs text-slate-400">
                {bulletin.employeNomComplet} ({bulletin.employeMatricule}) • Période : {bulletin.periodeLibelle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps formulaire */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Badge Tranche Légale Déterminée */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              preview.trancheLoi === 'MOINS_DE_60K'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : preview.trancheLoi === 'EGAL_60K'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-purple-50 border-purple-200 text-purple-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-bold text-xs uppercase tracking-wider">
                  Tranche Légale : {preview.trancheLibelle}
                </span>
                <p className="text-[11px] text-slate-600">
                  {preview.explicationLegale}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Base Contractuelle</span>
              <span className="font-mono font-bold text-sm">{bulletin.salaireBase.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>

          {/* Section 1 : Variables de Gains */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Gains Variables & Primes du Mois (FCFA)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Salaire de Base / Assiette Cotisable CNPS (FCFA)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="5000"
                  value={salaireBase}
                  onChange={(e) => setSalaireBase(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-bold bg-white text-slate-900"
                  placeholder="60000"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Montant de référence légal par défaut : <strong>60 000 FCFA</strong> (franchise fiscale DGI et base de calcul CNPS Cameroun).
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Sursalaire conventionnel
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={sursalaire}
                  onChange={(e) => setSursalaire(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Prime de rendement / technicité
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={primeRendement}
                  onChange={(e) => setPrimeRendement(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Indemnité de transport
                  <span className="text-[10px] text-slate-400 font-normal ml-1">(Exonéré max 30 000 F)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={indemniteTransport}
                  onChange={(e) => setIndemniteTransport(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Autres primes (Panier, responsabilité)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={autresPrimes}
                  onChange={(e) => setAutresPrimes(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Section 2 : Déductions & Acomptes */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
              <Calculator className="w-4 h-4 text-rose-600" />
              Acomptes & Déductions exceptionnelles (FCFA)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Acomptes ou Avances sur salaire versés
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={acomptesAvances}
                  onChange={(e) => setAcomptesAvances(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 font-mono text-rose-700"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Retenues diverses (Prêts, retards)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={retenuesDiverses}
                  onChange={(e) => setRetenuesDiverses(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 font-mono text-rose-700"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Section 3 : Observations */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Observations / Notes justificatives du DAF
            </label>
            <input
              type="text"
              value={notesCommentaires}
              onChange={(e) => setNotesCommentaires(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="Ex: Prime exceptionnelle de fin de trimestre accordée par la Direction..."
            />
          </div>

          {/* Synthèse Temps Réel */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider block">
              Simulation en Temps Réel selon la Loi :
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Total Brut</span>
                <span className="font-bold font-mono text-sm text-slate-900">
                  {preview.totalGainsBruts.toLocaleString('fr-FR')} F
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">CNPS + CMU</span>
                <span className="font-bold font-mono text-sm text-rose-600">
                  -{preview.totalRetenuesSocialesSalariales.toLocaleString('fr-FR')} F
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Impôt ITS</span>
                <span className="font-bold font-mono text-sm text-rose-600">
                  {preview.itsSalariale > 0 ? `-${preview.itsSalariale.toLocaleString('fr-FR')} F` : '0 F (Exonéré)'}
                </span>
              </div>
              <div className="bg-emerald-600 text-white p-2.5 rounded-lg">
                <span className="text-emerald-100 block text-[11px]">Net à Payer</span>
                <span className="font-extrabold font-mono text-base">
                  {preview.netAPayer.toLocaleString('fr-FR')} F
                </span>
              </div>
            </div>
          </div>

          {/* Boutons actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm font-semibold transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les Modifications</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
