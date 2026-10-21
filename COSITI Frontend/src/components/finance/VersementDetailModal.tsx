import React from 'react';
import { VersementBancaire, Cotisation } from '../../types';
import type { PointArret } from '../../api/models';
import { Landmark, Building2, Calendar, User, FileText, CheckCircle2, X, ArrowRight, DollarSign } from 'lucide-react';

interface VersementDetailModalProps {
  versement: VersementBancaire | null;
  allVersements: VersementBancaire[];
  cotisations: Cotisation[];
  onClose: () => void;
  onEdit?: (vrs: VersementBancaire) => void;
}

export const VersementDetailModal: React.FC<VersementDetailModalProps> = ({
  versement,
  allVersements,
  cotisations,
  onClose,
  onEdit,
}) => {
  if (!versement) return null;

  // Repères (d'où part le versement / où il s'arrête) : calculés par le serveur et joints au versement
  const reperePrecedent: PointArret = versement.reperes?.precedent ?? {};
  const repereActuel: PointArret = versement.reperes?.actuel ?? {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* En-tête */}
        <div className="px-6 py-4 bg-blue-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-800/80 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base tracking-tight">
                  Bordereau : {versement.numeroBordereau}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-700/80 text-blue-100">
                  {versement.statut}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5 flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-300" />
                <span>{versement.banque}</span>
                <span>•</span>
                <Calendar className="w-3.5 h-3.5 text-blue-300" />
                <span>Date du versement : {versement.date}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-blue-800/50 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Montant principal versé */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                Montant total versé en banque
              </span>
              <div className="text-3xl font-black text-blue-950 mt-1">
                {(versement.montant || 0).toLocaleString('fr-FR')}{' '}
                <span className="text-lg font-bold text-blue-700">FCFA</span>
              </div>
            </div>
            <div className="text-xs text-blue-800/90 text-right space-y-1">
              <div>
                Source des fonds : <strong>{versement.sourceFonds}</strong>
              </div>
              <div>
                Déposant : <strong>{versement.deposant}</strong>
              </div>
              {versement.numeroCompte && (
                <div className="font-mono text-[11px] text-blue-900">
                  Compte : {versement.numeroCompte}
                </div>
              )}
            </div>
          </div>

          {/* SECTION CLÉ : SUIVI CHRONOLOGIQUE ET POINTS D'ARRÊT */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Suivi du point d'arrêt des cotisations (Traçabilité financière)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Carte 1 : Point d'arrêt du versement précédent */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full">
                    1. Repère du versement précédent
                  </span>
                </div>

                {reperePrecedent.estPremierVersement ? (
                  <div className="py-3 text-xs text-amber-800 italic">
                    Premier versement de la coopérative (Aucun versement antérieur).
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Date d'arrêt précédent :</span>
                      <strong className="text-slate-900 font-bold text-sm">
                        {reperePrecedent.date || '—'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Adhérent repère :</span>
                      <strong className="text-slate-900 font-bold">
                        {reperePrecedent.nom || '—'}
                      </strong>
                      {reperePrecedent.matricule && (
                        <span className="text-slate-500 font-mono ml-1">
                          ({reperePrecedent.matricule})
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Montant de la cotisation :</span>
                      <span className="text-amber-800 font-black text-sm">
                        {(reperePrecedent.montant ?? 0).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>

                    {reperePrecedent.bordereau && (
                      <div className="pt-1 text-[11px] text-amber-900/80 font-mono">
                        Bordereau préc. : {reperePrecedent.bordereau}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Carte 2 : Point d'arrêt de ce versement */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                    2. Arrêt de ce versement (Dernière cotisation)
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Date de cette dernière cotisation :</span>
                    <strong className="text-slate-900 font-bold text-sm">
                      {repereActuel.date || '—'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Nom de l'adhérent d'arrêt :</span>
                    <strong className="text-slate-900 font-bold">
                      {repereActuel.nom || '—'}
                    </strong>
                    {repereActuel.matricule && (
                      <span className="text-slate-500 font-mono ml-1">
                        ({repereActuel.matricule})
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Montant cotisation d'arrêt :</span>
                    <span className="text-emerald-800 font-black text-sm">
                      {(repereActuel.montant ?? 0).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>

                  {repereActuel.reference && (
                    <div className="pt-1 text-[11px] text-emerald-900/80 font-mono">
                      Reçu / Réf : {repereActuel.reference}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Continuité visuelle */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center justify-between">
              <span className="font-semibold text-slate-600">Continuité assurée pour le prochain versement :</span>
              <div className="flex items-center space-x-1.5 font-bold text-blue-900">
                <span>Le prochain versement repartira de</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                <span className="bg-blue-100 px-2 py-0.5 rounded-md font-mono text-[11px]">
                  {repereActuel.nom || 'Dernière cotisation'} ({repereActuel.date || 'Date d\'arrêt'})
                </span>
              </div>
            </div>
          </div>

          {/* Observations */}
          {versement.observations && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-600 block mb-1">Observations DAF :</span>
              <p className="text-slate-800 italic leading-relaxed">{versement.observations}</p>
            </div>
          )}
        </div>

        {/* Pied modal */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-500">
            Enregistré par : <strong>{versement.enregistrePar}</strong>
          </span>
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(versement);
                }}
                className="px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl cursor-pointer transition-colors"
              >
                Modifier le versement
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl cursor-pointer transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
