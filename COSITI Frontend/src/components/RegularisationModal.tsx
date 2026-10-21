import React, { useState, useEffect } from 'react';
import {
  X,
  Scale,
  ShieldCheck,
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  Adherent,
  Cotisation,
  ModePaiement,
  StatutAdherent,
  TypeRegularisationCotisation,
} from '../types';
import { canUserRegulariser } from '../utils/permissions';

interface RegularisationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAdherentId?: string | null;
  targetCotisationId?: string | null;
}

export const RegularisationModal: React.FC<RegularisationModalProps> = ({
  isOpen,
  onClose,
  targetAdherentId,
  targetCotisationId,
}) => {
  const {
    adherents,
    cotisations,
    currentUser,
    regulariserCotisation,
    updateAdherentStatut,
    parametres,
  } = useApp();

  const isHabilite = canUserRegulariser(currentUser);

  // État du formulaire
  const [selectedAdherentId, setSelectedAdherentId] = useState<string>('');
  const [selectedCotisationId, setSelectedCotisationId] = useState<string>('');
  const [modeAction, setModeAction] = useState<'NOUVELLE' | 'COMPLEMENT_EXISTANT'>('NOUVELLE');
  const [typeRegularisation, setTypeRegularisation] = useState<TypeRegularisationCotisation>(
    'Complément de montant antérieur'
  );

  // Données financières
  const [montant, setMontant] = useState<number>(0);
  const [montantComplementaire, setMontantComplementaire] = useState<number>(0);
  const [modePaiement, setModePaiement] = useState<ModePaiement>('Espèces');
  const [datePaiement, setDatePaiement] = useState<string>('');
  const [mois, setMois] = useState<string>('Juillet');
  const [annee, setAnnee] = useState<number>(2024);
  const [reference, setReference] = useState<string>('');
  const [motif, setMotif] = useState<string>('');
  const [observations, setObservations] = useState<string>('');

  // Modification statut adhérent conjointe
  const [modifierStatutConjoint, setModifierStatutConjoint] = useState<boolean>(true);
  const [nouveauStatut, setNouveauStatut] = useState<StatutAdherent>('Actif');

  // Sécurité & Feedback
  const [codeConfirmation, setCodeConfirmation] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [rechercheAdherent, setRechercheAdherent] = useState<string>('');

  const listeMois = [
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

  // Initialisation à l'ouverture
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg('');
    setSuccessMsg('');
    setCodeConfirmation('');

    // Date du jour par défaut mais modifiable pour rétroactivité
    const today = new Date().toISOString().split('T')[0];
    setDatePaiement(today);

    if (targetCotisationId) {
      const cot = cotisations.find((c) => c.id === targetCotisationId);
      if (cot) {
        setSelectedCotisationId(cot.id);
        setSelectedAdherentId(cot.adherentId);
        setModeAction('COMPLEMENT_EXISTANT');
        setTypeRegularisation('Complément de montant antérieur');
        setMontant(cot.montant);
        setMontantComplementaire(0);
        setModePaiement(cot.modePaiement);
        setDatePaiement(cot.datePaiement);
        setMois(cot.mois || 'Juillet');
        setAnnee(cot.annee || 2024);
        setReference(`REG-${cot.reference || 'ANT'}`);
        setMotif(`Complément sur cotisation antérieure du ${cot.datePaiement}`);
        return;
      }
    }

    if (targetAdherentId) {
      setSelectedAdherentId(targetAdherentId);
      const adh = adherents.find((a) => a.id === targetAdherentId);
      if (adh) {
        setNouveauStatut(adh.statut === 'Actif' ? 'Actif' : 'Actif');
      }
    } else if (adherents.length > 0 && !selectedAdherentId) {
      setSelectedAdherentId(adherents[0].id);
    }
  }, [isOpen, targetAdherentId, targetCotisationId, adherents, cotisations]);

  const adherentSelectionne = adherents.find((a) => a.id === selectedAdherentId);
  const cotisationsDeLAdherent = cotisations.filter(
    (c) => c.adherentId === selectedAdherentId || (adherentSelectionne && c.matricule === adherentSelectionne.matricule)
  );

  // Mise à jour si l'utilisateur change la cotisation cible
  const handleCotisationChange = (cotId: string) => {
    setSelectedCotisationId(cotId);
    const cot = cotisations.find((c) => c.id === cotId);
    if (cot) {
      setMontant(cot.montant);
      setMontantComplementaire(0);
      setModePaiement(cot.modePaiement);
      setDatePaiement(cot.datePaiement);
      setMois(cot.mois || 'Juillet');
      setAnnee(cot.annee || 2024);
      setReference(`REG-${cot.reference || Date.now().toString().slice(-4)}`);
    }
  };

  const handleValiderRegularisation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isHabilite) {
      setErrorMsg('Seuls le DAF et la DGA (ainsi que le DG) sont autorisés à régulariser les cotisations antérieures.');
      return;
    }

    if (!selectedAdherentId || !adherentSelectionne) {
      setErrorMsg('Veuillez sélectionner un adhérent.');
      return;
    }

    if (!motif.trim()) {
      setErrorMsg('Le motif de la régularisation est obligatoire (exigence de traçabilité comptable).');
      return;
    }

    // Vérification du code de sécurité (0000 ou 1111 ou code paramétré)
    const pin = codeConfirmation.trim();
    const validCodes = ['0000', '1111', parametres.codeConfirmationSecurite];
    if (!validCodes.includes(pin)) {
      setErrorMsg('Code d\'autorisation requis incorrect (utiliser le code sécurisé 0000 ou 1111).');
      return;
    }

    let montantFinal = Number(montant);
    let initialMontant: number | undefined = undefined;
    let complementMontant: number | undefined = undefined;

    if (modeAction === 'COMPLEMENT_EXISTANT') {
      const cotDorigine = cotisations.find((c) => c.id === selectedCotisationId);
      if (cotDorigine) {
        initialMontant = cotDorigine.montant;
        complementMontant = Number(montantComplementaire);
        montantFinal = initialMontant + complementMontant;
      }
    }

    if (montantFinal <= 0) {
      setErrorMsg('Le montant de la cotisation doit être supérieur à zéro.');
      return;
    }

    // Exécution de la régularisation
    const res = await regulariserCotisation({
      cotisationId: modeAction === 'COMPLEMENT_EXISTANT' ? selectedCotisationId : undefined,
      adherentId: adherentSelectionne.id,
      matricule: adherentSelectionne.matricule,
      adherentNomPrenom: `${adherentSelectionne.nom} ${adherentSelectionne.prenom}`,
      montant: montantFinal,
      modePaiement,
      datePaiement,
      mois,
      annee: Number(annee),
      typeRegularisation,
      motifRegularisation: motif.trim(),
      montantAnterieurInitial: initialMontant,
      montantComplementaire: complementMontant,
      reference: reference.trim() || undefined,
      observations: observations.trim() || undefined,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Erreur lors de la régularisation.');
      return;
    }

    // Modification du statut de l'adhérent si cochée
    if (modifierStatutConjoint && adherentSelectionne.statut !== nouveauStatut) {
      updateAdherentStatut(
        adherentSelectionne.id,
        nouveauStatut,
        `Régularisation financière opérée par ${currentUser.nom} (${currentUser.role})`
      );
    }

    setSuccessMsg(
      `Régularisation enregistrée avec succès pour ${adherentSelectionne.nom} ${adherentSelectionne.prenom} (${adherentSelectionne.matricule}) pour un montant total de ${(montantFinal ?? 0).toLocaleString('fr-FR')} FCFA.`
    );

    setTimeout(() => {
      onClose();
    }, 1800);
  };

  if (!isOpen) return null;

  // Filtrage adhérents pour la recherche
  const adherentsFiltres = (adherents || []).filter((a) => {
    if (!a) return false;
    const q = (rechercheAdherent || '').toLowerCase().trim();
    if (!q) return true;
    const nom = (a.nom || '').toLowerCase();
    const prenom = (a.prenom || '').toLowerCase();
    const mat = (a.matricule || '').toLowerCase();
    const tel = (a.telephone || '').toLowerCase();
    return (
      nom.includes(q) ||
      prenom.includes(q) ||
      mat.includes(q) ||
      tel.includes(q)
    );
  });

  return (
    <div
      id="modal-regularisation-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="modal-regularisation-card"
        className="my-8 w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header Institutionnel */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 px-6 py-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 border border-white/20 shadow-inner">
              <Scale className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Régularisation des Cotisations</h2>
                <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-200 border border-amber-300/30">
                  DAF & DGA
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-1">
                Rectification rétroactive, rattrapage des arriérés depuis Juillet et actualisation du statut de l'adhérent
              </p>
            </div>
          </div>
          <button
            id="btn-fermer-modal-regularisation"
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Rappel Historique COSITI */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-start gap-3 text-xs text-amber-900">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-950">Cadre historique COSITI :</span> La coopérative a été créée en <strong>Juin</strong> et les cotisations des membres courent depuis <strong>Juillet</strong>. Cet outil permet au DAF et à la DGA de saisir les compléments antérieurs, les arriérés de paiement et d'aligner les dates effectives avec traçabilité complète au journal d'audit.
          </div>
        </div>

        {/* Corps du Formulaire */}
        <form onSubmit={handleValiderRegularisation} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Notifications Erreur / Succès */}
          {errorMsg && (
            <div
              id="regularisation-error-banner"
              className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              id="regularisation-success-banner"
              className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Habilitation & Opérateur en cours */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`h-4 w-4 ${isHabilite ? 'text-emerald-600' : 'text-red-500'}`} />
              <span className="font-medium text-slate-600">Autorité de régulation :</span>
              <span className="font-semibold text-slate-900">
                {currentUser.nom} ({currentUser.role})
              </span>
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isHabilite
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {isHabilite ? 'Habilité DAF / DGA' : 'Accès Restreint'}
            </span>
          </div>

          {/* Étape 1 : Sélection de l'Adhérent */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Adhérent concerné par la régularisation *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <input
                  id="recherche-adherent-input"
                  type="text"
                  placeholder="Rechercher par nom, matricule, tél..."
                  value={rechercheAdherent}
                  onChange={(e) => setRechercheAdherent(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <select
                  id="select-adherent-regularisation"
                  value={selectedAdherentId}
                  onChange={(e) => {
                    setSelectedAdherentId(e.target.value);
                    setSelectedCotisationId('');
                  }}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
                >
                  <option value="">-- Choisir un adhérent --</option>
                  {adherentsFiltres.map((adh) => (
                    <option key={adh.id} value={adh.id}>
                      {adh.matricule} - {adh.nom} {adh.prenom} ({adh.profession}) - [Statut: {adh.statut}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fiche récapitulative de l'adhérent sélectionné */}
            {adherentSelectionne && (
              <div className="mt-2 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-indigo-950">
                    {adherentSelectionne.nom} {adherentSelectionne.prenom}
                  </span>{' '}
                  <span className="text-slate-500">({adherentSelectionne.matricule})</span>
                  <span className="ml-2 text-slate-600">Tél: {adherentSelectionne.telephone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Statut actuel :</span>
                  <span className="font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                    {adherentSelectionne.statut}
                  </span>
                  <span className="text-slate-600">CNPS :</span>
                  <span className="font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    {adherentSelectionne.statutImmatriculation}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Étape 2 : Type de Régularisation & Mode Opératoire */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Nature et motif de l'opération *
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Type de régularisation
                </label>
                <select
                  id="select-type-regularisation"
                  value={typeRegularisation}
                  onChange={(e) => setTypeRegularisation(e.target.value as TypeRegularisationCotisation)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Complément de montant antérieur">
                    Complément de montant antérieur (versement incomplet)
                  </option>
                  <option value="Rattrapage arriérés (depuis Juillet)">
                    Rattrapage arriérés (mois manqué depuis Juillet)
                  </option>
                  <option value="Rectification rétroactive de date/montant">
                    Rectification rétroactive de date ou montant
                  </option>
                  <option value="Régularisation exceptionnelle DAF/DGA">
                    Régularisation exceptionnelle de Direction
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Mode opératoire
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModeAction('NOUVELLE');
                      setSelectedCotisationId('');
                    }}
                    className={`py-2 px-3 text-xs rounded-lg font-medium border text-center transition-all ${
                      modeAction === 'NOUVELLE'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Nouveau versement rétroactif
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModeAction('COMPLEMENT_EXISTANT');
                      if (cotisationsDeLAdherent.length > 0) {
                        handleCotisationChange(cotisationsDeLAdherent[0].id);
                      }
                    }}
                    disabled={cotisationsDeLAdherent.length === 0}
                    className={`py-2 px-3 text-xs rounded-lg font-medium border text-center transition-all disabled:opacity-40 ${
                      modeAction === 'COMPLEMENT_EXISTANT'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Compléter versement existant ({cotisationsDeLAdherent.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Si modification d'une cotisation existante */}
            {modeAction === 'COMPLEMENT_EXISTANT' && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Sélectionner la cotisation antérieure à compléter ou rectifier :
                </label>
                <select
                  id="select-cotisation-a-completer"
                  value={selectedCotisationId}
                  onChange={(e) => handleCotisationChange(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white"
                >
                  <option value="">-- Choisir une cotisation antérieure --</option>
                  {cotisationsDeLAdherent.map((cot) => (
                    <option key={cot.id} value={cot.id}>
                      {cot.datePaiement} — {(cot.montant ?? 0).toLocaleString('fr-FR')} FCFA ({cot.mois} {cot.annee}) — Réf: {cot.reference || 'N/A'} [{cot.modePaiement}]
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-xs text-slate-500">Montant initial versé :</span>
                    <div className="text-base font-bold text-slate-800">
                      {(Number(montant) || 0).toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-indigo-900 mb-1">
                      Montant complémentaire à ajouter (FCFA) :
                    </label>
                    <input
                      id="montant-complementaire-input"
                      type="number"
                      min="0"
                      step="50"
                      value={montantComplementaire || ''}
                      onChange={(e) => setMontantComplementaire(Number(e.target.value))}
                      placeholder="Ex: 500"
                      className="w-full text-sm font-semibold rounded-lg border border-indigo-300 px-3 py-2 bg-white text-indigo-950 focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="text-xs text-emerald-700 font-medium mt-1">
                      Nouveau total qui sera enregistré : {(Number(montant || 0) + Number(montantComplementaire || 0)).toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Étape 3 : Détails Financiers et Période Rétroactive */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              3. Période rétroactive & Modalités financières *
            </label>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {modeAction === 'NOUVELLE' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Montant régularisé (FCFA) *
                  </label>
                  <input
                    id="montant-regularise-input"
                    type="number"
                    min="100"
                    step="50"
                    value={montant || ''}
                    onChange={(e) => setMontant(Number(e.target.value))}
                    placeholder="Ex: 1000"
                    className="w-full text-sm font-bold rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Mois concerné *
                </label>
                <select
                  id="select-mois-regularisation"
                  value={mois}
                  onChange={(e) => setMois(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2"
                >
                  {listeMois.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Année *
                </label>
                <input
                  id="annee-regularisation-input"
                  type="number"
                  min="2023"
                  max="2030"
                  value={annee}
                  onChange={(e) => setAnnee(Number(e.target.value))}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Date effective de paiement *
                </label>
                <input
                  id="date-paiement-effective-input"
                  type="date"
                  value={datePaiement}
                  onChange={(e) => setDatePaiement(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Mode de paiement *
                </label>
                <select
                  id="select-mode-paiement-regularisation"
                  value={modePaiement}
                  onChange={(e) => setModePaiement(e.target.value as ModePaiement)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Orange Money">Orange Money</option>
                  <option value="MTN MoMo">MTN MoMo</option>
                  <option value="Wave">Wave</option>
                  <option value="Moov Money">Moov Money</option>
                  <option value="Virement Bancaire">Virement Bancaire</option>
                  <option value="Chèque">Chèque</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Référence du reçu / quittance de régularisation
                </label>
                <input
                  id="ref-quittance-input"
                  type="text"
                  placeholder="Ex: REG-2024-07-001"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Motif formel de la régularisation *
                </label>
                <input
                  id="motif-regularisation-input"
                  type="text"
                  placeholder="Ex: Arriérés juillet suite à création de la mutuelle en juin"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Observations complémentaires (optionnel)
              </label>
              <textarea
                id="observations-regularisation-input"
                rows={2}
                placeholder="Préciser tout détail utile pour le DAF, la DGA ou l'audit..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
          </div>

          {/* Étape 4 : Gestion Conjointe du Statut de l'Adhérent */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                4. Statut de l'Adhérent
              </label>
              <label className="flex items-center gap-2 text-xs text-indigo-900 font-semibold cursor-pointer">
                <input
                  id="toggle-modifier-statut"
                  type="checkbox"
                  checked={modifierStatutConjoint}
                  onChange={(e) => setModifierStatutConjoint(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Mettre à jour le statut lors de la régularisation
              </label>
            </div>

            {modifierStatutConjoint && (
              <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 flex flex-wrap items-center gap-4">
                <span className="text-xs text-slate-600">
                  Statut actuel :{' '}
                  <strong className="text-slate-900">{adherentSelectionne?.statut || 'N/A'}</strong>
                </span>
                <ArrowRight className="h-4 w-4 text-indigo-400" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-950">Nouveau statut :</span>
                  <select
                    id="select-nouveau-statut-adherent"
                    value={nouveauStatut}
                    onChange={(e) => setNouveauStatut(e.target.value as StatutAdherent)}
                    className="text-xs font-bold rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-indigo-900 shadow-sm"
                  >
                    <option value="Actif">Actif (À jour de cotisations)</option>
                    <option value="En cours de régularisation">En cours de régularisation</option>
                    <option value="En attente">En attente de validation</option>
                    <option value="Inactif">Inactif</option>
                    <option value="Suspendu">Suspendu</option>
                    <option value="Radié">Radié</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Étape 5 : Autorisation Sécurisée & Code */}
          <div className="pt-2 border-t border-slate-200">
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4" />
                  Validation de Direction (Code Requis : 0000 ou 1111)
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Cette régularisation sera immédiatement inscrite au journal d'audit avec visa DAF/DGA.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  id="input-code-autorisation-regularisation"
                  type="password"
                  maxLength={4}
                  placeholder="Code PIN"
                  value={codeConfirmation}
                  onChange={(e) => setCodeConfirmation(e.target.value)}
                  className="w-28 text-center text-sm font-mono tracking-widest px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Boutons d'Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              id="btn-annuler-regularisation"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              id="btn-valider-regularisation"
              type="submit"
              disabled={!isHabilite}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Enregistrer l'Acte de Régularisation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
