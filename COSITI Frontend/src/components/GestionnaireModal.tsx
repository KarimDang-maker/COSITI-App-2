import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GestionnairePortefeuille } from '../types';
import {
  X,
  UserPlus,
  UserCheck,
  Shield,
  Phone,
  Mail,
  MapPin,
  Target,
  FileText,
  BadgeAlert,
} from 'lucide-react';

interface GestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  gestionnaireToEdit?: GestionnairePortefeuille | null;
}

export const GestionnaireModal: React.FC<GestionnaireModalProps> = ({
  isOpen,
  onClose,
  gestionnaireToEdit,
}) => {
  const { gestionnaires, addGestionnaire, updateGestionnaire, parametres } = useApp();

  const isEditing = Boolean(gestionnaireToEdit);

  // Génération automatique du code suggestion si nouveau
  const defaultCode = `GP-${String(gestionnaires.length + 1).padStart(2, '0')}`;

  const [code, setCode] = useState(defaultCode);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState(parametres.telephone ? `${parametres.telephone.slice(0, 5)} ` : '+237 ');
  const [email, setEmail] = useState('');
  const [zoneSecteur, setZoneSecteur] = useState('Douala - Akwa');
  const [objectifMensuel, setObjectifMensuel] = useState<number>(1500000);
  const [statut, setStatut] = useState<'Actif' | 'Inactif' | 'En congé'>('Actif');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (gestionnaireToEdit) {
      setCode(gestionnaireToEdit.code);
      setNom(gestionnaireToEdit.nom);
      setPrenom(gestionnaireToEdit.prenom);
      setTelephone(gestionnaireToEdit.telephone);
      setEmail(gestionnaireToEdit.email || '');
      setZoneSecteur(gestionnaireToEdit.zoneSecteur);
      setObjectifMensuel(gestionnaireToEdit.objectifsRecouvrementMensuel || 1500000);
      setStatut(gestionnaireToEdit.statut);
      setNotes(gestionnaireToEdit.notes || '');
      setError(null);
    } else {
      const nextNum = String(gestionnaires.length + 1).padStart(2, '0');
      setCode(`GP-${nextNum}`);
      setNom('');
      setPrenom('');
      setTelephone('+237 ');
      setEmail('');
      setZoneSecteur('Douala - Akwa');
      setObjectifMensuel(1500000);
      setStatut('Actif');
      setNotes('');
      setError(null);
    }
  }, [gestionnaireToEdit, isOpen, gestionnaires.length, parametres]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim() || !nom.trim() || !prenom.trim() || !telephone.trim() || !zoneSecteur.trim()) {
      setError('Veuillez renseigner tous les champs obligatoires (Code, Nom, Prénom, Téléphone, Zone).');
      return;
    }

    // Vérifier l'unicité du code
    const duplicate = (gestionnaires || []).find(
      (g) => (g.code || '').toLowerCase() === (code || '').trim().toLowerCase() && g.id !== gestionnaireToEdit?.id
    );
    if (duplicate) {
      setError(`Le code gestionnaire "${code}" est déjà utilisé par ${duplicate.nom} ${duplicate.prenom}.`);
      return;
    }

    if (isEditing && gestionnaireToEdit) {
      const res = await updateGestionnaire(gestionnaireToEdit.id, {
        code: code.trim().toUpperCase(),
        nom: nom.trim().toUpperCase(),
        prenom: prenom.trim(),
        telephone: telephone.trim(),
        email: email.trim() || undefined,
        zoneSecteur: zoneSecteur.trim(),
        objectifsRecouvrementMensuel: Number(objectifMensuel) || 0,
        statut,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error || 'Erreur lors de la mise à jour.');
        return;
      }
    } else {
      const res = await addGestionnaire({
        code: code.trim().toUpperCase(),
        nom: nom.trim().toUpperCase(),
        prenom: prenom.trim(),
        telephone: telephone.trim(),
        email: email.trim() || undefined,
        zoneSecteur: zoneSecteur.trim(),
        objectifsRecouvrementMensuel: Number(objectifMensuel) || 0,
        statut,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error || "Erreur lors de l'enregistrement.");
        return;
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in duration-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              {isEditing ? <UserCheck className="w-6 h-6 text-white" /> : <UserPlus className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEditing ? 'Modifier le gestionnaire' : 'Enregistrer un gestionnaire'}
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Suivi et recouvrement des adhérents par portefeuille
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
              <BadgeAlert className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Code Gestionnaire (GP) *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: GP-01, GP-DLA-01"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-emerald-800 bg-slate-50 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Statut du gestionnaire *
              </label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
              >
                <option value="Actif">Actif (en fonction)</option>
                <option value="En congé">En congé</option>
                <option value="Inactif">Inactif / Suspendu</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nom de famille *
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value.toUpperCase())}
                placeholder="Ex: TCHANA, EBONGUE"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prénom(s) *
              </label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Ex: Marc Aurèle, Sandrine"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Téléphone (Cameroun) *
              </label>
              <input
                type="text"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+237 6XX XX XX XX"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                Email professionnel
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: marc.gp@cositi-cm.org"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Zone / Secteur attribué *
              </label>
              <input
                type="text"
                value={zoneSecteur}
                onChange={(e) => setZoneSecteur(e.target.value)}
                placeholder="Ex: Douala - Akwa & Deido, Bafoussam"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                Objectif mensuel (FCFA)
              </label>
              <input
                type="number"
                step="50000"
                min="0"
                value={objectifMensuel}
                onChange={(e) => setObjectifMensuel(Number(e.target.value))}
                placeholder="Ex: 1500000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Observations & Consignes spécifiques
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Responsable des commerçants du grand marché, tournées les mardis et jeudis..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition flex items-center gap-2"
            >
              {isEditing ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  Mettre à jour le gestionnaire
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Enregistrer le gestionnaire
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
