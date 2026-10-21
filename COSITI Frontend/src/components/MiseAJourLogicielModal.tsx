import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Lock, RefreshCw, X, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface MiseAJourLogicielModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenParametrageUsers?: () => void;
}

export const MiseAJourLogicielModal: React.FC<MiseAJourLogicielModalProps> = ({
  isOpen,
  onClose,
  onOpenParametrageUsers,
}) => {
  const { wipeAllDataForUpdate, currentUser } = useApp();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const isAuthorizedToUpdate = currentUser
    ? ['PCA', 'DG', 'DAF', 'DGA'].includes(currentUser.role)
    : false;

  if (!isAuthorizedToUpdate) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 border border-rose-200">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Habilitation Requise : PCA, DG et DAF
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Seules les personnes habilitées (<strong>le PCA, le DG et le DAF</strong>) sont autorisées à lancer la mise à jour du logiciel et la remise à zéro complète des données.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Veuillez saisir le mot de passe de mise à jour (1111).');
      return;
    }

    const res = await wipeAllDataForUpdate(password.trim());
    if (res.success) {
      setIsDone(true);
      setError('');
    } else {
      setError(res.error || 'Mot de passe incorrect. Le mot de passe requis est 1111.');
    }
  };

  const handleFinish = () => {
    setIsDone(false);
    setPassword('');
    setError('');
    onClose();
    if (onOpenParametrageUsers) {
      onOpenParametrageUsers();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-rose-200">
        {/* En-tête */}
        <div className="p-5 bg-gradient-to-r from-rose-900 via-rose-800 to-amber-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-700/80 rounded-xl text-white">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Mise à jour du Logiciel & Remise à zéro
              </h3>
              <p className="text-xs text-rose-200">
                Action sécurisée — Mot de passe requis : <strong>1111</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-rose-300 hover:text-white p-1 rounded-lg hover:bg-rose-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        {isDone ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-slate-900">
                Mise à jour et réinitialisation réussies !
              </h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Toutes les anciennes données (adhérents, cotisations, dossiers, alertes)
                ont été effacées avec succès. Le système est maintenant prêt pour un nouveau cycle.
              </p>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 text-left space-y-2">
              <div className="font-bold flex items-center space-x-1.5 text-emerald-800">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Étape suivante recommandée : Nouveau paramétrage</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Vous pouvez maintenant renseigner les informations des utilisateurs de votre équipe,
                leurs postes et leurs codes d'accès personnalisés.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={handleFinish}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Accéder au nouveau paramétrage des utilisateurs
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-xs text-rose-900">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-rose-950">Avertissement de mise à jour majeure :</div>
                <p className="leading-relaxed text-rose-800">
                  Cette opération effectue la <strong>mise à jour logicielle globale</strong> et{' '}
                  <strong>efface l'intégralité des données</strong> :
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-rose-800 text-[11px] font-medium pt-1">
                  <li>Tous les adhérents enregistrés</li>
                  <li>Toutes les cotisations et écritures de caisse</li>
                  <li>Tous les dossiers CNPS constitués</li>
                  <li>Le journal d'audit des opérations et alertes</li>
                </ul>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Mot de passe de mise à jour (1111) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  maxLength={6}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Saisissez 1111"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 text-center text-lg font-mono font-bold tracking-widest bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500 flex items-center justify-between px-1">
                <span>Mot de passe obligatoire : <strong className="text-rose-700 font-mono">1111</strong></span>
                <span>Confirmation requise</span>
              </p>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Boutons */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Mettre à jour & Tout effacer</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
