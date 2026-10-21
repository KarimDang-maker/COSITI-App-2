import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { Adherent } from '../types';
import { formatFCFA } from '../utils/helpers';
import { X, BadgeCheck, Shield, CheckCircle2, Sparkles } from 'lucide-react';

interface ImmatriculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  adherent: Adherent | null;
}

export const ImmatriculationModal: React.FC<ImmatriculationModalProps> = ({
  isOpen,
  onClose,
  adherent,
}) => {
  const { cotisations, parametres, immatriculerAdherent, statsOf } = useApp();
  const dialog = useDialog();

  const [numeroCnps, setNumeroCnps] = useState('');
  const [dateImmatriculation, setDateImmatriculation] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [observations, setObservations] = useState('');

  useEffect(() => {
    if (adherent) {
      setNumeroCnps(adherent.numeroCnps || '');
      setDateImmatriculation(
        adherent.dateImmatriculation || new Date().toISOString().slice(0, 10)
      );
      setObservations(
        adherent.observations || 'Immatriculation effectuée suite à l\'atteinte du seuil de cotisation de 15 000 FCFA.'
      );
    }
  }, [adherent, isOpen]);

  if (!isOpen || !adherent) return null;

  const stats = statsOf(adherent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroCnps.trim()) {
      await dialog.alert({
        title: 'Numéro CNPS requis',
        message: 'Veuillez saisir le numéro d\'immatriculation CNPS attribué par l\'institution.',
        variant: 'warning',
      });
      return;
    }

    const res = await immatriculerAdherent(
      adherent.id,
      numeroCnps.trim(),
      dateImmatriculation,
      observations.trim()
    );

    if (res.success) {
      onClose();
    } else {
      await dialog.alert({
        title: 'Erreur d\'immatriculation',
        message: res.error || 'Erreur lors de l\'immatriculation',
        variant: 'error',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Validation d'immatriculation CNPS
              </h3>
              <p className="text-xs text-emerald-300">
                Seuil de cotisation de 15 000 FCFA vérifié
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-400 hover:text-white p-1 rounded-lg hover:bg-emerald-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Situation de l'adhérent */}
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-xs text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded">
                  {adherent.matricule}
                </span>
                <span className="font-bold text-emerald-950 ml-2">
                  {adherent.nom} {adherent.prenom}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">{adherent.profession}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/70">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">
                  Cotisations cumulées
                </span>
                <span className="font-mono font-bold text-sm text-emerald-900">
                  {formatFCFA(stats.totalCumule)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">
                  Seuil réglementaire
                </span>
                <span className="font-bold text-sm text-slate-800">
                  {formatFCFA(parametres.seuilImmatriculation)} (Atteint)
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Numéro matricule CNPS (Renseigné par l'agent enregistreur) *
            </label>
            <input
              type="text"
              required
              value={numeroCnps}
              onChange={(e) => setNumeroCnps(e.target.value)}
              placeholder="Saisir le matricule CNPS (ex: 2026-98432)"
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-500">
              Numéro matricule officiel renseigné par l'agent enregistreur de la coopérative.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Date d'immatriculation *
            </label>
            <input
              type="date"
              required
              value={dateImmatriculation}
              onChange={(e) => setDateImmatriculation(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Observations administratives
            </label>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start space-x-2 text-xs text-blue-900">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Activation automatique :</strong> L'immatriculation activera immédiatement
              la création et le suivi du <strong>dossier d'allocations familiales</strong> pour cet adhérent.
            </span>
          </div>

          {/* Boutons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer active:scale-98"
            >
              Enregistrer l'immatriculation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
