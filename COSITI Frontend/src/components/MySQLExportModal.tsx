import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  generateFullMySQLDump,
  generateAllTableSQLFiles,
  generateMySQLImportReadme,
  downloadTextFile,
  downloadAllTablesZip,
  SQLTableFile,
} from '../utils/mysqlExportUtils';
import {
  Database,
  Download,
  FileCode,
  Copy,
  Check,
  X,
  FileArchive,
  Layers,
  BookOpen,
  Server,
  Code2,
  Table,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface MySQLExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MySQLExportModal: React.FC<MySQLExportModalProps> = ({ isOpen, onClose }) => {
  const {
    adherents,
    cotisations,
    depenses,
    versements,
    fraisMobileMoney,
    dossiers,
    parametres,
    utilisateurs,
    gestionnaires,
    journal,
    banques,
    employes,
    bulletinsPaie,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'tables' | 'preview' | 'guide'>('tables');
  const [selectedPreviewTable, setSelectedPreviewTable] = useState<string>('FULL_DUMP');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Données courantes en temps réel
  const appData = useMemo(() => {
    return {
      adherents,
      cotisations,
      depenses,
      versements,
      fraisMobileMoney,
      dossiers,
      parametres,
      utilisateurs,
      gestionnaires,
      journal,
      banques,
      employes,
      bulletinsPaie,
    };
  }, [
    adherents,
    cotisations,
    depenses,
    versements,
    fraisMobileMoney,
    dossiers,
    parametres,
    utilisateurs,
    gestionnaires,
    journal,
    banques,
    employes,
    bulletinsPaie,
  ]);

  // Liste des fichiers par table
  const tableFiles = useMemo(() => {
    return generateAllTableSQLFiles(appData);
  }, [appData]);

  // Dump consolidé complet
  const fullDump = useMemo(() => {
    return generateFullMySQLDump(appData);
  }, [appData]);

  // Contenu actuellement sélectionné dans l'aperçu
  const previewContent = useMemo(() => {
    if (selectedPreviewTable === 'FULL_DUMP') {
      return fullDump;
    }
    const found = tableFiles.find((t) => t.tableName === selectedPreviewTable);
    return found ? found.content : fullDump;
  }, [selectedPreviewTable, fullDump, tableFiles]);

  if (!isOpen) return null;

  // Téléchargement du Dump Complet
  const handleDownloadFullDump = () => {
    const today = new Date().toISOString().split('T')[0];
    const filename = `cositi_database_mysql_dump_${today}.sql`;
    downloadTextFile(filename, fullDump);
    setToastMessage(`Le fichier "${filename}" a été téléchargé avec succès.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Téléchargement ZIP Multi-fichiers
  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const ok = await downloadAllTablesZip(appData);
      if (ok) {
        setToastMessage(`L'archive ZIP complète des 12 tables MySQL a été téléchargée avec succès.`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsZipping(false);
    }
  };

  // Téléchargement d'une table spécifique
  const handleDownloadTable = (file: SQLTableFile) => {
    downloadTextFile(file.filename, file.content);
    setToastMessage(`La table "${file.tableName}" (${file.filename}) a été téléchargée.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Copie dans le presse-papier
  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(previewContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const totalEnregistrements =
    adherents.length +
    cotisations.length +
    depenses.length +
    versements.length +
    fraisMobileMoney.length +
    dossiers.length +
    utilisateurs.length +
    gestionnaires.length +
    (journal?.length || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[850px] flex flex-col overflow-hidden border border-slate-200">
        {/* En-tête de la modale */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex justify-between items-center shrink-0 border-b border-blue-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base text-white tracking-tight">
                  Exportation Base de Données MySQL
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  MySQL 5.7+ / 8.0+ / MariaDB
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Génération de scripts SQL prêts pour phpMyAdmin, serveurs VPS, Laragon, XAMPP ou Cloud SQL
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-blue-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre d'action rapide & KPIs */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
          <div className="flex items-center space-x-3 text-xs text-slate-600">
            <span className="flex items-center space-x-1 font-bold text-slate-800">
              <Table className="w-4 h-4 text-blue-600" />
              <span>12 Tables Structurées</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-700">
              {totalEnregistrements.toLocaleString('fr-FR')} enregistrements actuels
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              UTF-8 (utf8mb4)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadFullDump}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Télécharger l'intégralité de la base de données dans un seul fichier .sql"
            >
              <Database className="w-4 h-4" />
              <span>Dump Complet (.sql)</span>
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
              title="Télécharger une archive ZIP contenant chaque table dans un fichier SQL séparé"
            >
              <FileArchive className="w-4 h-4" />
              <span>{isZipping ? 'Compression...' : 'Multi-Fichiers (.zip)'}</span>
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {toastMessage && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Navigation par Onglets */}
        <div className="px-6 pt-2 border-b border-slate-200 flex space-x-4 bg-white shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('tables')}
            className={`pb-2.5 border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'tables'
                ? 'border-blue-700 text-blue-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Fichiers par Table (12 Fichiers)</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'preview'
                ? 'border-blue-700 text-blue-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Aperçu & Copie du Code SQL</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'guide'
                ? 'border-blue-700 text-blue-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Guide d'Importation MySQL & phpMyAdmin</span>
          </button>
        </div>

        {/* Contenu principal défilant */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* ONGLET 1 : GRILLE DES TABLES */}
          {activeTab === 'tables' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3 text-xs">
                <Server className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-blue-900">
                    Exportation modulaire ou globale des tables MySQL
                  </p>
                  <p className="text-blue-800 leading-relaxed">
                    Vous pouvez télécharger les tables une par une au format <code>.sql</code>, ou télécharger le dump consolidé unique qui contient l'ensemble des définitions <code>CREATE TABLE</code>, les clés primaires, les index et les ordres d'insertion <code>INSERT INTO</code>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {tableFiles.map((file) => (
                  <div
                    key={file.tableName}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileCode className="w-4 h-4 text-blue-700" />
                          <span className="font-extrabold text-xs text-slate-900">{file.label}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                          {file.count} lig.
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                        {file.description}
                      </p>
                      <div className="mt-2 text-[10px] font-mono text-slate-400">
                        Fichier : <code className="text-blue-800 font-bold">{file.filename}</code>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setSelectedPreviewTable(file.tableName);
                          setActiveTab('preview');
                        }}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Voir le code
                      </button>
                      <button
                        onClick={() => handleDownloadTable(file)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-lg border border-blue-200 transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600" />
                        <span>Télécharger .sql</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ONGLET 2 : APERÇU DU CODE SQL */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-bold text-slate-700">Afficher la table :</label>
                  <select
                    value={selectedPreviewTable}
                    onChange={(e) => setSelectedPreviewTable(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="FULL_DUMP">★ Base Complète Consolidée (Toutes les 12 tables)</option>
                    {tableFiles.map((f) => (
                      <option key={f.tableName} value={f.tableName}>
                        {f.label} ({f.filename})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopySQL}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Code Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-600" />
                        <span>Copier le Code SQL</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (selectedPreviewTable === 'FULL_DUMP') {
                        handleDownloadFullDump();
                      } else {
                        const target = tableFiles.find((t) => t.tableName === selectedPreviewTable);
                        if (target) handleDownloadTable(target);
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger ce fichier</span>
                  </button>
                </div>
              </div>

              {/* Bloc de code avec barre de défilement */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-md">
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center text-xs font-mono text-slate-400">
                  <span>
                    {selectedPreviewTable === 'FULL_DUMP'
                      ? 'cositi_database_mysql_dump.sql'
                      : tableFiles.find((t) => t.tableName === selectedPreviewTable)?.filename}
                  </span>
                  <span>UTF-8 (utf8mb4) • MySQL</span>
                </div>
                <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto max-h-[460px] leading-relaxed">
                  <code>{previewContent}</code>
                </pre>
              </div>
            </div>
          )}

          {/* ONGLET 3 : GUIDE D'IMPORTATION */}
          {activeTab === 'guide' && (
            <div className="space-y-5 text-slate-800 text-xs leading-relaxed max-w-4xl">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-sm font-extrabold text-blue-900 flex items-center space-x-2">
                  <Server className="w-4 h-4 text-blue-700" />
                  <span>Méthode 1 : Importation via phpMyAdmin (Recommandée pour cPanel, Laragon, XAMPP)</span>
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-700">
                  <li>Ouvrez votre interface web <strong>phpMyAdmin</strong>.</li>
                  <li>
                    Créez une nouvelle base de données nommée <code>cositi_ci</code> (Interclassement :{' '}
                    <code>utf8mb4_unicode_ci</code>).
                  </li>
                  <li>Sélectionnez la base <code>cositi_ci</code> dans la colonne de gauche.</li>
                  <li>Cliquez sur l'onglet <strong>Importer</strong> dans le menu supérieur.</li>
                  <li>
                    Cliquez sur <strong>Choisir un fichier</strong> et sélectionnez{' '}
                    <code>cositi_database_mysql_dump.sql</code>.
                  </li>
                  <li>Laissez le jeu de caractères sur <strong>utf-8</strong> et cliquez sur <strong>Exécuter</strong> en bas.</li>
                  <li>Toutes les tables et données sont créées et indexées automatiquement.</li>
                </ol>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                  <Code2 className="w-4 h-4 text-indigo-700" />
                  <span>Méthode 2 : Importation en Ligne de Commande (CLI / Terminal Linux / Windows)</span>
                </h4>
                <p className="text-slate-600">
                  Exécutez les deux commandes suivantes dans votre terminal ou invite de commandes :
                </p>
                <div className="p-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-xl overflow-x-auto space-y-2">
                  <div className="text-slate-400"># 1. Création de la base de données</div>
                  <div>mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS cositi_ci CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"</div>
                  <div className="text-slate-400 pt-2"># 2. Importation du fichier dump</div>
                  <div>mysql -u root -p cositi_ci &lt; cositi_database_mysql_dump.sql</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                  <FileArchive className="w-4 h-4 text-amber-700" />
                  <span>Méthode 3 : Importation Table par Table</span>
                </h4>
                <p className="text-slate-600">
                  Si vous préférez n'importer que certaines tables spécifiques (par exemple uniquement la table des adhérents ou des cotisations), téléchargez le pack <strong>Multi-Fichiers (.zip)</strong> et importez directement les fichiers dans l'ordre numérique :
                </p>
                <div className="p-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-xl overflow-x-auto">
                  <div>mysql -u root -p cositi_ci &lt; tables/04_adherents.sql</div>
                  <div>mysql -u root -p cositi_ci &lt; tables/05_cotisations.sql</div>
                  <div>mysql -u root -p cositi_ci &lt; tables/06_depenses_courantes.sql</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de la modale */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Fichiers 100% compatibles MySQL 5.7+, MySQL 8.0+, MariaDB 10+ et Cloud SQL</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
