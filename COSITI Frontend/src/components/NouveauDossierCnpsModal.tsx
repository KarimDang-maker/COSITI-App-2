import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BrancheCnps, BRANCHES_CNPS, getBrancheConfig } from '../data/cnpsBranches';
import {
  X,
  FolderPlus,
  FolderHeart,
  ShieldAlert,
  Clock,
  CheckCircle2,
  FileCheck,
  Building,
} from 'lucide-react';

interface NouveauDossierCnpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBranche?: BrancheCnps;
  defaultOffreId?: string;
}

export const NouveauDossierCnpsModal: React.FC<NouveauDossierCnpsModalProps> = ({
  isOpen,
  onClose,
  defaultBranche = 'PRESTATIONS_FAMILIALES',
  defaultOffreId,
}) => {
  const { adherents, createDossierForAdherent } = useApp();

  const [selectedAdherentId, setSelectedAdherentId] = useState<string>('');
  const [branche, setBranche] = useState<BrancheCnps>(defaultBranche);
  const currentBrancheConfig = getBrancheConfig(branche);

  const [offreId, setOffreId] = useState<string>(
    defaultOffreId || currentBrancheConfig.offres[0]?.id || ''
  );
  const selectedOffre =
    currentBrancheConfig.offres.find((o) => o.id === offreId) ||
    currentBrancheConfig.offres[0];

  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleBrancheChange = (newBranche: BrancheCnps) => {
    setBranche(newBranche);
    const config = getBrancheConfig(newBranche);
    if (config.offres.length > 0) {
      setOffreId(config.offres[0].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdherentId) {
      setError('Veuillez sélectionner un adhérent.');
      return;
    }

    const res = await createDossierForAdherent(
      selectedAdherentId,
      branche,
      selectedOffre?.nom || selectedOffre?.id
    );

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Erreur lors de la création du dossier CNPS.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in duration-150">
        {/* En-tête */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Nouveau Dossier CNPS
              </h3>
              <p className="text-xs text-emerald-300">
                Constitution d'un dossier sous l'une des 3 rubriques CNPS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-400 hover:text-white p-1 rounded-lg hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* 1. Sélection de l'adhérent */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Adhérent concerné *
            </label>
            <select
              required
              value={selectedAdherentId}
              onChange={(e) => {
                setSelectedAdherentId(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="">-- Choisissez un adhérent immatriculé ou cotisant --</option>
              {adherents.map((adh) => (
                <option key={adh.id} value={adh.id}>
                  {adh.matricule} - {adh.nom} {adh.prenom} (
                  {adh.numeroCnps ? `CNPS: ${adh.numeroCnps}` : 'Sans CNPS'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Choix de la Rubrique CNPS */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. Rubrique CNPS principale *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {BRANCHES_CNPS.map((b) => {
                const isSelected = branche === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleBrancheChange(b.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${b.couleurBg} ${b.couleurBordure} ring-2 ring-emerald-500`
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs block text-slate-900">{b.nom}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                        {b.titreCourt}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${b.couleurBadge}`}>
                        {b.code}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Choix de la Sous-rubrique (Offre spécifique) */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              3. Sous-rubrique : Offre de prestation spécifique *
            </label>
            <select
              value={offreId}
              onChange={(e) => setOffreId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
            >
              {currentBrancheConfig.offres.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Fiche récapitulative de l'offre et des pièces requises */}
          {selectedOffre && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{selectedOffre.nom}</span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {selectedOffre.montantReference}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {selectedOffre.description}
              </p>
              <div className="pt-2 border-t border-slate-200">
                <div className="font-bold text-[10px] text-slate-500 uppercase mb-1">
                  Pièces justificatives requises ({selectedOffre.piecesDefaut.length}) :
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 pl-1">
                  {selectedOffre.piecesDefaut.map((p, i) => (
                    <div key={p.id || i} className="flex items-start space-x-1.5 text-[11px] text-slate-700">
                      <FileCheck className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">{p.nom} {p.obligatoire && <strong className="text-rose-600">*</strong>}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Créer le Dossier CNPS</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
