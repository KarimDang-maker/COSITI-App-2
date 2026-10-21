import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DossierAllocations, StatutDossierAllocations } from '../types';
import { formatDateShort } from '../utils/helpers';
import { exportToExcel } from '../utils/exportUtils';
import {
  BrancheCnps,
  BRANCHES_CNPS,
  getBrancheConfig,
  OffreCnps,
} from '../data/cnpsBranches';
import { NouveauDossierCnpsModal } from './NouveauDossierCnpsModal';
import {
  FolderHeart,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  FileCheck,
  GraduationCap,
  Calendar,
  X,
  Filter,
  Eye,
  FolderPlus,
  Layers,
  HeartHandshake,
  ShieldAlert,
  Landmark,
  FileText,
  ArrowRight,
  Info,
  ChevronRight,
  UserX,
} from 'lucide-react';
import { getUserPermissions } from '../utils/permissions';

interface DossiersViewProps {
  onSelectDossier: (dossier: DossierAllocations) => void;
  onSelectAdherent: (adherentId: string) => void;
}

export const DossiersView: React.FC<DossiersViewProps> = ({
  onSelectDossier,
  onSelectAdherent,
}) => {
  const { dossiers, parametres, currentUser } = useApp();
  const permissions = getUserPermissions(currentUser);

  // Rubrique active : soit l'une des 3 branches officielles, soit TOUS
  const [activeRubrique, setActiveRubrique] = useState<BrancheCnps | 'TOUS'>('PRESTATIONS_FAMILIALES');
  // Sous-rubrique / offre sélectionnée (optionnelle)
  const [selectedOffreId, setSelectedOffreId] = useState<string>('ALL');

  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('TOUS');
  const [filterScolarite, setFilterScolarite] = useState<string>('TOUS');

  // Modal Nouveau Dossier CNPS
  const [isNouveauDossierOpen, setIsNouveauDossierOpen] = useState(false);
  const [nouveauModalBranche, setNouveauModalBranche] = useState<BrancheCnps>('PRESTATIONS_FAMILIALES');
  const [nouveauModalOffreId, setNouveauModalOffreId] = useState<string | undefined>();

  // Comptages par branche
  const countPF = dossiers.filter((d) => (d.branche || 'PRESTATIONS_FAMILIALES') === 'PRESTATIONS_FAMILIALES').length;
  const countRP = dossiers.filter((d) => d.branche === 'RISQUES_PROFESSIONNELS').length;
  const countPVID = dossiers.filter((d) => d.branche === 'PVID').length;

  const currentBrancheConfig = activeRubrique !== 'TOUS' ? getBrancheConfig(activeRubrique) : null;

  // Filtrage des dossiers
  const filteredDossiers = (dossiers || []).filter((d) => {
    if (!d) return false;
    const q = (search || '').toLowerCase().trim();
    const mat = (d.matricule || '').toLowerCase();
    const nomPrenom = (d.adherentNomPrenom || '').toLowerCase();
    const cnps = (d.numeroCnps || '').toLowerCase();
    const offre = (d.sousRubriqueOffre || '').toLowerCase();
    const obs = (d.observations || '').toLowerCase();

    const matchesSearch =
      !q ||
      mat.includes(q) ||
      nomPrenom.includes(q) ||
      cnps.includes(q) ||
      offre.includes(q) ||
      obs.includes(q);

    // Branche / Rubrique
    const dossierBranche = d.branche || 'PRESTATIONS_FAMILIALES';
    const matchesRubrique = activeRubrique === 'TOUS' || dossierBranche === activeRubrique;

    // Sous-rubrique Offre
    let matchesOffre = true;
    if (activeRubrique !== 'TOUS' && selectedOffreId !== 'ALL' && currentBrancheConfig) {
      const targetOffre = currentBrancheConfig.offres.find((o) => o.id === selectedOffreId);
      if (targetOffre) {
        const targetNom = (targetOffre.nom || '').toLowerCase().slice(0, 15);
        matchesOffre =
          d.sousRubriqueOffre === targetOffre.nom ||
          d.sousRubriqueOffre === targetOffre.id ||
          (targetNom ? (d.sousRubriqueOffre || '').toLowerCase().includes(targetNom) : false);
      }
    }

    const matchesStatut = filterStatut === 'TOUS' || d.statut === filterStatut;
    const matchesScolarite =
      filterScolarite === 'TOUS' ||
      (filterScolarite === 'OUI' && d.certificatsScolariteFournis) ||
      (filterScolarite === 'NON' && !d.certificatsScolariteFournis);

    return matchesSearch && matchesRubrique && matchesOffre && matchesStatut && matchesScolarite;
  });

  const handleExportExcel = () => {
    const data = filteredDossiers.map((d) => {
      const piecesRecues = d.pieces.filter((p) => p.recu).length;
      const totalPieces = d.pieces.length;
      const brancheName =
        d.branche === 'RISQUES_PROFESSIONNELS'
          ? 'Risques Professionnels'
          : d.branche === 'PVID'
          ? 'PVID'
          : 'Prestations Familiales';

      return {
        Matricule: d.matricule,
        Adhérent: d.adherentNomPrenom,
        'N° Matricule CNPS (Agent)': d.numeroCnps || 'En cours',
        'Rubrique CNPS': brancheName,
        'Sous-rubrique Offre': d.sousRubriqueOffre || 'Prestation standard',
        Statut: d.statut,
        'Pièces réunies': `${piecesRecues}/${totalPieces}`,
        'Nombre enfants': d.nombreEnfants || 0,
        'Certificats Scolarité Fournis': d.certificatsScolariteFournis ? 'OUI' : 'NON',
        'Date Dépôt': d.dateDepot || '—',
        'Date Transmission CNPS': d.dateTransmission || '—',
        'Date Relance': d.dateRelance || '—',
        Observations: d.observations || '',
      };
    });

    const titreFichier =
      activeRubrique === 'TOUS'
        ? 'Dossiers_CNPS_Toutes_Rubriques'
        : `Dossiers_CNPS_${activeRubrique}`;

    exportToExcel(data, `${titreFichier}_${new Date().toISOString().slice(0, 10)}`);
  };

  const getStatutBadge = (statut: StatutDossierAllocations) => {
    switch (statut) {
      case 'Sans enfant (Non éligible allocations)':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <UserX className="w-3 h-3 mr-1 text-indigo-600" />
            Sans enfant
          </span>
        );
      case 'Dossier complet':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Complet
          </span>
        );
      case 'Dossier transmis':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
            <Send className="w-3 h-3 mr-1" />
            Transmis CNPS
          </span>
        );
      case 'Dossier traité':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
            <FileCheck className="w-3 h-3 mr-1" />
            Traité / Accordé
          </span>
        );
      case 'Dossier incomplet':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
            <AlertCircle className="w-3 h-3 mr-1" />
            Incomplet
          </span>
        );
      case 'Dossier en cours':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
            <Clock className="w-3 h-3 mr-1" />
            En cours
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            Non commencé
          </span>
        );
    }
  };

  const handleOpenNouveauModal = (branche?: BrancheCnps, offreId?: string) => {
    setNouveauModalBranche(branche || (activeRubrique !== 'TOUS' ? activeRubrique : 'PRESTATIONS_FAMILIALES'));
    setNouveauModalOffreId(offreId);
    setIsNouveauDossierOpen(true);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider bg-blue-900 text-blue-100 rounded-full">
              CNPS Côte d'Ivoire
            </span>
            <span className="text-xs text-slate-400 font-mono font-bold">RSTI & Prévoyance</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Dossiers CNPS
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organisation des dossiers sous les 3 rubriques techniques : <strong>Prestations familiales</strong>, <strong>Risques professionnels</strong> et <strong>PVID</strong> avec le détail des sous-rubriques d'offres.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          {permissions.canManageDossiers && (
            <button
              onClick={() => handleOpenNouveauModal()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Nouveau Dossier CNPS</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Bannière d'information si Profil Consultation */}
      {permissions.isReadOnly && (
        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Eye className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Profil {currentUser.role} (Accès Consultation) :</strong> Consultation détaillée de l'état des dossiers CNPS, des pièces justificatives et export Excel autorisés.
            </span>
          </div>
        </div>
      )}

      {/* Cartes synthétiques des 3 Rubriques Officielles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Rubrique 1 : Prestations Familiales */}
        <button
          type="button"
          onClick={() => {
            setActiveRubrique('PRESTATIONS_FAMILIALES');
            setSelectedOffreId('ALL');
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
            activeRubrique === 'PRESTATIONS_FAMILIALES'
              ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-500 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              PF (Code 01)
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold text-slate-900 block">
              Prestations Familiales
            </span>
            <div className="text-2xl font-black text-rose-950 font-mono mt-0.5">
              {countPF}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Enfants, scolarité, maternité & naissances
            </span>
          </div>
        </button>

        {/* Rubrique 2 : Risques Professionnels */}
        <button
          type="button"
          onClick={() => {
            setActiveRubrique('RISQUES_PROFESSIONNELS');
            setSelectedOffreId('ALL');
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
            activeRubrique === 'RISQUES_PROFESSIONNELS'
              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
              RP (Code 02)
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold text-slate-900 block">
              Risques Professionnels
            </span>
            <div className="text-2xl font-black text-amber-950 font-mono mt-0.5">
              {countRP}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Accidents du travail, soins & rentes
            </span>
          </div>
        </button>

        {/* Rubrique 3 : PVID */}
        <button
          type="button"
          onClick={() => {
            setActiveRubrique('PVID');
            setSelectedOffreId('ALL');
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
            activeRubrique === 'PVID'
              ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
              <Landmark className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900">
              PVID (Code 03)
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold text-slate-900 block">
              PVID (Retraite & Décès)
            </span>
            <div className="text-2xl font-black text-indigo-950 font-mono mt-0.5">
              {countPVID}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Pension vieillesse, invalidité & réversion
            </span>
          </div>
        </button>

        {/* Rubrique 4 : Tous les Dossiers */}
        <button
          type="button"
          onClick={() => {
            setActiveRubrique('TOUS');
            setSelectedOffreId('ALL');
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
            activeRubrique === 'TOUS'
              ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
              Total Global
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold text-slate-900 block">
              Tous les Dossiers CNPS
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
              {dossiers.length}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Vue transverse multi-rubriques
            </span>
          </div>
        </button>
      </div>

      {/* Description détaillée de la Rubrique sélectionnée et ses Sous-rubriques d'offres */}
      {currentBrancheConfig && (
        <div className={`p-4 rounded-2xl border ${currentBrancheConfig.couleurBg} ${currentBrancheConfig.couleurBordure} space-y-3.5`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${currentBrancheConfig.couleurBadge}`}>
                  RUBRIQUE {currentBrancheConfig.code}
                </span>
                <h2 className="text-base font-extrabold text-slate-900">
                  {currentBrancheConfig.nom}
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                {currentBrancheConfig.description}
              </p>
            </div>

            {permissions.canManageDossiers && (
              <button
                onClick={() => handleOpenNouveauModal(currentBrancheConfig.id)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition-colors shrink-0 flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
              >
                <FolderPlus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ouvrir un dossier {currentBrancheConfig.code}</span>
              </button>
            )}
          </div>

          {/* Sous-rubriques des différentes offres de la branche */}
          <div className="pt-2 border-t border-slate-200/70">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
              Sous-rubriques des différentes offres ({currentBrancheConfig.offres.length} offres disponibles) :
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Option "Toutes les offres de la branche" */}
              <button
                type="button"
                onClick={() => setSelectedOffreId('ALL')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedOffreId === 'ALL'
                    ? 'bg-white border-slate-900 ring-2 ring-slate-800 shadow-xs'
                    : 'bg-white/70 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Toutes les offres</span>
                  {selectedOffreId === 'ALL' && <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />}
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Afficher tous les dossiers de cette rubrique
                </span>
              </button>

              {/* Les différentes offres de la branche */}
              {currentBrancheConfig.offres.map((offre) => {
                const isSelected = selectedOffreId === offre.id;
                const offreNomLower = (offre.nom || '').toLowerCase().slice(0, 15);
                const dossiersInThisOffre = (dossiers || []).filter(
                  (d) =>
                    (d.branche || 'PRESTATIONS_FAMILIALES') === currentBrancheConfig.id &&
                    (d.sousRubriqueOffre === offre.nom ||
                      d.sousRubriqueOffre === offre.id ||
                      (offreNomLower ? (d.sousRubriqueOffre || '').toLowerCase().includes(offreNomLower) : false))
                ).length;

                return (
                  <button
                    key={offre.id}
                    type="button"
                    onClick={() => setSelectedOffreId(offre.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white border-slate-900 ring-2 ring-slate-800 shadow-xs'
                        : 'bg-white/70 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 leading-snug">
                          {offre.nom}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-900 shrink-0 mt-0.5" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 line-clamp-2 mt-1">
                        {offre.description}
                      </span>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="font-mono font-bold text-slate-700">
                        {dossiersInThisOffre} dossier(s)
                      </span>
                      <span className="text-emerald-700 font-semibold truncate max-w-[120px]">
                        {offre.delaiTraitement}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fiche descriptive si une offre précise est sélectionnée */}
          {selectedOffreId !== 'ALL' && (
            (() => {
              const currentOffre = currentBrancheConfig.offres.find((o) => o.id === selectedOffreId);
              if (!currentOffre) return null;
              return (
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs animate-in fade-in duration-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 block">
                        Détail de l'offre : {currentOffre.nom}
                      </span>
                      <p className="text-slate-600 text-xs mt-0.5">
                        {currentOffre.description}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {currentOffre.montantReference}
                      </span>
                      {permissions.canManageDossiers && (
                        <button
                          onClick={() => handleOpenNouveauModal(currentBrancheConfig.id, currentOffre.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                          <span>Ouvrir pour cette offre</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-[11px]">
                    <div>
                      <span className="font-bold text-slate-500 uppercase block mb-1">
                        Délai moyen d'instruction CNPS :
                      </span>
                      <span className="font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {currentOffre.delaiTraitement}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase block mb-1">
                        Pièces obligatoires exigées ({currentOffre.piecesDefaut.length}) :
                      </span>
                      <ul className="space-y-0.5 text-slate-700">
                        {currentOffre.piecesDefaut.map((p, idx) => (
                          <li key={idx} className="flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                            <span>{p.nom} {p.obligatoire && <strong className="text-rose-600">*</strong>}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Barre de recherche et filtres */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher par Matricule, Adhérent, N° CNPS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            >
              <option value="TOUS">Tous les statuts de dossier</option>
              {parametres.statutsDossiers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterScolarite}
              onChange={(e) => setFilterScolarite(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            >
              <option value="TOUS">Tous certificats de scolarité</option>
              <option value="OUI">Certificats de scolarité fournis</option>
              <option value="NON">Certificats de scolarité manquants</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des dossiers CNPS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredDossiers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <FolderHeart className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">Aucun dossier CNPS trouvé pour ces critères.</p>
            <p className="text-slate-400">
              {activeRubrique !== 'TOUS'
                ? `Vous pouvez créer un dossier dans la rubrique "${currentBrancheConfig?.nom}" en cliquant sur "+ Nouveau Dossier CNPS".`
                : 'Créez un nouveau dossier ou modifiez les filtres de recherche.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-4 py-3.5">Matricule COSITI</th>
                  <th className="px-4 py-3.5">Adhérent & Famille</th>
                  <th className="px-4 py-3.5">Matricule CNPS (Agent)</th>
                  <th className="px-4 py-3.5">Rubrique & Sous-rubrique Offre</th>
                  <th className="px-4 py-3.5">Statut Dossier</th>
                  <th className="px-4 py-3.5">Pièces Réunies</th>
                  <th className="px-4 py-3.5">Transmission / Dépôt</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDossiers.map((dos) => {
                  const piecesRecues = dos.pieces.filter((p) => p.recu).length;
                  const totalPieces = dos.pieces.length;
                  const isComplet = piecesRecues === totalPieces && totalPieces > 0;
                  const dossierBranche = dos.branche || 'PRESTATIONS_FAMILIALES';
                  const brancheConfig = getBrancheConfig(dossierBranche);

                  return (
                    <tr key={dos.id} className="hover:bg-slate-50 transition-colors">
                      {/* Matricule COSITI */}
                      <td className="px-4 py-3 font-mono font-bold">
                        <button
                          onClick={() => onSelectAdherent(dos.adherentId)}
                          className="bg-blue-50 text-blue-900 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 transition-colors cursor-pointer"
                        >
                          {dos.matricule}
                        </button>
                      </td>

                      {/* Adhérent */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onSelectDossier(dos)}
                          className="font-bold text-slate-900 hover:text-blue-700 text-left cursor-pointer group block"
                        >
                          <span className="group-hover:underline">{dos.adherentNomPrenom}</span>
                          <span className="text-[10px] text-slate-400 font-normal block">
                            {dos.sansEnfant || dos.statut === 'Sans enfant (Non éligible allocations)'
                              ? 'Travailleur sans enfant (dispensé)'
                              : `${dos.nombreEnfants || 0} enfant(s) à charge`}
                          </span>
                        </button>
                      </td>

                      {/* CNPS renseigné par l'agent */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">
                        {dos.numeroCnps ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {dos.numeroCnps}
                          </span>
                        ) : (
                          <span className="text-amber-700 italic text-[11px]">Non renseigné</span>
                        )}
                      </td>

                      {/* Rubrique CNPS & Sous-rubrique Offre */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.2 rounded ${brancheConfig.couleurBadge}`}>
                            {brancheConfig.code} • {brancheConfig.titreCourt}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 block truncate max-w-xs">
                            {dos.sousRubriqueOffre || 'Prestation standard'}
                          </span>
                        </div>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3">{getStatutBadge(dos.statut)}</td>

                      {/* Pièces */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`font-mono font-bold ${
                              isComplet ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {piecesRecues}/{totalPieces}
                          </span>
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                isComplet ? 'bg-emerald-600' : 'bg-amber-500'
                              }`}
                              style={{
                                width: totalPieces > 0 ? `${(piecesRecues / totalPieces) * 100}%` : '0%',
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Date dépôt / transmission */}
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {dos.dateTransmission ? (
                          <span>Transmis le {formatDateShort(dos.dateTransmission)}</span>
                        ) : dos.dateDepot ? (
                          <span>Déposé le {formatDateShort(dos.dateDepot)}</span>
                        ) : (
                          <span className="text-slate-400">Non déposé</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onSelectDossier(dos)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1 ml-auto cursor-pointer ${
                            permissions.canManageDossiers
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {permissions.canManageDossiers ? (
                            <>
                              <FolderHeart className="w-3.5 h-3.5" />
                              <span>Gérer le dossier</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Consulter</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale de création d'un nouveau dossier CNPS */}
      <NouveauDossierCnpsModal
        isOpen={isNouveauDossierOpen}
        onClose={() => setIsNouveauDossierOpen(false)}
        defaultBranche={nouveauModalBranche}
        defaultOffreId={nouveauModalOffreId}
      />
    </div>
  );
};
