import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { DossierAllocations, StatutDossierAllocations, PieceDossier } from '../types';
import { formatDateShort } from '../utils/helpers';
import { BrancheCnps, BRANCHES_CNPS, getBrancheConfig } from '../data/cnpsBranches';
import {
  X,
  FolderHeart,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  FileCheck,
  Calendar,
  GraduationCap,
  History,
  AlertTriangle,
  Eye,
  RefreshCw,
  UserX,
  Info,
} from 'lucide-react';
import { getUserPermissions } from '../utils/permissions';

interface DossierAllocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossier: DossierAllocations | null;
}

export const DossierAllocationsModal: React.FC<DossierAllocationsModalProps> = ({
  isOpen,
  onClose,
  dossier,
}) => {
  const { updateDossier, parametres, currentUser } = useApp();
  const dialog = useDialog();
  const permissions = getUserPermissions(currentUser);

  const [statut, setStatut] = useState<StatutDossierAllocations>('Dossier en cours');
  const [branche, setBranche] = useState<BrancheCnps>('PRESTATIONS_FAMILIALES');
  const [sousRubriqueOffre, setSousRubriqueOffre] = useState<string>('');
  const [pieces, setPieces] = useState<PieceDossier[]>([]);
  const [nombreEnfants, setNombreEnfants] = useState<number>(0);
  const [sansEnfant, setSansEnfant] = useState<boolean>(false);
  const [certificatsScolariteFournis, setCertificatsScolariteFournis] = useState<boolean>(false);
  const [dateDepot, setDateDepot] = useState<string>('');
  const [dateTransmission, setDateTransmission] = useState<string>('');
  const [dateRelance, setDateRelance] = useState<string>('');
  const [observations, setObservations] = useState<string>('');

  useEffect(() => {
    if (dossier) {
      setStatut(dossier.statut);
      setBranche(dossier.branche || 'PRESTATIONS_FAMILIALES');
      setSousRubriqueOffre(dossier.sousRubriqueOffre || 'Allocations Familiales (Enfants scolarisés & à charge)');
      setPieces(dossier.pieces || []);
      setNombreEnfants(dossier.nombreEnfants || 0);
      setSansEnfant(Boolean(dossier.sansEnfant || dossier.statut === 'Sans enfant (Non éligible allocations)'));
      setCertificatsScolariteFournis(dossier.certificatsScolariteFournis || false);
      setDateDepot(dossier.dateDepot || '');
      setDateTransmission(dossier.dateTransmission || '');
      setDateRelance(dossier.dateRelance || '');
      setObservations(dossier.observations || '');
    }
  }, [dossier, isOpen]);

  if (!isOpen || !dossier) return null;

  const currentBrancheConfig = getBrancheConfig(branche);

  const handleTogglePiece = (pieceId: string) => {
    if (!permissions.canManageDossiers) return;
    const updated = pieces.map((p) => {
      if (p.id === pieceId) {
        const nextRecu = !p.recu;
        return {
          ...p,
          recu: nextRecu,
          dateReception: nextRecu ? new Date().toISOString().slice(0, 10) : undefined,
        };
      }
      return p;
    });

    setPieces(updated);

    // Si c'est la pièce des certificats de scolarité
    const scolaritePiece = updated.find((p) => p.id === 'p6');
    if (scolaritePiece) {
      setCertificatsScolariteFournis(scolaritePiece.recu);
    }
  };

  const handleNotesPiece = (pieceId: string, notes: string) => {
    if (!permissions.canManageDossiers) return;
    setPieces((prev) =>
      prev.map((p) => (p.id === pieceId ? { ...p, notes } : p))
    );
  };

  const handleToggleSansEnfant = (checked: boolean) => {
    if (!permissions.canManageDossiers) return;
    setSansEnfant(checked);
    if (checked) {
      setNombreEnfants(0);
      setCertificatsScolariteFournis(false);
      setStatut('Sans enfant (Non éligible allocations)');
      // Assouplir les pièces relatives aux enfants
      setPieces((prev) =>
        prev.map((p) => {
          const isEnfantPiece =
            p.id === 'p5' ||
            p.id === 'p6' ||
            p.id === 'p7' ||
            p.id === 'pf-2' ||
            p.id === 'pf-5' ||
            p.id === 'pf-6' ||
            p.nom.toLowerCase().includes('enfant') ||
            p.nom.toLowerCase().includes('scolarité') ||
            p.nom.toLowerCase().includes('scolarite');
          return isEnfantPiece
            ? { ...p, obligatoire: false, notes: 'Non requis : Travailleur sans enfant à charge' }
            : p;
        })
      );
    } else {
      if (statut === 'Sans enfant (Non éligible allocations)') {
        setStatut('Dossier en cours');
      }
    }
  };

  // Pièces obligatoires manquantes (hors dispense si travailleur sans enfant)
  const piecesManquantes = pieces.filter((p) => {
    if (sansEnfant) {
      const isEnfantPiece =
        p.id === 'p5' ||
        p.id === 'p6' ||
        p.id === 'p7' ||
        p.id === 'pf-2' ||
        p.id === 'pf-5' ||
        p.id === 'pf-6' ||
        p.nom.toLowerCase().includes('enfant') ||
        p.nom.toLowerCase().includes('scolarit');
      if (isEnfantPiece) return false;
    }
    return p.obligatoire && !p.recu;
  });
  const isComplet = piecesManquantes.length === 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageDossiers) return;

    // Suggestion de statut automatique si cohérent
    let newStatut = statut;
    if (sansEnfant) {
      newStatut = 'Sans enfant (Non éligible allocations)';
    } else if (isComplet && statut === 'Dossier incomplet') {
      newStatut = 'Dossier complet';
    } else if (!isComplet && (statut === 'Dossier complet' || statut === 'Dossier non commencé')) {
      newStatut = 'Dossier incomplet';
    }

    const res = await updateDossier(
      dossier.id,
      {
        statut: newStatut,
        branche,
        sousRubriqueOffre,
        pieces,
        nombreEnfants: sansEnfant ? 0 : nombreEnfants,
        sansEnfant,
        certificatsScolariteFournis: sansEnfant ? false : certificatsScolariteFournis,
        dateDepot: dateDepot || undefined,
        dateTransmission: dateTransmission || undefined,
        dateRelance: dateRelance || undefined,
        observations: observations.trim() || undefined,
      },
      `Mise à jour du dossier CNPS (${currentBrancheConfig.nom} - ${sousRubriqueOffre}) : ${newStatut}`
    );

    if (res.success) {
      onClose();
    } else {
      await dialog.alert({
        title: 'Erreur',
        message: res.error || 'Erreur lors de la mise à jour du dossier',
        variant: 'error',
      });
    }
  };

  const handleApplyOffrePieces = async (newOffreId: string) => {
    const offre = currentBrancheConfig.offres.find((o) => o.id === newOffreId);
    if (!offre) return;
    setSousRubriqueOffre(offre.nom);
    const confirmed = await dialog.confirm({
      title: 'Chargement des pièces justificatives',
      message: `Voulez-vous préremplir la liste réglementaire des pièces officielles pour « ${offre.nom} » ?`,
      confirmText: 'Charger la liste',
      cancelText: 'Conserver la liste actuelle',
      variant: 'info',
      icon: 'question',
      details: [
        { label: 'Offre CNPS', value: offre.nom },
        { label: 'Nombre de pièces', value: `${offre.piecesDefaut.length} pièce(s)` },
      ],
    });
    if (confirmed) {
      setPieces(
        offre.piecesDefaut.map((p) => ({
          id: p.id,
          nom: p.nom,
          obligatoire: p.obligatoire,
          recu: false,
        }))
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <FolderHeart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-xs bg-blue-950 text-blue-200 px-2 py-0.5 rounded border border-blue-800">
                  {dossier.matricule}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${currentBrancheConfig.couleurBadge}`}>
                  {currentBrancheConfig.nom}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                Dossier CNPS : {sousRubriqueOffre || 'Prestation'}
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                {dossier.adherentNomPrenom} • CNPS : {dossier.numeroCnps || 'En cours (renseigné par l\'agent)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-blue-300 hover:text-white p-1 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {!permissions.canManageDossiers && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center space-x-2.5">
              <Eye className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Profil {currentUser.role} (Accès Consultation) :</strong> Consultation détaillée du dossier et des pièces. La validation et la modification du dossier sont désactivées pour ce profil.
              </span>
            </div>
          )}

          {/* Configuration Rubrique & Sous-rubrique de l'offre */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rubrique CNPS *
                </label>
                <select
                  disabled={!permissions.canManageDossiers}
                  value={branche}
                  onChange={(e) => {
                    const newB = e.target.value as BrancheCnps;
                    setBranche(newB);
                    const cfg = getBrancheConfig(newB);
                    if (cfg.offres.length > 0) {
                      setSousRubriqueOffre(cfg.offres[0].nom);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {BRANCHES_CNPS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nom} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sous-rubrique : Offre CNPS *
                </label>
                <select
                  disabled={!permissions.canManageDossiers}
                  value={
                    currentBrancheConfig.offres.find((o) => o.nom === sousRubriqueOffre)?.id ||
                    currentBrancheConfig.offres[0]?.id
                  }
                  onChange={(e) => handleApplyOffrePieces(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {currentBrancheConfig.offres.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              {currentBrancheConfig.description}
            </p>
          </div>

          {/* Statut du dossier banner & Cas Travailleur sans enfant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            {/* Option Travailleur sans enfant */}
            <div className="col-span-1 sm:col-span-2 p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-start space-x-2.5">
                <UserX className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Travailleur sans enfant à charge (Dispense allocations familiales)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cochez cette option si l'adhérent n'a aucun enfant. Les pièces relatives aux enfants sont dispensées et l'alerte administrative sera automatiquement levée.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                <input
                  type="checkbox"
                  disabled={!permissions.canManageDossiers}
                  checked={sansEnfant}
                  onChange={(e) => handleToggleSansEnfant(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Statut actuel du dossier *
              </label>
              <select
                disabled={!permissions.canManageDossiers}
                value={statut}
                onChange={(e) => setStatut(e.target.value as StatutDossierAllocations)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              >
                {parametres.statutsDossiers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nombre d'enfants déclarés
              </label>
              <input
                type="number"
                min={0}
                max={20}
                disabled={!permissions.canManageDossiers || sansEnfant}
                value={sansEnfant ? 0 : nombreEnfants}
                onChange={(e) => setNombreEnfants(parseInt(e.target.value, 10) || 0)}
                placeholder={sansEnfant ? '0 (Sans enfant)' : '0'}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </div>

          {/* Si travailleur sans enfant */}
          {sansEnfant && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-xl text-xs flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
              <span>
                <strong>Statut Travailleur sans enfant validé :</strong> Les prestations familiales ne sont pas requises pour ce membre. Les pièces concernant les actes de naissance et certificats de scolarité des enfants sont désactivées. Ce dossier est considéré comme en règle vis-à-vis des alertes administratives.
              </span>
            </div>
          )}

          {/* Focus Règle Spécifique COSITI : Certificats de scolarité (pour Prestations Familiales) */}
          {branche === 'PRESTATIONS_FAMILIALES' && (
            <div
              className={`p-3.5 rounded-xl border flex items-start justify-between ${
                certificatsScolariteFournis
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-start space-x-2.5">
                <GraduationCap
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    certificatsScolariteFournis ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                />
                <div>
                  <span className="text-xs font-bold block uppercase tracking-wider">
                    Certificats de scolarité des enfants (Exigence COSITI / CNPS)
                  </span>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    Obligatoires pour le versement régulier des allocations scolaires annuelles.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={!permissions.canManageDossiers}
                onClick={() => {
                  if (!permissions.canManageDossiers) return;
                  const nextState = !certificatsScolariteFournis;
                  setCertificatsScolariteFournis(nextState);
                  setPieces((prev) =>
                    prev.map((p) =>
                      p.id === 'p6' || p.id === 'pf-5'
                        ? {
                            ...p,
                            recu: nextState,
                            dateReception: nextState
                              ? new Date().toISOString().slice(0, 10)
                              : undefined,
                          }
                        : p
                    )
                  );
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed ${
                  certificatsScolariteFournis
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                }`}
              >
                {certificatsScolariteFournis ? '✓ Fournis' : 'Non fournis'}
              </button>
            </div>
          )}

          {/* Liste des pièces à fournir */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Pièces constitutives du dossier ({pieces.filter((p) => p.recu).length}/{pieces.length})
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isComplet
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isComplet
                  ? 'Toutes les pièces requises sont réunies'
                  : `${piecesManquantes.length} pièce(s) manquante(s)`}
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {pieces.map((piece) => (
                <div
                  key={piece.id}
                  className={`p-3 text-xs transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    piece.recu ? 'bg-emerald-50/40' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start space-x-2.5">
                    <input
                      type="checkbox"
                      id={`piece-${piece.id}`}
                      checked={piece.recu}
                      disabled={!permissions.canManageDossiers}
                      onChange={() => handleTogglePiece(piece.id)}
                      className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 mt-0.5 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <label
                      htmlFor={`piece-${piece.id}`}
                      className={`cursor-pointer select-none ${!permissions.canManageDossiers ? 'cursor-default' : ''}`}
                    >
                      <span
                        className={`font-semibold ${
                          piece.recu ? 'text-emerald-950' : 'text-slate-800'
                        }`}
                      >
                        {piece.nom}
                      </span>
                      {piece.obligatoire && (
                        <span className="text-[10px] text-rose-600 font-bold ml-1.5">
                          * Requis
                        </span>
                      )}
                      {piece.dateReception && (
                        <span className="text-[10px] text-emerald-700 block">
                          Reçu le {formatDateShort(piece.dateReception)}
                        </span>
                      )}
                    </label>
                  </div>

                  <div className="sm:w-56">
                    <input
                      type="text"
                      disabled={!permissions.canManageDossiers}
                      value={piece.notes || ''}
                      onChange={(e) => handleNotesPiece(piece.id, e.target.value)}
                      placeholder="Note, référence ou relance..."
                      className="w-full px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dates clés */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Date dépôt à la COSITI
              </label>
              <input
                type="date"
                disabled={!permissions.canManageDossiers}
                value={dateDepot}
                onChange={(e) => setDateDepot(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Date transmission CNPS
              </label>
              <input
                type="date"
                disabled={!permissions.canManageDossiers}
                value={dateTransmission}
                onChange={(e) => setDateTransmission(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Prochaine relance
              </label>
              <input
                type="date"
                disabled={!permissions.canManageDossiers}
                value={dateRelance}
                onChange={(e) => setDateRelance(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observations administratives & Suivi
            </label>
            <textarea
              rows={2}
              disabled={!permissions.canManageDossiers}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Notes de suivi, appels passés à l'adhérent, bordereau CNPS..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          {/* Historique des modifications du dossier */}
          {dossier.historique && dossier.historique.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <History className="w-3 h-3" />
                <span>Journal d'activité du dossier</span>
              </span>
              <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                {dossier.historique.map((h, i) => (
                  <div key={i} className="flex items-start justify-between">
                    <span>
                      <strong className="text-slate-800">{h.auteur} :</strong> {h.action}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono ml-2 shrink-0">
                      {h.date}
                    </span>
                  </div>
                ))}
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
              Fermer
            </button>
            {permissions.canManageDossiers ? (
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer active:scale-98"
              >
                Enregistrer le dossier
              </button>
            ) : (
              <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-medium">
                Lecture seule ({currentUser.role})
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
