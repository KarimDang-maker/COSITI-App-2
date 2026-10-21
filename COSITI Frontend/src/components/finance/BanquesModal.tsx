import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import { Building2, Plus, Trash2, X, AlertCircle, RotateCcw, CheckCircle2, ShieldCheck } from 'lucide-react';

interface BanquesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BanquesModal: React.FC<BanquesModalProps> = ({ isOpen, onClose }) => {
  const { banques, addBanque, deleteBanque, resetBanques, versements, currentUser } = useApp();
  const dialog = useDialog();

  const [nouvelleBanque, setNouvelleBanque] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleAjouter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const nom = nouvelleBanque.trim();
    if (!nom) {
      setErrorMessage('Veuillez renseigner le nom de la banque.');
      return;
    }

    const res = await addBanque(nom);
    if (!res.success) {
      setErrorMessage(res.error || "Impossible d'ajouter cette banque.");
      return;
    }

    setSuccessMessage(`La banque "${nom}" a été ajoutée avec succès au catalogue.`);
    setNouvelleBanque('');
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const handleSupprimer = async (nomBanque: string) => {
    setErrorMessage('');
    setSuccessMessage('');

    // Compter combien de versements historiques utilisent cette banque
    const nbVersementsAssocies = versements.filter(
      (v) => (v.banque || '').toLowerCase() === nomBanque.toLowerCase()
    ).length;

    const messageDetails = nbVersementsAssocies > 0
      ? `Cette banque est associée à ${nbVersementsAssocies} versement(s) déjà enregistré(s). Conformément aux règles de gestion, sa suppression la retirera uniquement de la liste des choix pour les futurs versements, SANS MODIFIER NI ALTÉRER les données historiques déjà enregistrées.`
      : `Voulez-vous retirer "${nomBanque}" de la liste des banques partenaires ?`;

    const confirmed = await dialog.confirm({
      title: `Supprimer la banque : ${nomBanque}`,
      message: messageDetails,
      confirmText: 'Confirmer la suppression',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash',
      details: [
        { label: 'Banque ciblée', value: nomBanque },
        { label: 'Versements existants préservés', value: `${nbVersementsAssocies} versement(s)` },
        { label: 'Action DAF', value: 'Retrait du catalogue actif' },
      ],
    });

    if (confirmed) {
      const res = await deleteBanque(nomBanque);
      if (!res.success) {
        setErrorMessage(res.error || 'Erreur lors de la suppression de la banque.');
      } else {
        setSuccessMessage(`La banque "${nomBanque}" a été retirée de la liste active.`);
        setTimeout(() => setSuccessMessage(''), 3500);
      }
    }
  };

  const handleRestaurerDefauts = async () => {
    const confirmed = await dialog.confirm({
      title: 'Restaurer la liste des banques par défaut',
      message: 'Voulez-vous réinitialiser le catalogue des banques avec les institutions partenaires de référence de Côte d\'Ivoire (BICICI, Ecobank, SGCI, BOA CI, NSIA, BNI, Coris Bank...) ? Les versements déjà enregistrés resteront intacts.',
      confirmText: 'Restaurer',
      cancelText: 'Annuler',
      variant: 'warning',
    });

    if (confirmed) {
      resetBanques();
      setSuccessMessage('Le catalogue des banques partenaires a été réinitialisé.');
      setTimeout(() => setSuccessMessage(''), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* En-tête */}
        <div className="px-6 py-4 bg-blue-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-800/80 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Gestion des Banques Partenaires
              </h3>
              <p className="text-xs text-blue-200 mt-0.5 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                <span>Espace DAF • Gestion dynamique des institutions bancaires</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-blue-800/50 cursor-pointer transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps modal scrollable */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Note de conformité sur l'intégrité des données */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Intégrité stricte des données enregistrées :</span>
              <p className="text-blue-800/90 leading-relaxed">
                L'ajout ou la suppression d'une banque est strictement sans impact sur les versements passés. Les versements historiques déjà enregistrés conservent intégralement leur nom de banque, montant et bordereau d'origine.
              </p>
            </div>
          </div>

          {/* Messages de statut */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Formulaire d'ajout rapide pour le DAF */}
          <form onSubmit={handleAjouter} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ajouter une nouvelle banque
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={nouvelleBanque}
                  onChange={(e) => setNouvelleBanque(e.target.value)}
                  placeholder="Ex: UBA Côte d'Ivoire, Bridge Bank, Stanbic Bank..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-xs cursor-pointer transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              La banque sera immédiatement disponible dans le sélecteur des versements en banque.
            </p>
          </form>

          {/* Liste des banques actuellement actives */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Banques partenaires actives ({banques.length})
              </span>
              <button
                type="button"
                onClick={handleRestaurerDefauts}
                className="text-[11px] font-semibold text-slate-500 hover:text-blue-700 flex items-center space-x-1 cursor-pointer transition-colors"
                title="Rétablir les banques partenaires initiales"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurer la liste par défaut</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-64 overflow-y-auto">
              {banques.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Aucune banque configurée. Cliquez sur "Restaurer la liste par défaut" ou ajoutez-en une.
                </div>
              ) : (
                banques.map((b) => {
                  const countVersements = versements.filter(
                    (v) => (v.banque || '').toLowerCase() === b.toLowerCase()
                  ).length;

                  return (
                    <div
                      key={b}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{b}</div>
                          <div className="text-xs text-slate-500 flex items-center space-x-2">
                            <span>
                              {countVersements} versement{countVersements > 1 ? 's' : ''} enregistré{countVersements > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSupprimer(b)}
                        title={`Supprimer ${b} de la liste`}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Pied modal */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-500">
            Connecté en tant que : <strong className="text-slate-700">{currentUser?.nom || 'DAF'}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors shadow-2xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
