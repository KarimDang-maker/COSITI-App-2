import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { Cotisation, ModePaiement, Adherent } from '../types';
import { formatFCFA } from '../utils/helpers';
import {
  X,
  CreditCard,
  Shield,
  CheckCircle2,
  Search,
  AlertTriangle,
  User,
  UserCheck,
  RefreshCw,
  Check,
} from 'lucide-react';

interface CotisationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedAdherentId?: string | null;
  cotisationToEdit?: Cotisation | null;
  onSuccessCreated?: (newCotisation: Cotisation) => void;
  onRequestPinConfirm?: (action: () => void, title: string, desc: string) => void;
}

const MOIS_LIST = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const MODES_PAIEMENT: ModePaiement[] = [
  'Espèces',
  'Wave',
  'Orange Money',
  'MTN MoMo',
  'Moov Money',
  'Virement bancaire',
  'Chèque',
];

export const CotisationModal: React.FC<CotisationModalProps> = ({
  isOpen,
  onClose,
  preselectedAdherentId,
  cotisationToEdit,
  onSuccessCreated,
  onRequestPinConfirm,
}) => {
  const {
    adherents,
    cotisations,
    parametres,
    currentUser,
    addCotisation,
    updateCotisation,
    statsOf,
  } = useApp();
  const dialog = useDialog();

  const isEditing = Boolean(cotisationToEdit);

  const [selectedAdherentId, setSelectedAdherentId] = useState<string>('');
  const [adherentSearch, setAdherentSearch] = useState('');
  const [isSearchingAdherent, setIsSearchingAdherent] = useState(false);
  const [montant, setMontant] = useState<number>(700);
  const [customMontant, setCustomMontant] = useState<string>('700');
  const [modePaiement, setModePaiement] = useState<ModePaiement>('Espèces');
  const [reference, setReference] = useState('');
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().slice(0, 10));
  const [mois, setMois] = useState<string>(MOIS_LIST[new Date().getMonth()]);
  const [annee, setAnnee] = useState<number>(new Date().getFullYear());
  const [observations, setObservations] = useState('');

  // Initialisation à l'ouverture de la modale ou lors d'une modification
  useEffect(() => {
    if (!isOpen) {
      setSelectedAdherentId('');
      setAdherentSearch('');
      setIsSearchingAdherent(false);
      return;
    }

    if (cotisationToEdit) {
      setSelectedAdherentId(cotisationToEdit.adherentId);
      setMontant(cotisationToEdit.montant);
      setCustomMontant(String(cotisationToEdit.montant));
      setModePaiement(cotisationToEdit.modePaiement);
      setReference(cotisationToEdit.reference || '');
      setDatePaiement(cotisationToEdit.datePaiement);
      setMois(cotisationToEdit.mois);
      setAnnee(cotisationToEdit.annee);
      setObservations(cotisationToEdit.observations || '');
      setAdherentSearch('');
      setIsSearchingAdherent(false);
    } else {
      // Pour un nouvel encaissement : si un adhérent précis est présélectionné
      // on le charge, sinon on laisse le choix libre (vide) pour éviter toute confusion
      const initialAdhId = preselectedAdherentId || '';
      setSelectedAdherentId(initialAdhId);

      const foundAdh = initialAdhId ? adherents.find((a) => a.id === initialAdhId) : null;
      const defaultRate =
        foundAdh?.tarifJournalier || parametres?.montantsCotisationDefauts?.[0] || 700;
      setMontant(defaultRate);
      setCustomMontant(String(defaultRate));

      setModePaiement('Espèces');
      setReference('');
      setDatePaiement(new Date().toISOString().slice(0, 10));
      setMois(MOIS_LIST[new Date().getMonth()]);
      setAnnee(new Date().getFullYear());
      setObservations('');
      setAdherentSearch('');
      setIsSearchingAdherent(!initialAdhId);
    }
  }, [isOpen, cotisationToEdit, preselectedAdherentId]);

  // Filtrage intelligent des adhérents pour la recherche (placé avant tout return conditionnel pour respecter les Rules of Hooks)
  const filteredAdherents = useMemo(() => {
    if (!adherentSearch || !adherentSearch.trim()) return [];
    const q = (adherentSearch || '').toLowerCase().trim();
    return (adherents || []).filter((a) => {
      if (!a) return false;
      const mat = (a.matricule || '').toLowerCase();
      const nom = (a.nom || '').toLowerCase();
      const prenom = (a.prenom || '').toLowerCase();
      const tel = (a.telephone || '').toLowerCase();
      const prof = (a.profession || '').toLowerCase();
      return (
        mat.includes(q) ||
        nom.includes(q) ||
        prenom.includes(q) ||
        tel.includes(q) ||
        prof.includes(q)
      );
    });
  }, [adherents, adherentSearch]);

  if (!isOpen) return null;

  const selectedAdherent = adherents.find((a) => a.id === selectedAdherentId);
  const currentStats = selectedAdherent
    ? statsOf(selectedAdherent)
    : null;

  const handleSelectAdherent = (adhId: string) => {
    setSelectedAdherentId(adhId);
    setAdherentSearch('');
    setIsSearchingAdherent(false);
    const adh = adherents.find((a) => a.id === adhId);
    if (adh) {
      const defaultRate =
        adh.tarifJournalier || parametres?.montantsCotisationDefauts?.[0] || 700;
      setMontant(defaultRate);
      setCustomMontant(String(defaultRate));
    }
  };

  const handleClose = () => {
    setSelectedAdherentId('');
    setAdherentSearch('');
    setIsSearchingAdherent(false);
    onClose();
  };

  const handlePresetAmount = (val: number) => {
    setMontant(val);
    setCustomMontant(String(val));
  };

  const handleCustomAmountChange = (valStr: string) => {
    setCustomMontant(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setMontant(parsed);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAdherent) {
      await dialog.alert({
        title: 'Adhérent requis',
        message: 'Veuillez sélectionner un adhérent pour enregistrer la cotisation.',
        variant: 'warning',
      });
      return;
    }

    if (!montant || montant <= 0) {
      await dialog.alert({
        title: 'Montant invalide',
        message: 'Le montant de la cotisation doit être supérieur à zéro.',
        variant: 'warning',
      });
      return;
    }

    if (isEditing && cotisationToEdit) {
      if (onRequestPinConfirm) {
        onRequestPinConfirm(
          async () => {
            const res = await updateCotisation(
              cotisationToEdit.id,
              {
                montant,
                modePaiement,
                reference: reference.trim() || undefined,
                datePaiement,
                mois,
                annee,
                observations: observations.trim() || undefined,
              },
              '0000'
            );
            if (res.success) {
              onClose();
            } else {
              dialog.alert({
                title: 'Erreur',
                message: res.error || 'Erreur lors de la mise à jour',
                variant: 'error',
              });
            }
          },
          'Confirmation de modification de cotisation',
          `Vous modifiez une cotisation déjà enregistrée pour ${cotisationToEdit.matricule}. Code requis : 0000.`
        );
      }
    } else {
      const res = await addCotisation({
        adherentId: selectedAdherent.id,
        matricule: selectedAdherent.matricule,
        adherentNomPrenom: `${selectedAdherent.nom} ${selectedAdherent.prenom}`,
        datePaiement,
        montant,
        modePaiement,
        reference: reference.trim() || `REC-${Date.now().toString().slice(-6)}`,
        mois,
        annee,
        agentEnregistreur: currentUser.nom,
        observations: observations.trim() || undefined,
      });

      if (res.success && res.cotisation) {
        setSelectedAdherentId('');
        setAdherentSearch('');
        setIsSearchingAdherent(false);
        onClose();
        if (onSuccessCreated) {
          onSuccessCreated(res.cotisation);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-6">
        {/* En-tête */}
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? 'Modifier une cotisation' : 'Enregistrer une cotisation'}
              </h3>
              <p className="text-xs text-emerald-200">
                {isEditing
                  ? `Paiement ${cotisationToEdit?.matricule}`
                  : 'Encaissement et calcul automatique des droits'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Sélection de l'adhérent */}
          {!isEditing ? (
            <div className="space-y-2">
              {selectedAdherent && !isSearchingAdherent ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Adhérent sélectionné *
                  </label>
                  <div className="p-3 bg-emerald-50/90 border-2 border-emerald-500 rounded-xl flex items-center justify-between shadow-xs">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        {selectedAdherent.prenom.charAt(0)}
                        {selectedAdherent.nom.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-slate-900">
                            {selectedAdherent.nom} {selectedAdherent.prenom}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
                            {selectedAdherent.matricule}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-2">
                          <span>{selectedAdherent.profession || 'Adhérent COSITI'}</span>
                          <span>•</span>
                          <span>{selectedAdherent.telephone}</span>
                          <span>•</span>
                          <span className="font-bold text-emerald-800">
                            Tarif: {formatFCFA(selectedAdherent.tarifJournalier || 700)}/j
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchingAdherent(true);
                        setAdherentSearch('');
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center space-x-1 cursor-pointer shrink-0 ml-2"
                      title="Changer d'adhérent pour cette cotisation"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Changer</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Sélectionner l'Adhérent *
                    </label>
                    {selectedAdherent && (
                      <button
                        type="button"
                        onClick={() => setIsSearchingAdherent(false)}
                        className="text-[11px] text-slate-600 hover:text-slate-900 font-medium underline cursor-pointer"
                      >
                        Garder {selectedAdherent.nom} {selectedAdherent.prenom}
                      </button>
                    )}
                  </div>

                  {/* Champ de recherche rapide */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Rechercher par nom, prénom, matricule ou téléphone (ex: Kameni, Kuetche...)"
                      value={adherentSearch}
                      onChange={(e) => {
                        setAdherentSearch(e.target.value);
                        setIsSearchingAdherent(true);
                      }}
                      autoFocus={!selectedAdherent}
                      className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                    {adherentSearch && (
                      <button
                        type="button"
                        onClick={() => setAdherentSearch('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Résultats instantanés cliquables si recherche active */}
                  {adherentSearch.trim() && (
                    <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-md p-1.5 space-y-1">
                      {filteredAdherents.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500">
                          Aucun adhérent ne correspond à « {adherentSearch} »
                        </div>
                      ) : (
                        filteredAdherents.map((adh) => (
                          <div
                            key={adh.id}
                            onClick={() => handleSelectAdherent(adh.id)}
                            className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                              selectedAdherentId === adh.id
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold">
                                  {adh.nom} {adh.prenom}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 rounded text-slate-700">
                                  {adh.matricule}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {adh.profession || 'Adhérent'} • {adh.telephone} • Tarif:{' '}
                                {formatFCFA(adh.tarifJournalier || 700)}/j
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAdherent(adh.id);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-2xs cursor-pointer flex items-center space-x-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Choisir</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Liste déroulante complète */}
                  <div>
                    <select
                      value={selectedAdherentId}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSelectAdherent(e.target.value);
                        } else {
                          setSelectedAdherentId('');
                        }
                      }}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    >
                      <option value="">
                        -- Ou choisir dans la liste complète ({adherents.length} adhérents) --
                      </option>
                      {adherents.map((adh) => (
                        <option key={adh.id} value={adh.id}>
                          {adh.matricule} — {adh.nom} {adh.prenom} (
                          {adh.profession || 'Adhérent'} -{' '}
                          {formatFCFA(adh.tarifJournalier || 700)}/j)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Adhérent</span>
                <span className="text-xs font-bold text-slate-800">
                  {cotisationToEdit?.matricule} — {cotisationToEdit?.adherentNomPrenom}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                Fixé
              </span>
            </div>
          )}

          {/* Fiche récapitulatif situation adhérent */}
          {selectedAdherent && currentStats && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-emerald-950 flex items-center space-x-1.5">
                  <span>{selectedAdherent.matricule}</span>
                  <span>•</span>
                  <span>{selectedAdherent.nom} {selectedAdherent.prenom}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    currentStats.statutCotisation === 'À jour'
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {currentStats.statutCotisation}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-emerald-200/60">
                <div>
                  <span className="text-slate-500 block">Cumul actuel</span>
                  <span className="font-bold text-slate-900">
                    {formatFCFA(currentStats.totalCumule)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Jours cotisés</span>
                  <span className="font-bold text-slate-900">
                    {currentStats.nombreJoursCotises} jours
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Seuil Immatriculation</span>
                  <span className="font-bold text-emerald-800">
                    {currentStats.seuilAtteint
                      ? '✓ Seuil atteint (15k)'
                      : `Reste ${formatFCFA(currentStats.montantRestantPourSeuil)}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Montant avec boutons rapides prédéfinis */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Montant à encaisser (FCFA) *
            </label>

            {/* Boutons rapides */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => handlePresetAmount(700)}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  montant === 700
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                700 F <span className="text-[10px] font-normal block opacity-80">(1 jour)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePresetAmount(1000)}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  montant === 1000
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                1 000 F <span className="text-[10px] font-normal block opacity-80">(1 jour)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePresetAmount(4900)}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  montant === 4900
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                4 900 F <span className="text-[10px] font-normal block opacity-80">(7 jours)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePresetAmount(10000)}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  montant === 10000
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                10 000 F <span className="text-[10px] font-normal block opacity-80">(10 jours)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePresetAmount(15000)}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  montant === 15000
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                }`}
                title="Seuil total requis pour l'immatriculation CNPS"
              >
                15 000 F <span className="text-[10px] font-normal block text-emerald-700 font-semibold">★ Seuil</span>
              </button>
            </div>

            {/* Saisie manuelle du montant */}
            <div className="relative">
              <input
                type="number"
                step="100"
                required
                value={customMontant}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder="Montant en FCFA"
                className="w-full px-3 py-2.5 text-base font-extrabold text-emerald-950 font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">
                FCFA
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mode de paiement *
              </label>
              <select
                value={modePaiement}
                onChange={(e) => setModePaiement(e.target.value as ModePaiement)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {MODES_PAIEMENT.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Référence de paiement
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: WAVE-TX-9942, N° reçu..."
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Date de versement *
              </label>
              <input
                type="date"
                required
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mois
                </label>
                <select
                  value={mois}
                  onChange={(e) => setMois(e.target.value)}
                  className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {MOIS_LIST.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Année
                </label>
                <input
                  type="number"
                  value={annee}
                  onChange={(e) => setAnnee(parseInt(e.target.value, 10))}
                  className="w-full px-2 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Agent enregistreur
              </label>
              <input
                type="text"
                disabled
                value={`${currentUser.nom} (${currentUser.role})`}
                className="w-full px-3 py-2 text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-medium cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Observations & Notes de versement
              </label>
              <textarea
                rows={2}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ex: Paiement anticipé, rattrapage arriéré, appoint espèces..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {isEditing && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-xs text-amber-900">
              <Shield className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Contrôle de sécurité :</strong> Le code <strong>0000</strong> vous sera
                demandé pour enregistrer la modification de cette cotisation.
              </span>
            </div>
          )}

          {/* Boutons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer active:scale-98"
            >
              {isEditing ? 'Sauvegarder la cotisation' : 'Valider l’encaissement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
