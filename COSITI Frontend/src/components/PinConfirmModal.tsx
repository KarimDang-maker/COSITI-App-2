import React, { useState } from 'react';
import { Lock, AlertTriangle, ShieldCheck, X, Loader2 } from 'lucide-react';
import { auth, errorMessage as messageErreur } from '../api/client';

interface PinConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  actionType?: 'modification' | 'suppression' | 'action';
  onConfirm: (code: string) => void;
  onCancel: () => void;
  errorMessage?: string;
}

export const PinConfirmModal: React.FC<PinConfirmModalProps> = ({
  isOpen,
  title,
  description,
  actionType = 'action',
  onConfirm,
  onCancel,
  errorMessage,
}) => {
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState('');
  const [checking, setChecking] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setLocalError('Veuillez saisir le code de confirmation.');
      return;
    }
    // vérification par le serveur (le code est stocké haché dans la base ; les erreurs sont journalisées)
    setChecking(true);
    try {
      await auth.verifyCode(pin.trim());
    } catch (err) {
      setLocalError(messageErreur(err));
      return;
    } finally {
      setChecking(false);
    }
    setLocalError('');
    const code = pin.trim();
    setPin('');
    onConfirm(code);
  };

  const isDanger = actionType === 'suppression';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* En-tête */}
        <div
          className={`p-5 flex items-start justify-between ${
            isDanger ? 'bg-rose-50 border-b border-rose-100' : 'bg-emerald-50 border-b border-emerald-100'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl ${
                isDanger ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {isDanger ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            </div>
            <div>
              <h3 className={`text-base font-bold ${isDanger ? 'text-rose-900' : 'text-emerald-950'}`}>
                {title}
              </h3>
              <span className="text-xs text-slate-500 font-medium">Sécurité COSITI — Code requis</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            {description}
          </div>

          {isDanger && (
            <div className="flex items-start space-x-2 text-xs text-rose-800 bg-rose-50/80 p-3 rounded-xl border border-rose-200/70">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                <strong>Avertissement important :</strong> Cette action est irréversible et peut impacter
                l’historique des cotisations ou les dossiers liés.
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Code de confirmation obligatoire
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setLocalError('');
                }}
                placeholder="••••"
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 text-center text-lg font-mono font-bold tracking-widest bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 flex items-center justify-between px-1">
              <span>Code défini par la Direction dans les Paramètres</span>
              <span>4 chiffres</span>
            </p>
          </div>

          {(localError || errorMessage) && (
            <div className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {localError || errorMessage}
            </div>
          )}

          {/* Boutons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-sm font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer ${
                isDanger
                  ? 'bg-rose-600 hover:bg-rose-700 active:scale-98'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
              }`}
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin inline" /> : null} Confirmer l'opération
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
