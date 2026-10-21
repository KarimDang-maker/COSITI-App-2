import React, { useState, useEffect } from 'react';
import { X, UserCheck, ShieldAlert, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Adherent, StatutAdherent } from '../types';
import { canUserChangeStatut } from '../utils/permissions';

interface StatutAdherentModalProps {
  isOpen: boolean;
  onClose: () => void;
  adherent: Adherent | null;
}

export const StatutAdherentModal: React.FC<StatutAdherentModalProps> = ({
  isOpen,
  onClose,
  adherent,
}) => {
  const { updateAdherentStatut, currentUser } = useApp();
  const [statut, setStatut] = useState<StatutAdherent>('Actif');
  const [motif, setMotif] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const isHabilite = canUserChangeStatut(currentUser);

  useEffect(() => {
    if (adherent) {
      setStatut(adherent.statut);
      setMotif('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [adherent, isOpen]);

  if (!isOpen || !adherent) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isHabilite) {
      setErrorMsg('Seuls le DAF, la DGA et la Direction Générale sont habilités à modifier le statut d\'un adhérent.');
      return;
    }

    if (!motif.trim()) {
      setErrorMsg('Veuillez préciser le motif de ce changement de statut (requis pour l\'audit interne).');
      return;
    }

    const res = await updateAdherentStatut(adherent.id, statut, motif.trim());
    if (!res.success) {
      setErrorMsg(res.error || 'Erreur lors du changement de statut.');
      return;
    }

    setSuccessMsg(`Le statut de ${adherent.nom} ${adherent.prenom} (${adherent.matricule}) a été mis à jour avec succès : "${statut}".`);
    setTimeout(() => {
      onClose();
    }, 1400);
  };

  const getStatutBadgeClass = (s: StatutAdherent) => {
    switch (s) {
      case 'Actif':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'En cours de régularisation':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'En attente':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Inactif':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Suspendu':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Radié':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div
      id="modal-statut-adherent-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
    >
      <div
        id="modal-statut-adherent-card"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* En-tête */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Modification du Statut Adhérent</h3>
              <p className="text-xs text-slate-300">
                Prérogative DAF / DGA / Direction Générale
              </p>
            </div>
          </div>
          <button
            id="btn-close-modal-statut"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-800">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Adhérent sélectionné */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-sm">
                {adherent.nom} {adherent.prenom}
              </span>
              <span className="font-mono text-slate-500">{adherent.matricule}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 pt-1">
              <span>Statut actuel :</span>
              <span className={`px-2 py-0.5 rounded-full font-semibold border text-xs ${getStatutBadgeClass(adherent.statut)}`}>
                {adherent.statut}
              </span>
            </div>
          </div>

          {/* Nouveau Statut */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Nouveau statut à appliquer *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  'Actif',
                  'En cours de régularisation',
                  'En attente',
                  'Inactif',
                  'Suspendu',
                  'Radié',
                ] as StatutAdherent[]
              ).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatut(s)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between ${
                    statut === s
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{s}</span>
                  {statut === s && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Motif formel */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Motif du changement *
            </label>
            <textarea
              id="motif-changement-statut"
              rows={3}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex: Régularisation des cotisations antérieures depuis Juillet complétée avec succès..."
              className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Signature de direction */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Opération signée au journal d'audit par <strong>{currentUser.nom}</strong> ({currentUser.role}).
            </span>
          </div>

          {/* Boutons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!isHabilite}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
            >
              Confirmer le Statut
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
