import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { Adherent, Sexe, StatutAdherent } from '../types';
import { X, UserPlus, UserCheck, Shield, Sparkles, AlertCircle } from 'lucide-react';

interface AdherentModalProps {
  isOpen: boolean;
  onClose: () => void;
  adherentToEdit?: Adherent | null;
  onRequestPinConfirm?: (action: () => void, title: string, desc: string) => void;
}

export const AdherentModal: React.FC<AdherentModalProps> = ({
  isOpen,
  onClose,
  adherentToEdit,
  onRequestPinConfirm,
}) => {
  const { addAdherent, updateAdherent, parametres, currentUser, gestionnaires } = useApp();
  const dialog = useDialog();

  const isEditing = Boolean(adherentToEdit);

  // Form states
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [sexe, setSexe] = useState<Sexe>('M');
  const [dateNaissance, setDateNaissance] = useState('');
  const [lieuNaissance, setLieuNaissance] = useState('');
  const [cni, setCni] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [profession, setProfession] = useState('');
  const [dateAdhesion, setDateAdhesion] = useState(new Date().toISOString().slice(0, 10));
  const [statut, setStatut] = useState<StatutAdherent>('Actif');
  const [tarifJournalier, setTarifJournalier] = useState<number>(700);
  const [observations, setObservations] = useState('');
  const [numeroCnps, setNumeroCnps] = useState('');
  const [gestionnaireId, setGestionnaireId] = useState<string>('');
  const [sansEnfant, setSansEnfant] = useState<boolean>(false);
  const [nombreEnfants, setNombreEnfants] = useState<number>(0);

  // Initialiser lors de l'ouverture ou du changement d'adhérent
  useEffect(() => {
    if (adherentToEdit) {
      setNom(adherentToEdit.nom);
      setPrenom(adherentToEdit.prenom);
      setSexe(adherentToEdit.sexe);
      setDateNaissance(adherentToEdit.dateNaissance || '');
      setLieuNaissance(adherentToEdit.lieuNaissance || '');
      setCni(adherentToEdit.cni || '');
      setTelephone(adherentToEdit.telephone || '');
      setAdresse(adherentToEdit.adresse || '');
      setProfession(adherentToEdit.profession || '');
      setDateAdhesion(adherentToEdit.dateAdhesion || new Date().toISOString().slice(0, 10));
      setStatut(adherentToEdit.statut);
      setTarifJournalier(adherentToEdit.tarifJournalier || 700);
      setObservations(adherentToEdit.observations || '');
      setNumeroCnps(adherentToEdit.numeroCnps || '');
      setGestionnaireId(adherentToEdit.gestionnaireId || '');
      setSansEnfant(adherentToEdit.sansEnfant || false);
      setNombreEnfants(adherentToEdit.nombreEnfants || 0);
    } else {
      setNom('');
      setPrenom('');
      setSexe('M');
      setDateNaissance('1990-01-01');
      setLieuNaissance('');
      setCni('');
      setTelephone('+237 ');
      setAdresse('');
      setProfession('');
      setDateAdhesion(new Date().toISOString().slice(0, 10));
      setStatut('Actif');
      setTarifJournalier(700);
      setObservations('');
      setNumeroCnps('');
      setGestionnaireId('');
      setSansEnfant(false);
      setNombreEnfants(0);
    }
  }, [adherentToEdit, isOpen]);

  if (!isOpen) return null;

  // Le matricule est attribué par le serveur (séquence atomique) à l'enregistrement : rien n'est anticipé ici
  const nextMatriculePreview = "Attribué automatiquement à l'enregistrement";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nom.trim() || !prenom.trim() || !telephone.trim() || !profession.trim()) {
      await dialog.alert({
        title: 'Champs obligatoires',
        message: 'Veuillez remplir les champs obligatoires (Nom, Prénom, Téléphone, Profession).',
        variant: 'warning',
      });
      return;
    }

    if (isEditing && adherentToEdit) {
      // Pour modifier, le code de sécurité 0000 est requis
      if (onRequestPinConfirm) {
        onRequestPinConfirm(
          async () => {
            const res = await updateAdherent(
              adherentToEdit.id,
              {
                nom: nom.toUpperCase().trim(),
                prenom: prenom.trim(),
                sexe,
                dateNaissance,
                lieuNaissance,
                cni: cni.trim(),
                telephone: telephone.trim(),
                adresse: adresse.trim(),
                profession: profession.trim(),
                dateAdhesion,
                statut,
                tarifJournalier,
                observations: observations.trim(),
                numeroCnps: numeroCnps.trim() || undefined,
                gestionnaireId: gestionnaireId || undefined,
                sansEnfant,
                nombreEnfants: sansEnfant ? 0 : nombreEnfants,
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
          'Confirmation de modification d\'adhérent',
          `Vous êtes sur le point de modifier les données de l'adhérent ${adherentToEdit.matricule}. Le code de sécurité 0000 est obligatoire.`
        );
      }
    } else {
      // Création d'un nouvel adhérent (matricule automatique)
      const res = await addAdherent({
        nom: nom.toUpperCase().trim(),
        prenom: prenom.trim(),
        sexe,
        dateNaissance,
        lieuNaissance,
        cni: cni.trim(),
        telephone: telephone.trim(),
        adresse: adresse.trim(),
        profession: profession.trim(),
        dateAdhesion,
        statut,
        statutImmatriculation: 'Non immatriculé',
        tarifJournalier,
        observations: observations.trim(),
        numeroCnps: numeroCnps.trim() || undefined,
        gestionnaireId: gestionnaireId || undefined,
        sansEnfant,
        nombreEnfants: sansEnfant ? 0 : nombreEnfants,
      });

      if (res.success) {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              {isEditing ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing
                  ? `Modifier l'adhérent ${adherentToEdit?.matricule}`
                  : 'Enregistrer un nouvel adhérent'}
              </h3>
              <p className="text-xs text-slate-300">
                {isEditing
                  ? 'Modification sous contrôle de sécurité (Code requis)'
                  : 'Attribution automatique d’un matricule unique'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Bannière Matricule COSITI */}
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Sparkles className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                  Matricule COSITI (Unique & Invariable)
                </span>
                <span className="text-sm font-mono font-extrabold text-emerald-950">
                  {isEditing ? adherentToEdit?.matricule : nextMatriculePreview}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full font-medium">
              {isEditing ? 'Matricule immuable' : 'Génération automatique'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nom de famille *
              </label>
              <input
                type="text"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: KOUASSI"
                className="w-full px-3 py-2 text-xs uppercase bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Prénom(s) *
              </label>
              <input
                type="text"
                required
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Ex: Yao Michel"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Sexe *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSexe('M')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    sexe === 'M'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Masculin (M)
                </button>
                <button
                  type="button"
                  onClick={() => setSexe('F')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    sexe === 'F'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Féminin (F)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Téléphone mobile *
              </label>
              <input
                type="tel"
                required
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+225 07 00 00 00 00"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Date de naissance
              </label>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Lieu de naissance
              </label>
              <input
                type="text"
                value={lieuNaissance}
                onChange={(e) => setLieuNaissance(e.target.value)}
                placeholder="Ex: Abidjan, Bouaké..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Numéro de CNI / Passeport
              </label>
              <input
                type="text"
                value={cni}
                onChange={(e) => setCni(e.target.value)}
                placeholder="Ex: CI0038472910"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Profession / Activité informelle *
              </label>
              <input
                type="text"
                required
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="Ex: Menuisier, Commerçante marché, Chauffeur..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Adresse ou lieu de résidence / Emplacement de commerce *
              </label>
              <input
                type="text"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Ex: Adjamé Marché Gouro, Rue 12, Magasin 4"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Date d'adhésion
              </label>
              <input
                type="date"
                value={dateAdhesion}
                onChange={(e) => setDateAdhesion(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Montant de cotisation journalière
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTarifJournalier(700)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    tarifJournalier === 700
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  700 FCFA / jour
                </button>
                <button
                  type="button"
                  onClick={() => setTarifJournalier(1000)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    tarifJournalier === 1000
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  1 000 FCFA / jour
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Statut de l'adhérent
              </label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as StatutAdherent)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {parametres.statutsAdherents.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Numéro matricule CNPS (Renseigné par l'agent enregistreur)
              </label>
              <input
                type="text"
                value={numeroCnps}
                onChange={(e) => setNumeroCnps(e.target.value)}
                placeholder="Ex: 2026-98432 (renseigné par l'agent)"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Gestionnaire de Portefeuille (Suivi adhérent)
              </label>
              <select
                value={gestionnaireId}
                onChange={(e) => setGestionnaireId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Aucun gestionnaire affecté --</option>
                {gestionnaires.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} - {g.nom} {g.prenom} ({g.zoneSecteur || 'Terrain'})
                  </option>
                ))}
              </select>
            </div>

            {/* Situation familiale & Enfants */}
            <div className="sm:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Situation familiale & Enfants à charge
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Précisez si le travailleur a des enfants à charge pour le suivi des prestations familiales CNPS.
                  </p>
                </div>
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={sansEnfant}
                    onChange={(e) => {
                      setSansEnfant(e.target.checked);
                      if (e.target.checked) setNombreEnfants(0);
                    }}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Travailleur sans enfant</span>
                </label>
              </div>

              {!sansEnfant && (
                <div className="flex items-center space-x-3 pt-1">
                  <label className="text-xs text-slate-700 font-semibold shrink-0">
                    Nombre d'enfants à charge :
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={nombreEnfants}
                    onChange={(e) => setNombreEnfants(parseInt(e.target.value, 10) || 0)}
                    className="w-24 px-2.5 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Observations & Notes
              </label>
              <textarea
                rows={2}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Remarques particulières, parrainage, type d'activité..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {isEditing && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-xs text-amber-900">
              <Shield className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Contrôle de sécurité :</strong> Le code de confirmation <strong>0000</strong>{' '}
                vous sera demandé pour valider cette modification.
              </span>
            </div>
          )}

          {/* Boutons validation */}
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
              {isEditing ? 'Enregistrer les modifications' : 'Créer l’adhérent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
