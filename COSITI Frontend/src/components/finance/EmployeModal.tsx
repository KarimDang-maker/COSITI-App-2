import React, { useState, useEffect } from 'react';
import { Employe, DepartementEmploye, TypeContratEmploye, Sexe, ModePaiement } from '../../types';
import { useApiQuery } from '../../api/hooks';
import {
  UserPlus,
  UserCheck,
  X,
  Save,
  Building2,
  ShieldCheck,
  CreditCard,
  Phone,
  Mail,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

interface EmployeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeToEdit?: Employe | null;
  onSave: (data: Omit<Employe, 'id' | 'createdAt' | 'updatedAt'>) => void;
  banquesDisponibles: string[];
}

export const EmployeModal: React.FC<EmployeModalProps> = ({
  isOpen,
  onClose,
  employeToEdit,
  onSave,
  banquesDisponibles,
}) => {
  if (!isOpen) return null;

  const [matricule, setMatricule] = useState(employeToEdit?.matricule || `EMP-${String(Math.floor(Math.random() * 900) + 100)}`);
  const [nom, setNom] = useState(employeToEdit?.nom || '');
  const [prenom, setPrenom] = useState(employeToEdit?.prenom || '');
  const [sexe, setSexe] = useState<Sexe>(employeToEdit?.sexe || 'M');
  const [poste, setPoste] = useState(employeToEdit?.poste || '');
  const [departement, setDepartement] = useState<DepartementEmploye>(
    employeToEdit?.departement || 'Opérations & Recouvrement'
  );
  const [typeContrat, setTypeContrat] = useState<TypeContratEmploye>(
    employeToEdit?.typeContrat || 'CDI'
  );
  const [dateEmbauche, setDateEmbauche] = useState(
    employeToEdit?.dateEmbauche || new Date().toISOString().split('T')[0]
  );
  const [numeroCnps, setNumeroCnps] = useState(employeToEdit?.numeroCnps || '');
  const [numeroCmu, setNumeroCmu] = useState(employeToEdit?.numeroCmu || '');
  const [salaireBase, setSalaireBase] = useState<number>(employeToEdit?.salaireBase || 60000);
  const [sursalaire, setSursalaire] = useState<number>(employeToEdit?.sursalaire || 0);
  const [indemniteTransport, setIndemniteTransport] = useState<number>(
    employeToEdit?.indemniteTransport || 15000
  );
  const [primesFixes, setPrimesFixes] = useState<number>(employeToEdit?.primesFixes || 0);
  const [nombrePartsFiscales, setNombrePartsFiscales] = useState<number>(
    employeToEdit?.nombrePartsFiscales || 1
  );
  const [modePaiement, setModePaiement] = useState<string>(
    employeToEdit?.modePaiement || 'Virement bancaire'
  );
  const [banqueNom, setBanqueNom] = useState(employeToEdit?.banqueNom || banquesDisponibles[0] || '');
  const [numeroCompteBancaire, setNumeroCompteBancaire] = useState(
    employeToEdit?.numeroCompteBancaire || ''
  );
  const [telephone, setTelephone] = useState(employeToEdit?.telephone || '+225 ');
  const [email, setEmail] = useState(employeToEdit?.email || '');
  const [notes, setNotes] = useState(employeToEdit?.notes || '');
  const [actif, setActif] = useState(employeToEdit?.actif !== false);

  // Tranche légale du salaire de base : déterminée par le serveur (GET /paie/tranche)
  const { data: trancheServeur } = useApiQuery<{ tranche: 'MOINS_DE_60K' | 'EGAL_60K' | 'PLUS_DE_60K'; libelle: string; explication: string }>(
    '/paie/tranche',
    { salaire: Number(salaireBase) || 0 }
  );
  const trancheInfo = trancheServeur ?? { tranche: 'PLUS_DE_60K' as const, libelle: '…', explication: '' };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !poste.trim() || salaireBase <= 0) {
      alert('Veuillez remplir le nom, le poste et un salaire de base valide.');
      return;
    }

    onSave({
      matricule: matricule.trim(),
      nom: nom.trim().toUpperCase(),
      prenom: prenom.trim(),
      sexe,
      poste: poste.trim(),
      departement,
      typeContrat,
      dateEmbauche,
      numeroCnps: numeroCnps.trim(),
      numeroCmu: numeroCmu.trim(),
      salaireBase: Number(salaireBase),
      sursalaire: Number(sursalaire) || 0,
      indemniteTransport: Number(indemniteTransport) || 0,
      primesFixes: Number(primesFixes) || 0,
      nombrePartsFiscales: Number(nombrePartsFiscales) || 1,
      modePaiement: modePaiement as any,
      banqueNom: modePaiement === 'Virement bancaire' ? banqueNom : undefined,
      numeroCompteBancaire: modePaiement === 'Virement bancaire' ? numeroCompteBancaire.trim() : undefined,
      telephone: telephone.trim(),
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      actif,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* En-tête */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              {employeToEdit ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">
                {employeToEdit ? 'Modifier la Fiche Salarié' : 'Nouveau Salarié (Personnel COSITI)'}
              </h3>
              <p className="text-xs text-slate-400">
                Gestion des contrats, immatriculation et barèmes légaux
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Alerte Indicateur Tranche Légale */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
              trancheInfo.tranche === 'MOINS_DE_60K'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : trancheInfo.tranche === 'EGAL_60K'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-purple-50 border-purple-200 text-purple-900'
            }`}
          >
            <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed">
              <div className="font-bold flex items-center gap-2">
                <span>Catégorie Juridique : {trancheInfo.libelle}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border bg-white/70">
                  {trancheInfo.tranche === 'MOINS_DE_60K'
                    ? '0 F ITS (Exonération Totale)'
                    : trancheInfo.tranche === 'EGAL_60K'
                    ? '0 F ITS (Franchise Fiscale)'
                    : 'Barème Progressif ITS'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                {trancheInfo.explication}
              </p>
            </div>
          </div>

          {/* Section 1 : État Civil & Identité */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2">
              1. Informations Générales & État Civil
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Matricule Salarié *
                </label>
                <input
                  type="text"
                  required
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  placeholder="EMP-001"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nom de famille *
                </label>
                <input
                  type="text"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 uppercase font-medium"
                  placeholder="KOUASSI"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Prénoms *
                </label>
                <input
                  type="text"
                  required
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Jean-Marc"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Genre / Sexe
                </label>
                <select
                  value={sexe}
                  onChange={(e) => setSexe(e.target.value as Sexe)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="M">Masculin (M)</option>
                  <option value="F">Féminin (F)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Téléphone joignable *
                </label>
                <input
                  type="tel"
                  required
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder="+225 07 ..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email professionnel / perso
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="salarie@cositi-ci.org"
                />
              </div>
            </div>
          </div>

          {/* Section 2 : Poste & Contrat */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2">
              2. Poste, Département & Contrat
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fonction / Intitulé du Poste *
                </label>
                <input
                  type="text"
                  required
                  value={poste}
                  onChange={(e) => setPoste(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                  placeholder="Ex: Caissière Principale, Coursier..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Département d'affectation
                </label>
                <select
                  value={departement}
                  onChange={(e) => setDepartement(e.target.value as DepartementEmploye)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Caisse & Enregistrement">Caisse & Enregistrement</option>
                  <option value="Opérations & Recouvrement">Opérations & Recouvrement</option>
                  <option value="Finances & Comptabilité">Finances & Comptabilité</option>
                  <option value="Direction Générale">Direction Générale</option>
                  <option value="Logistique & Services Généraux">Logistique & Services Généraux</option>
                  <option value="Autre">Autre service</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nature du contrat
                </label>
                <select
                  value={typeContrat}
                  onChange={(e) => setTypeContrat(e.target.value as TypeContratEmploye)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="CDI">CDI (Contrat à Durée Indéterminée)</option>
                  <option value="CDD">CDD (Contrat à Durée Déterminée)</option>
                  <option value="Stage">Stage d'insertion / Professionnel</option>
                  <option value="Prestation / Temporaire">Prestation / Temporaire</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Date d'embauche
                </label>
                <input
                  type="date"
                  value={dateEmbauche}
                  onChange={(e) => setDateEmbauche(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  N° Immatriculation CNPS
                </label>
                <input
                  type="text"
                  value={numeroCnps}
                  onChange={(e) => setNumeroCnps(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder="CNPS-CI-XXXXXX"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  N° Couverture CMU
                </label>
                <input
                  type="text"
                  value={numeroCmu}
                  onChange={(e) => setNumeroCmu(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder="CMU-CI-XXXXXX"
                />
              </div>
            </div>
          </div>

          {/* Section 3 : Rémunération & Tranche Légale */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2">
              3. Rémunération Contractuelle & Barème Légal (en FCFA)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Salaire de Base Mensuel * (FCFA)
                </label>
                <input
                  type="number"
                  required
                  min="10000"
                  step="1000"
                  value={salaireBase}
                  onChange={(e) => setSalaireBase(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-emerald-800"
                  placeholder="60000"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Pivot légal : &lt; 60k | 60k | &gt; 60k
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Sursalaire contractuel (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={sursalaire}
                  onChange={(e) => setSursalaire(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Indemnité transport (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={indemniteTransport}
                  onChange={(e) => setIndemniteTransport(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder="20000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Primes fixes contractuelles (Caisse, responsabilité...)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={primesFixes}
                  onChange={(e) => setPrimesFixes(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nombre de parts fiscales IGR (Abattement familial)
                </label>
                <select
                  value={nombrePartsFiscales}
                  onChange={(e) => setNombrePartsFiscales(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                >
                  <option value={1}>1 part (Célibataire sans enfant)</option>
                  <option value={1.5}>1.5 part (Marié sans enfant)</option>
                  <option value={2}>2 parts (Marié 1 enfant / Célibataire 1 enfant)</option>
                  <option value={2.5}>2.5 parts (Marié 2 enfants)</option>
                  <option value={3}>3 parts (Marié 3 enfants)</option>
                  <option value={3.5}>3.5 parts (Marié 4 enfants)</option>
                  <option value={4}>4 parts (Marié 5 enfants et plus)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4 : Modalités de Règlement */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2">
              4. Mode de Paiement & Coordonnées Bancaires
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mode de règlement du salaire
                </label>
                <select
                  value={modePaiement}
                  onChange={(e) => setModePaiement(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Virement bancaire">Virement bancaire</option>
                  <option value="Espèces">Espèces / Caisse</option>
                  <option value="Chèque">Chèque bancaire</option>
                  <option value="Wave">Mobile Money - Wave</option>
                  <option value="Orange Money">Mobile Money - Orange Money</option>
                  <option value="MTN MoMo">Mobile Money - MTN MoMo</option>
                </select>
              </div>

              {modePaiement === 'Virement bancaire' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Banque domiciliée
                    </label>
                    <select
                      value={banqueNom}
                      onChange={(e) => setBanqueNom(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                      {banquesDisponibles.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      N° Compte Bancaire (RIB / IBAN)
                    </label>
                    <input
                      type="text"
                      value={numeroCompteBancaire}
                      onChange={(e) => setNumeroCompteBancaire(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                      placeholder="CI059 01001 ..."
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Notes contractuelles ou observations du DAF
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="Ex: Contrat signé le 15 Janvier 2026. Indemnité de panier incluse..."
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="actif"
                checked={actif}
                onChange={(e) => setActif(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <label htmlFor="actif" className="text-xs font-medium text-slate-700 cursor-pointer">
                Salarié actif en poste (éligible à la génération mensuelle des bulletins de paie)
              </label>
            </div>
          </div>

          {/* Boutons actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm font-semibold transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{employeToEdit ? 'Mettre à Jour le Salarié' : 'Enregistrer le Salarié'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
