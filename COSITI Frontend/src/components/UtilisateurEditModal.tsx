import React, { useState, useEffect } from 'react';
import { Utilisateur, RoleUtilisateur, TypeAcces } from '../types';
import { useApp } from '../context/AppContext';
import { User, Mail, Phone, Briefcase, KeyRound, Shield, X, Check, Lock, Wand2, Unlock, Eye, EyeOff, Loader2 } from 'lucide-react';

interface UtilisateurEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: Utilisateur | null;
}

export const ROLES_LIST: { role: RoleUtilisateur; defaultType: TypeAcces; description: string }[] = [
  { role: 'Super Administrateur', defaultType: 'Super administration', description: 'Comptes, identifiants de connexion et audit — accès complet' },
  { role: 'DG', defaultType: 'Administrateur et consultation', description: 'Directeur Général — Administration générale et supervision' },
  { role: 'DGA', defaultType: 'Administrateur et consultation', description: 'Directrice Générale Adjointe — Coordination et supervision' },
  { role: 'DAF', defaultType: 'Administrateur, enregistrement et consultation', description: 'Directeur Administratif et Financier — Finances, paie, paramètres' },
  { role: "Caissière & Agent d'enregistrement", defaultType: 'Enregistrement', description: 'Opérations de caisse, encaissements et immatriculations' },
  { role: 'PCA', defaultType: 'Consultation', description: "Président du Conseil d'Administration — Consultation et audit" },
  { role: 'Conseil de Surveillance', defaultType: 'Consultation', description: 'Conseil de Surveillance — Contrôle et audit' },
  { role: 'Administrateur', defaultType: 'Administrateur et consultation', description: 'Gestion technique et paramétrage applicatif' },
  { role: "Agent d'enregistrement", defaultType: 'Enregistrement', description: 'Saisie des adhésions et cotisations de terrain' },
  { role: 'Agent de consultation', defaultType: 'Consultation', description: 'Consultation des fiches et statistiques' },
];

const TYPES_ACCES_LIST: TypeAcces[] = ['Consultation', 'Enregistrement', 'Administrateur et consultation', 'Administrateur, enregistrement et consultation'];

const PASSWORD_RULES = (p: string) => p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);

/** Mot de passe aléatoire conforme aux règles (8+ caractères, majuscule, minuscule, chiffre) */
function genererMotDePasse() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '@#$%&!'];
  const rnd = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  const chars = sets.map((s) => s[rnd(s.length)]);
  const all = sets.join('');
  while (chars.length < 12) chars.push(all[rnd(all.length)]);
  return chars.sort(() => rnd(3) - 1).join('');
}

const inputCls = 'w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60';

export const UtilisateurEditModal: React.FC<UtilisateurEditModalProps> = ({ isOpen, onClose, userToEdit }) => {
  const { addUtilisateur, updateUtilisateur, updateIdentifiants, currentUser } = useApp();
  const isSuperAdmin = currentUser.role === 'Super Administrateur';
  const isSelf = Boolean(userToEdit && userToEdit.id === currentUser.id);
  const isCreate = !userToEdit;

  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [poste, setPoste] = useState('');
  const [role, setRole] = useState<RoleUtilisateur>("Caissière & Agent d'enregistrement");
  const [typeAcces, setTypeAcces] = useState<TypeAcces>('Enregistrement');
  const [descriptionAcces, setDescriptionAcces] = useState('');
  const [actif, setActif] = useState(true);
  // identifiants (Super Administrateur)
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mustChange, setMustChange] = useState(true);
  const [deverrouiller, setDeverrouiller] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setPassword('');
    setDeverrouiller(false);
    setShowPassword(false);
    if (userToEdit) {
      setNom(userToEdit.nom);
      setEmail(userToEdit.email);
      setTelephone(userToEdit.telephone || '');
      setPoste(userToEdit.poste || userToEdit.titreComplet || '');
      setRole(userToEdit.role);
      setTypeAcces(userToEdit.typeAcces);
      setDescriptionAcces(userToEdit.descriptionAcces || '');
      setActif(userToEdit.actif);
      setMustChange(false);
    } else {
      setNom('');
      setEmail('');
      setTelephone('+237 ');
      setPoste('');
      setRole("Caissière & Agent d'enregistrement");
      setTypeAcces('Enregistrement');
      setDescriptionAcces('Encaissement des cotisations et adhésions');
      setActif(true);
      setMustChange(true);
    }
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  // Seul le Super Administrateur crée des comptes ou modifie ceux des autres
  if ((isCreate && !isSuperAdmin) || (!isCreate && !isSuperAdmin && !isSelf)) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 border border-rose-200">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Réservé au Super Administrateur</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            La création des comptes et la modification des informations de connexion des acteurs sont réservées au
            <strong> Super Administrateur</strong>. Vous pouvez modifier votre nom et votre téléphone depuis votre propre profil.
          </p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold">Fermer</button>
        </div>
      </div>
    );
  }

  const canEditProfile = isSuperAdmin; // les autres : seulement nom + téléphone sur leur propre compte
  const locked = userToEdit?.lockedUntil && new Date(userToEdit.lockedUntil) > new Date();

  const handleRoleChange = (r: RoleUtilisateur) => {
    setRole(r);
    const def = ROLES_LIST.find((x) => x.role === r);
    if (def) {
      setTypeAcces(def.defaultType);
      setDescriptionAcces(def.description);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nom.trim() || !email.trim()) return setError('Le nom et l’e-mail sont obligatoires.');
    if ((isCreate || password) && !PASSWORD_RULES(password)) return setError('Mot de passe : 8 caractères minimum, avec majuscule, minuscule et chiffre.');

    setBusy(true);
    try {
      if (isCreate) {
        const r = await addUtilisateur({
          nom: nom.trim(), email: email.trim().toLowerCase(), role, typeAcces: role === 'Super Administrateur' ? 'Super administration' : typeAcces,
          titreComplet: poste.trim() || undefined, poste: poste.trim() || undefined, descriptionAcces: descriptionAcces.trim() || undefined,
          telephone: telephone.trim() || undefined, actif, password, mustChangePassword: mustChange,
        });
        if (!r.success) return setError(r.error || 'Création impossible.');
      } else if (userToEdit) {
        const profil = canEditProfile
          ? { nom: nom.trim(), role, typeAcces: role === 'Super Administrateur' ? 'Super administration' as TypeAcces : typeAcces, poste: poste.trim(), titreComplet: poste.trim(), descriptionAcces: descriptionAcces.trim(), telephone: telephone.trim(), actif }
          : { nom: nom.trim(), telephone: telephone.trim() };
        const r1 = await updateUtilisateur(userToEdit.id, profil);
        if (!r1.success) return setError(r1.error || 'Mise à jour impossible.');
        const emailChanged = email.trim().toLowerCase() !== userToEdit.email;
        if (isSuperAdmin && (emailChanged || password || deverrouiller || mustChange)) {
          const r2 = await updateIdentifiants(userToEdit.id, {
            email: emailChanged ? email.trim().toLowerCase() : undefined,
            password: password || undefined,
            mustChangePassword: password ? mustChange : mustChange || undefined,
            deverrouiller: deverrouiller || undefined,
          });
          if (!r2.success) return setError(r2.error || 'Modification des identifiants impossible.');
        }
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-slate-200">
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700"><User className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{isCreate ? 'Nouveau compte' : `Compte de ${userToEdit?.nom}`}</h3>
              <p className="text-xs text-slate-500">{isCreate ? 'Création par le Super Administrateur — tous les rôles disponibles' : isSuperAdmin ? 'Profil et informations de connexion' : 'Votre profil'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Profil */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Profil</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="font-semibold text-slate-700">Nom complet *</span>
                <div className="relative mt-1"><User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)} required /></div>
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-slate-700">Téléphone</span>
                <div className="relative mt-1"><Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input className={inputCls} value={telephone} onChange={(e) => setTelephone(e.target.value)} /></div>
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-slate-700">Rôle *</span>
                <div className="relative mt-1"><Shield className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <select className={inputCls} value={role} disabled={!canEditProfile || isSelf} onChange={(e) => handleRoleChange(e.target.value as RoleUtilisateur)}>
                    {ROLES_LIST.map((r) => <option key={r.role} value={r.role}>{r.role}</option>)}
                  </select></div>
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-slate-700">Type d'accès</span>
                <select className={`${inputCls} pl-3`} value={role === 'Super Administrateur' ? 'Super administration' : typeAcces} disabled={!canEditProfile || role === 'Super Administrateur'} onChange={(e) => setTypeAcces(e.target.value as TypeAcces)}>
                  {role === 'Super Administrateur' ? <option>Super administration</option> : TYPES_ACCES_LIST.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold text-slate-700">Poste / fonction</span>
                <div className="relative mt-1"><Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input className={inputCls} value={poste} disabled={!canEditProfile} onChange={(e) => setPoste(e.target.value)} placeholder="Ex. Caissière principale" /></div>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold text-slate-700">Description des accès</span>
                <input className={`${inputCls} pl-3 mt-1`} value={descriptionAcces} disabled={!canEditProfile} onChange={(e) => setDescriptionAcces(e.target.value)} />
              </label>
              {canEditProfile && !isSelf && (
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} className="w-4 h-4 accent-emerald-600" /> Compte actif
                </label>
              )}
            </div>
          </section>

          {/* Informations de connexion : Super Administrateur uniquement */}
          {isSuperAdmin ? (
            <section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Informations de connexion (Super Administrateur)
              </h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block text-sm sm:col-span-2">
                  <span className="font-semibold text-slate-700">E-mail de connexion *</span>
                  <div className="relative mt-1"><Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                </label>
                <label className="block text-sm">
                  <span className="font-semibold text-slate-700">{isCreate ? 'Mot de passe *' : 'Nouveau mot de passe'}</span>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" className={`${inputCls} pr-16 font-mono`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isCreate ? '' : 'inchangé'} />
                    <button type="button" title="Afficher" onClick={() => setShowPassword((v) => !v)} className="absolute right-8 top-2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    <button type="button" title="Générer un mot de passe" onClick={() => { setPassword(genererMotDePasse()); setShowPassword(true); setMustChange(true); }} className="absolute right-2 top-2 text-emerald-600 hover:text-emerald-800"><Wand2 className="w-4 h-4" /></button>
                  </div>
                  <span className="text-[11px] text-slate-500">8+ caractères, majuscule, minuscule, chiffre</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                  <input type="checkbox" checked={mustChange} onChange={(e) => setMustChange(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                  Imposer le changement du mot de passe à la prochaine connexion
                </label>
                {!isCreate && locked && (
                  <label className="flex items-center gap-2 text-sm text-rose-700 sm:col-span-2">
                    <input type="checkbox" checked={deverrouiller} onChange={(e) => setDeverrouiller(e.target.checked)} className="w-4 h-4 accent-rose-600" />
                    <Unlock className="w-4 h-4" /> Compte verrouillé (échecs de connexion) : le déverrouiller
                  </label>
                )}
              </div>
              <p className="text-[11px] text-amber-800">Les mots de passe sont enregistrés hachés : personne ne peut les relire. Toute modification ferme les sessions du compte et est journalisée.</p>
            </section>
          ) : (
            <p className="text-xs text-slate-500 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> E-mail, mot de passe et code PIN : modifiables uniquement par le Super Administrateur (votre mot de passe : menu de votre profil).</p>
          )}

          {error && <div role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl">Annuler</button>
            <button type="submit" disabled={busy} className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {isCreate ? 'Créer le compte' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
