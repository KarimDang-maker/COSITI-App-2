import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { formatFCFA } from '../utils/helpers';
import { getUserPermissions, ROLES_CONFIG, canPerformSoftwareUpdate } from '../utils/permissions';
import {
  Settings,
  Shield,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  Building,
  Save,
  Download,
  Eye,
  Users,
  Lock,
  UserCheck,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet,
  Database,
} from 'lucide-react';
import { Utilisateur } from '../types';
import { MiseAJourLogicielModal } from './MiseAJourLogicielModal';
import { MySQLExportModal } from './MySQLExportModal';
import { ExcelEchangeModal } from './ExcelEchangeModal';
import { downloadFile, errorMessage } from '../api/client';

export const ParametresView: React.FC = () => {
  const {
    parametres,
    updateParametres,
    resetToDemoData,
    adherents,
    cotisations,
    depenses,
    currentUser,
    utilisateurs,
    setCurrentUser,
    setActiveTab,
  } = useApp();
  const dialog = useDialog();
  const permissions = getUserPermissions(currentUser);
  const canUpdateSoftware = canPerformSoftwareUpdate(currentUser);

  const [nomOrganisation, setNomOrganisation] = useState(
    parametres?.nomOrganisation || 'COSITI — Coopérative du Secteur Informel et des Travailleurs Indépendants'
  );
  const [sigle, setSigle] = useState(parametres?.sigle || 'COSITI');
  const [seuilImmatriculation, setSeuilImmatriculation] = useState(
    parametres?.seuilImmatriculation || 15000
  );
  const [joursVerification, setJoursVerification] = useState(
    (parametres?.joursVerification || parametres?.joursVerificationCycle || [15, 30]).join(', ')
  );
  const [adresse, setAdresse] = useState(
    parametres?.adresse || 'Avenue des Banques, Quartier Bonanjo, B.P. 3140 Douala, Cameroun'
  );
  const [telephone, setTelephone] = useState(
    parametres?.telephone || '+237 233 42 15 89 / +237 677 88 99 00'
  );
  const [email, setEmail] = useState(parametres?.email || 'contact@cositi-cameroun.cm');

  const [isSaved, setIsSaved] = useState(false);
  const { logout } = useAuth();
  const [isMiseAJourModalOpen, setIsMiseAJourModalOpen] = useState(false);
  const [isMySQLModalOpen, setIsMySQLModalOpen] = useState(false);
  const [isExcelOpen, setIsExcelOpen] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canConfigure) return;

    const parsedJours = joursVerification
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    const finalJours = parsedJours.length > 0 ? parsedJours : [15, 30];

    const res = await updateParametres({
      nomOrganisation,
      sigle,
      seuilImmatriculation: Number(seuilImmatriculation),
      joursVerification: finalJours,
      joursVerificationCycle: finalJours,
      adresse,
      telephone,
      email,
    });

    if (!res.success) return;
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExportBackupExcel = () => {
    // Export / import Excel au format d'échange : produit et relu par le serveur
    setIsExcelOpen(true);
  };

  const handleExportBackup = () => {
    // Sauvegarde JSON complète produite par le serveur (sans aucun secret), tracée au journal
    downloadFile('GET', '/systeme/export', { filename: `COSITI_Backup_${new Date().toISOString().slice(0, 10)}.json` }).catch((e) =>
      window.alert(`Sauvegarde impossible : ${errorMessage(e)}`)
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Paramètres du Système & Règles Métier
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configuration des seuils, montants de cotisation, sécurité et coordonnées officielles
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire principal des paramètres */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                <Settings className="w-4 h-4 text-emerald-600" />
                <span>Paramètres Généraux & Règles Métier</span>
              </h2>

              {permissions.canConfigure ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-700" />
                  {currentUser.role === 'DAF'
                    ? 'Au ressort du DAF (Modification autorisée)'
                    : 'Direction Générale (Modification autorisée)'}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  <Eye className="w-3 h-3 mr-1 text-amber-700" />
                  Lecture seule ({currentUser.role})
                </span>
              )}
            </div>

            {!permissions.canConfigure && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-center space-x-2.5">
                <Eye className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Profil {currentUser.role} (Accès {currentUser.typeAcces}) :</strong> Vous consultez la configuration en lecture seule. La gestion des paramètres généraux est au ressort du <strong>DAF</strong> et de la Direction Générale (DG / DAF).
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nom de l'organisation
                </label>
                <input
                  type="text"
                  required
                  disabled={!permissions.canConfigure}
                  value={nomOrganisation}
                  onChange={(e) => setNomOrganisation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sigle officiel
                </label>
                <input
                  type="text"
                  required
                  disabled={!permissions.canConfigure}
                  value={sigle}
                  onChange={(e) => setSigle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Seuil d'immatriculation CNPS (FCFA) *
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  disabled={!permissions.canConfigure}
                  value={seuilImmatriculation}
                  onChange={(e) => setSeuilImmatriculation(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Fixé à 15 000 FCFA conformément au cahier des charges.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Jours du cycle de vérification
                </label>
                <input
                  type="text"
                  required
                  disabled={!permissions.canConfigure}
                  value={joursVerification}
                  onChange={(e) => setJoursVerification(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Séparés par une virgule (ex: 15, 30).
                </p>
              </div>

              <div className="sm:col-span-2 flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Coordonnées officielles & Contact (Cameroun)
                </span>
                {permissions.canConfigure && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdresse('Avenue des Banques, Quartier Bonanjo, B.P. 3140 Douala, Cameroun');
                      setTelephone('+237 233 42 15 89 / +237 677 88 99 00');
                      setEmail('contact@cositi-cameroun.cm');
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Rétablir coordonnées Cameroun (+237 / Douala)
                  </button>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Adresse du siège (Cameroun)
                </label>
                <input
                  type="text"
                  disabled={!permissions.canConfigure}
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="Ex: Avenue des Banques, Quartier Bonanjo, B.P. 3140 Douala, Cameroun"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Téléphone coopérative (Indicatif +237)
                </label>
                <input
                  type="text"
                  disabled={!permissions.canConfigure}
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="+237 233 42 15 89 / +237 677 88 99 00"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email officiel
                </label>
                <input
                  type="email"
                  disabled={!permissions.canConfigure}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@cositi-cameroun.cm"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              {isSaved ? (
                <span className="text-xs text-emerald-700 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Paramètres enregistrés avec succès !</span>
                </span>
              ) : (
                <span />
              )}

              {permissions.canConfigure ? (
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-98"
                >
                  <Save className="w-4 h-4" />
                  <span>Sauvegarder les paramètres</span>
                </button>
              ) : (
                <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-medium flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Configuration réservée au DAF et à la Direction Générale</span>
                </span>
              )}
            </div>
          </form>

          {/* Sauvegarde et export des données - Sous format Excel et JSON */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Sauvegarde & Données de l'application (Format Excel)</span>
              </h2>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                Format Recommandé : Excel (.xlsx)
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Conformément aux directives de gestion, la sauvegarde et l'exportation des données de l'application s'effectuent sous format <strong>Excel (.xlsx)</strong>. Le classeur généré par le serveur compile une feuille par donnée : <em>Adhérents, Cotisations, Dépenses, Versements, Frais Mobile Money, Employés, Gestionnaires, Banques et Bulletins de paie</em>. Il peut être modifié hors de l'application puis <strong>réimporté tel quel</strong>.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleExportBackupExcel}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-emerald-700/20 transition-all flex items-center space-x-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>Échange de données Excel : exporter / importer</span>
              </button>

              <button
                type="button"
                onClick={handleExportBackup}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
                title="Téléchargement brut pour maintenance informatique"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Sauvegarde JSON (Secondaire)</span>
              </button>
            </div>
          </div>

          {/* Exportation Base de Données MySQL (Scripts .sql et Multi-fichiers) */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl border border-blue-800 p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300">
                  <Database className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  Exportation Base de Données MySQL (.sql & Multi-Fichiers)
                </h2>
              </div>
              <span className="text-[10px] font-bold bg-blue-500/30 text-blue-200 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                MySQL 5.7+ / 8.0+ / MariaDB
              </span>
            </div>
            <p className="text-xs text-blue-100/90 leading-relaxed">
              Exportez l'intégralité des données actives pour une base de données MySQL. Vous pouvez télécharger le <strong>script SQL complet consolidé</strong> ou une archive <strong>multi-fichiers (.zip)</strong> avec chaque table séparée (adhérents, cotisations, versements, dépenses, dossiers CNPS) pour un import simplifié dans phpMyAdmin ou via la console MySQL.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsMySQLModalOpen(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
              >
                <Database className="w-4 h-4 text-blue-200" />
                <span>Ouvrir l'Espace Export MySQL (.sql / .zip)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Colonne latérale : Sécurité Code 0000 & Réinitialisation */}
        <div className="space-y-6">
          {/* Fiche Code 0000 */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-amber-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Code de Sécurité Obligatoire
              </h3>
            </div>
            <p className="text-xs text-amber-950 leading-relaxed">
              Pour prévenir toute erreur ou manipulation non autorisée, les actions sensibles exigent la confirmation par le code :
            </p>
            <div className="p-3 bg-white rounded-xl border border-amber-300 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Code de validation
              </span>
              <span className="text-2xl font-extrabold font-mono text-amber-900 tracking-widest">
                0000
              </span>
            </div>
            <ul className="text-[11px] text-amber-900 space-y-1 list-disc pl-4">
              <li>Modification d'un adhérent</li>
              <li>Suppression d'un adhérent</li>
              <li>Modification d'une cotisation</li>
              <li>Suppression d'une cotisation</li>
            </ul>
          </div>

          {/* Carte Mise à jour du logiciel (Effacement total des données - Habilités : PCA, DG et DAF) */}
          <div className="bg-rose-50/80 border-2 border-rose-300 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center space-x-2 text-rose-900">
              <RefreshCw className="w-5 h-5 text-rose-700 animate-spin-slow" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-950">
                Mise à jour du Logiciel
              </h3>
            </div>
            <p className="text-xs text-rose-900 leading-relaxed">
              Action majeure de réinitialisation logicielle. <strong>Les seules personnes habilitées à effectuer la mise à jour sont le PCA, le DG et le DAF</strong> (Validation par le code <strong>1111</strong>).
            </p>
            <div className="p-2.5 bg-white/90 rounded-xl border border-rose-200 text-[11px] text-rose-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Code de validation requis :</span>
                <span className="font-mono font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-xs">
                  1111
                </span>
              </div>
              <p className="text-[10px] text-rose-600">
                Efface les adhérents et cotisations pour démarrer un nouveau cycle et autorise le nouveau paramétrage.
              </p>
            </div>
            {canUpdateSoftware ? (
              <button
                type="button"
                onClick={() => setIsMiseAJourModalOpen(true)}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-rose-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Mettre à jour le logiciel (Code 1111)</span>
              </button>
            ) : (
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-center text-xs text-slate-500 font-medium">
                <Lock className="w-3.5 h-3.5 inline-block mr-1 text-slate-400" />
                <span>Mise à jour réservée au PCA, au DG et au DAF</span>
              </div>
            )}
          </div>

          {/* Réimport de la base initiale database_mysql (DG, DGA, DAF, Super Administrateur) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <RotateCcw className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Base initiale (database_mysql)
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Remplace toutes les données par celles du dump MySQL fourni (dossier <strong>database_mysql</strong>) et recrée les identifiants de connexion. Opération journalisée, code de confirmation exigé.
            </p>
            <button
              type="button"
              disabled={!permissions.canResetDemo}
              onClick={async () => {
                if (!permissions.canResetDemo) return;
                const confirmed = await dialog.confirm({
                  title: 'Réimporter la base initiale',
                  message: 'Toutes les données actuelles seront remplacées par celles du dossier database_mysql (dump MySQL fourni). Les comptes et identifiants de connexion sont recréés : vous devrez vous reconnecter. Continuer ?',
                  confirmText: 'Recharger les données',
                  cancelText: 'Annuler',
                  variant: 'warning',
                  icon: 'warning',
                });
                if (confirmed) {
                  const res = await resetToDemoData();
                  if (res.success) {
                    await dialog.alert({
                      title: 'Base réimportée',
                      message: 'Les données du dossier database_mysql ont été rechargées. Reconnectez-vous avec vos identifiants.',
                      variant: 'success',
                    });
                    await logout();
                  }
                }
              }}
              className={`w-full py-2 text-xs font-bold rounded-xl transition-colors ${
                permissions.canResetDemo
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {permissions.canResetDemo ? 'Réimporter la base initiale (database_mysql)' : 'Réservé à la Direction'}
            </button>
          </div>
        </div>
      </div>

      {/* Matrice des Profils & Habilitations COSITI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Matrice des Profils & Droits d'Accès COSITI</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Habilitations strictes selon la gouvernance de la coopérative. Cliquez sur un profil pour simuler sa session.
            </p>
          </div>

          <div className="text-xs text-slate-500 flex items-center space-x-1.5 self-start sm:self-auto">
            <span>Session active :</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
              {currentUser.nom} ({currentUser.role})
            </span>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3">Profil & Rôle</th>
                <th className="px-4 py-3">Type d'accès</th>
                <th className="px-4 py-3">Consultation</th>
                <th className="px-4 py-3">Enregistrement (Adhérents / Cotisations)</th>
                <th className="px-4 py-3">Modif. / Suppr. (Code 0000)</th>
                <th className="px-4 py-3">Immatriculation & Dossiers</th>
                <th className="px-4 py-3">Configuration & Audit</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {utilisateurs.map((u) => {
                const isCurrent = u.id === currentUser.id;
                const userPerms = getUserPermissions(u);

                const getRoleBadgeColor = () => {
                  switch (u.role) {
                    case 'DG':
                    case 'DGA':
                      return 'bg-purple-100 text-purple-800 border-purple-200';
                    case 'DAF':
                      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
                    case 'PCA':
                      return 'bg-amber-100 text-amber-900 border-amber-200';
                    case 'Conseil de Surveillance':
                      return 'bg-teal-100 text-teal-800 border-teal-200';
                    default:
                      return 'bg-blue-100 text-blue-800 border-blue-200';
                  }
                };

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors ${
                      isCurrent ? 'bg-emerald-50/50 font-medium' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            isCurrent
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {u.nom.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{u.nom}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-semibold">
                                Actif
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border mt-0.5 ${getRoleBadgeColor()}`}
                          >
                            {u.role}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          u.typeAcces === 'Consultation'
                            ? 'bg-amber-100 text-amber-900 border-amber-200'
                            : u.typeAcces === 'Administrateur, enregistrement et consultation' || u.typeAcces === 'Administrateur et enregistrement'
                            ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                            : u.typeAcces === 'Administrateur et consultation'
                            ? 'bg-purple-100 text-purple-900 border-purple-200'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                        }`}
                      >
                        {u.typeAcces}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {u.role === 'DAF' ? (
                        <span className="inline-flex items-center text-indigo-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                          Oui (Analytique & financière)
                        </span>
                      ) : u.role === 'DG' || u.role === 'DGA' ? (
                        <span className="inline-flex items-center text-purple-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-purple-600" />
                          Oui (Supervision globale)
                        </span>
                      ) : u.role === 'PCA' || u.role === 'Conseil de Surveillance' ? (
                        <span className="inline-flex items-center text-amber-800 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-amber-600" />
                          Oui (Lecture seule & audit)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Oui (Registres caisse)
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {userPerms.canRecord ? (
                        <span className="inline-flex items-center text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Autorisé
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-400 text-[11px]">
                          Désactivé
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {userPerms.canEditRecords ? (
                        <span className="inline-flex items-center text-purple-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-purple-600" />
                          Oui (Code 0000)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-400 text-[11px]">
                          Non autorisé
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {userPerms.canImmatriculer ? (
                        <span className="inline-flex items-center text-blue-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          Validation active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-400 text-[11px]">
                          Lecture seule
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {userPerms.canConfigure ? (
                        <span className="inline-flex items-center text-purple-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-purple-600" />
                          Complet (DG)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-400 text-[11px]">
                          Lecture seule
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {isCurrent ? (
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-end space-x-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Session en cours</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Fiches explicatives de gouvernance COSITI */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Gouvernance & Répartition des Habilitations COSITI
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ROLES_CONFIG.map((roleConf) => (
              <div
                key={roleConf.id}
                className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900">{roleConf.nomRole}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${roleConf.couleurBadge}`}>
                      {roleConf.typeAcces}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {roleConf.description}
                  </p>
                </div>
                <div className="border-t border-slate-200/80 pt-2 text-[11px] space-y-1">
                  <div className="font-semibold text-slate-700 text-[10px] uppercase">Droits clés :</div>
                  {roleConf.droitsCles.slice(0, 3).map((droit, idx) => (
                    <div key={idx} className="flex items-start text-slate-600 space-x-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">{droit}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ExcelEchangeModal isOpen={isExcelOpen} onClose={() => setIsExcelOpen(false)} />

      {/* Modal de Mise à jour du Logiciel (Effacement de toutes les données - Code 1111) */}
      <MiseAJourLogicielModal
        isOpen={isMiseAJourModalOpen}
        onClose={() => setIsMiseAJourModalOpen(false)}
        onOpenParametrageUsers={() => {
          setActiveTab('utilisateurs');
        }}
      />

      {/* Modal d'Exportation Base de Données MySQL */}
      <MySQLExportModal
        isOpen={isMySQLModalOpen}
        onClose={() => setIsMySQLModalOpen(false)}
      />
    </div>
  );
};
