import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Adherent, StatutAdherent, StatutImmatriculation } from '../types';
import {
  formatFCFA,
  formatDateShort,
} from '../utils/helpers';
import { exporterListe } from '../api/excel';
import { getUserPermissions, canUserRegulariser, canUserChangeStatut } from '../utils/permissions';
import { RegularisationModal } from './RegularisationModal';
import { StatutAdherentModal } from './StatutAdherentModal';
import {
  Search,
  UserPlus,
  Filter,
  FileSpreadsheet,
  Eye,
  Edit,
  Trash2,
  CreditCard,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Shield,
  X,
  Sparkles,
  Briefcase,
  Scale,
  UserCheck,
} from 'lucide-react';

interface AdherentsViewProps {
  onOpenNewAdherent: () => void;
  onSelectAdherent: (id: string) => void;
  onEditAdherent: (adh: Adherent) => void;
  onDeleteAdherent: (adh: Adherent) => void;
  onNewCotisationForAdherent: (adh: Adherent) => void;
  onImmatriculerAdherent: (adh: Adherent) => void;
}

export const AdherentsView: React.FC<AdherentsViewProps> = ({
  onOpenNewAdherent,
  onSelectAdherent,
  onEditAdherent,
  onDeleteAdherent,
  onNewCotisationForAdherent,
  onImmatriculerAdherent,
}) => {
  const { adherents, cotisations, parametres, currentUser, gestionnaires, setActiveTab, statsOf } = useApp();
  const permissions = getUserPermissions(currentUser);
  const canRegulariser = canUserRegulariser(currentUser);
  const canChangeStatut = canUserChangeStatut(currentUser);

  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('TOUS');
  const [filterImmatriculation, setFilterImmatriculation] = useState<string>('TOUS');
  const [filterCotisation, setFilterCotisation] = useState<string>('TOUS');
  const [filterSexe, setFilterSexe] = useState<string>('TOUS');
  const [filterGestionnaire, setFilterGestionnaire] = useState<string>('TOUS');

  const [isRegularisationModalOpen, setIsRegularisationModalOpen] = useState(false);
  const [selectedAdherentForReg, setSelectedAdherentForReg] = useState<string | null>(null);

  const [isStatutModalOpen, setIsStatutModalOpen] = useState(false);
  const [selectedAdherentForStatut, setSelectedAdherentForStatut] = useState<Adherent | null>(null);

  const getStatutBadgeClass = (s: StatutAdherent) => {
    switch (s) {
      case 'Actif':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'En cours de régularisation':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'En attente':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Inactif':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Suspendu':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Radié':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  // Filtrage
  const filteredAdherents = (adherents || []).filter((adh) => {
    if (!adh) return false;
    const q = (search || '').toLowerCase().trim();
    const mat = (adh.matricule || '').toLowerCase();
    const nom = (adh.nom || '').toLowerCase();
    const prenom = (adh.prenom || '').toLowerCase();
    const tel = (adh.telephone || '').toLowerCase();
    const cni = (adh.cni || '').toLowerCase();
    const cnps = (adh.numeroCnps || '').toLowerCase();
    const gest = (adh.gestionnaireNom || '').toLowerCase();
    const prof = (adh.profession || '').toLowerCase();

    const matchesSearch =
      !q ||
      mat.includes(q) ||
      nom.includes(q) ||
      prenom.includes(q) ||
      tel.includes(q) ||
      cni.includes(q) ||
      cnps.includes(q) ||
      gest.includes(q) ||
      prof.includes(q);

    const matchesStatut = filterStatut === 'TOUS' || adh.statut === filterStatut;
    const matchesImmat =
      filterImmatriculation === 'TOUS' || adh.statutImmatriculation === filterImmatriculation;
    const matchesSexe = filterSexe === 'TOUS' || adh.sexe === filterSexe;

    const matchesGestionnaire =
      filterGestionnaire === 'TOUS' ||
      (filterGestionnaire === 'SANS' ? !adh.gestionnaireId : adh.gestionnaireId === filterGestionnaire);

    let matchesCotisation = true;
    if (filterCotisation !== 'TOUS') {
      const stats = statsOf(adh);
      matchesCotisation = stats.statutCotisation === filterCotisation;
    }

    return matchesSearch && matchesStatut && matchesImmat && matchesSexe && matchesCotisation && matchesGestionnaire;
  });

  const handleExportExcel = () => {
    // Format d'échange (réimportable) produit par le serveur, limité à la liste filtrée affichée
    void exporterListe('adherents', filteredAdherents.map((a) => a.id));
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Registre des Adhérents COSITI
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {adherents.length} membre(s) enregistré(s) • Attribution automatique des matricules
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setActiveTab('gestionnaires')}
            className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Gérer les gestionnaires de portefeuille et affecter les adhérents"
          >
            <Briefcase className="w-4 h-4 text-emerald-700" />
            <span>Gestionnaires ({gestionnaires.length})</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Exporter en fichier Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Excel</span>
          </button>

          {canRegulariser && (
            <button
              id="btn-adherents-regularisation-daf"
              onClick={() => {
                setSelectedAdherentForReg(null);
                setIsRegularisationModalOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-98 border border-indigo-900/30"
              title="Régulariser des montants ou dates de cotisations antérieures depuis Juillet (DAF & DGA)"
            >
              <Scale className="w-4 h-4 text-amber-300" />
              <span>Régularisation DAF/DGA</span>
            </button>
          )}

          {permissions.canRecord && (
            <button
              onClick={onOpenNewAdherent}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-98"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nouvel Adhérent</span>
            </button>
          )}
        </div>
      </div>

      {/* Bannière d'information si Profil Consultation */}
      {permissions.isReadOnly && (
        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Eye className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Profil {currentUser.role} (Accès Consultation) :</strong> Consultation exhaustive des fiches et export Excel autorisés. L'enregistrement de nouveaux membres et l'encaissement de cotisations sont désactivés pour ce profil.
            </span>
          </div>
        </div>
      )}

      {/* Barre de recherche et filtres */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Recherche */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher par Matricule, Nom, Tél, CNI, CNPS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtre Immatriculation */}
          <div>
            <select
              value={filterImmatriculation}
              onChange={(e) => setFilterImmatriculation(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            >
              <option value="TOUS">Toutes immatriculations</option>
              <option value="Non immatriculé">Non immatriculé</option>
              <option value="Éligible (seuil atteint)">Éligible (≥ 15 000 F)</option>
              <option value="Immatriculé">Immatriculé CNPS</option>
            </select>
          </div>

          {/* Filtre Cotisation */}
          <div>
            <select
              value={filterCotisation}
              onChange={(e) => setFilterCotisation(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            >
              <option value="TOUS">Tous statuts cotisation</option>
              <option value="À jour">À jour</option>
              <option value="En retard">En retard</option>
              <option value="Sans cotisation">Sans cotisation</option>
            </select>
          </div>

          {/* Filtre Statut Adhérent */}
          <div>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            >
              <option value="TOUS">Tous statuts membre</option>
              {parametres.statutsAdherents.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre Gestionnaire de Portefeuille */}
          <div>
            <select
              value={filterGestionnaire}
              onChange={(e) => setFilterGestionnaire(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            >
              <option value="TOUS">Tous portefeuilles</option>
              <option value="SANS">Sans gestionnaire</option>
              {gestionnaires.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.code} - {g.nom} {g.prenom}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Indicateur de résultats */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Affichage de <strong>{filteredAdherents.length}</strong> sur {adherents.length} adhérent(s)
          </span>
          {(search || filterStatut !== 'TOUS' || filterImmatriculation !== 'TOUS' || filterCotisation !== 'TOUS' || filterGestionnaire !== 'TOUS') && (
            <button
              onClick={() => {
                setSearch('');
                setFilterStatut('TOUS');
                setFilterImmatriculation('TOUS');
                setFilterCotisation('TOUS');
                setFilterSexe('TOUS');
                setFilterGestionnaire('TOUS');
              }}
              className="text-emerald-700 font-semibold hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* Tableau des adhérents */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredAdherents.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Aucun adhérent ne correspond aux critères de recherche.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-4 py-3.5">Matricule</th>
                  <th className="px-4 py-3.5">Nom & Prénom(s)</th>
                  <th className="px-4 py-3.5">Activité / Métier</th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th className="px-4 py-3.5">Portefeuille</th>
                  <th className="px-4 py-3.5">Cumul Cotisations</th>
                  <th className="px-4 py-3.5">Immatriculation</th>
                  <th className="px-4 py-3.5">Statut Cotisation</th>
                  <th className="px-4 py-3.5">Statut Adhérent</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdherents.map((adh) => {
                  const stats = statsOf(adh);
                  const isEligible = stats.seuilAtteint;

                  return (
                    <tr key={adh.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Matricule */}
                      <td className="px-4 py-3 font-mono font-bold">
                        <span className="bg-emerald-50 text-emerald-800 px-2 py-1 rounded-md border border-emerald-200/60 inline-block">
                          {adh.matricule}
                        </span>
                      </td>

                      {/* Nom & Prénom */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onSelectAdherent(adh.id)}
                          className="font-bold text-slate-900 hover:text-emerald-700 text-left cursor-pointer group block"
                        >
                          <span className="group-hover:underline">{adh.nom} {adh.prenom}</span>
                          <span className="text-[10px] text-slate-400 font-normal block">
                            CNI: {adh.cni || 'Non renseignée'}
                          </span>
                        </button>
                      </td>

                      {/* Profession */}
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        <div>{adh.profession}</div>
                        <div className="text-[10px] text-slate-400">{adh.tarifJournalier} F/jour</div>
                      </td>

                      {/* Téléphone & Résidence */}
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-mono">{adh.telephone}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {adh.adresse || '—'}
                        </div>
                      </td>

                      {/* Portefeuille / Gestionnaire */}
                      <td className="px-4 py-3">
                        {adh.gestionnaireNom ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            <Briefcase className="w-3 h-3 mr-1 text-emerald-600" />
                            {adh.gestionnaireNom}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Non affecté</span>
                        )}
                      </td>

                      {/* Cumul Cotisations */}
                      <td className="px-4 py-3">
                        <div className="font-mono font-extrabold text-emerald-800">
                          {formatFCFA(stats.totalCumule)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {stats.nombreJoursCotises} jours couverts
                        </div>
                      </td>

                      {/* Statut Immatriculation */}
                      <td className="px-4 py-3">
                        {adh.statutImmatriculation === 'Immatriculé' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            <BadgeCheck className="w-3 h-3 mr-1" />
                            {adh.numeroCnps || 'Immatriculé'}
                          </span>
                        ) : isEligible ? (
                          <button
                            onClick={() => onImmatriculerAdherent(adh)}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 ring-1 ring-emerald-400 hover:bg-emerald-200 transition-colors cursor-pointer"
                            title="Seuil de 15 000 FCFA atteint ! Cliquer pour immatriculer"
                          >
                            <Sparkles className="w-3 h-3 mr-1 text-emerald-700" />
                            Éligible (15k)
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            Non immatriculé ({stats.pourcentageSeuil}%)
                          </span>
                        )}
                      </td>

                      {/* Statut Cotisation */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            stats.statutCotisation === 'À jour'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {stats.statutCotisation}
                        </span>
                        {stats.joursRetard > 0 && stats.statutCotisation !== 'À jour' && (
                          <span className="text-[10px] text-rose-600 block mt-0.5">
                            Retard: {stats.joursRetard}j
                          </span>
                        )}
                      </td>

                      {/* Statut Adhérent & Modification Rapide DAF/DGA */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatutBadgeClass(
                              adh.statut
                            )}`}
                          >
                            {adh.statut}
                          </span>
                          {canChangeStatut && (
                            <button
                              onClick={() => {
                                setSelectedAdherentForStatut(adh);
                                setIsStatutModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                              title="Modifier le statut de cet adhérent (DAF / DGA / DG)"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Voir fiche */}
                          <button
                            onClick={() => onSelectAdherent(adh.id)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Consulter la fiche complète et l'historique"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Régulariser les cotisations antérieures pour cet adhérent (DAF & DGA) */}
                          {canRegulariser && (
                            <button
                              onClick={() => {
                                setSelectedAdherentForReg(adh.id);
                                setIsRegularisationModalOpen(true);
                              }}
                              className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Régulariser les cotisations antérieures de cet adhérent depuis Juillet (DAF & DGA)"
                            >
                              <Scale className="w-4 h-4" />
                            </button>
                          )}

                          {/* Encaisser (Enregistrement / Caissière / DAF / DG) */}
                          {permissions.canRecord && (
                            <button
                              onClick={() => onNewCotisationForAdherent(adh)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Encaisser une cotisation"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}

                          {/* Modifier (code 0000) */}
                          {permissions.canEditRecords && (
                            <button
                              onClick={() => onEditAdherent(adh)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Modifier les informations (Code 0000 requis)"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Supprimer (code 0000) */}
                          {permissions.canDeleteRecords && (
                            <button
                              onClick={() => onDeleteAdherent(adh)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer l'adhérent (Code 0000 requis)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Régularisation Cotisations DAF / DGA */}
      <RegularisationModal
        isOpen={isRegularisationModalOpen}
        onClose={() => {
          setIsRegularisationModalOpen(false);
          setSelectedAdherentForReg(null);
        }}
        targetAdherentId={selectedAdherentForReg}
      />

      {/* Modal Changement Statut Adhérent DAF / DGA */}
      <StatutAdherentModal
        isOpen={isStatutModalOpen}
        onClose={() => {
          setIsStatutModalOpen(false);
          setSelectedAdherentForStatut(null);
        }}
        adherent={selectedAdherentForStatut}
      />
    </div>
  );
};
