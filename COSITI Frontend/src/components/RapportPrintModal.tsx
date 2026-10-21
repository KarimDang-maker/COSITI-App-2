import React, { useRef, useState } from 'react';
import { ParametresApp } from '../types';
import { formatFCFA, formatDateShort } from '../utils/helpers';
import { generateReportPdf } from '../utils/pdfReportGenerator';
import { exportToExcel } from '../utils/exportUtils';
import {
  X,
  Printer,
  Download,
  FileSpreadsheet,
  Copy,
  Check,
  ShieldCheck,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface RapportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  tableHeaders: string[];
  tableRows: any[][];
  reportData: any[];
  selectedRapport: string;
  parametres: ParametresApp;
}

export const RapportPrintModal: React.FC<RapportPrintModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  tableHeaders,
  tableRows,
  reportData,
  selectedRapport,
  parametres,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Téléchargement du PDF officiel
  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    setFeedbackMessage(null);
    try {
      const ok = generateReportPdf({
        title,
        description,
        headers: tableHeaders,
        rows: tableRows,
        parametres,
        fileName: `Rapport_COSITI_${selectedRapport}`,
      });

      if (ok) {
        setFeedbackMessage('Document PDF officiel téléchargé avec succès !');
        setTimeout(() => setFeedbackMessage(null), 4000);
      } else {
        setFeedbackMessage('Une erreur est survenue lors de la création du PDF.');
      }
    } catch (e) {
      console.error('Erreur PDF:', e);
      setFeedbackMessage('Erreur lors du téléchargement du PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Impression sécurisée utilisant une iframe isolée (fonctionne même dans l'environnement iframe sandbox)
  const handlePrint = () => {
    setFeedbackMessage(null);
    try {
      const printContent = printAreaRef.current;
      if (!printContent) {
        window.print();
        return;
      }

      // Création d'une iframe cachée pour isoler le flux d'impression
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = 'none';

      document.body.appendChild(printIframe);

      const iframeDoc = printIframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${title} - ${parametres?.nomOrganisation || 'COSITI'}</title>
              <style>
                @page {
                  size: A4 landscape;
                  margin: 10mm;
                }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  color: #0f172a;
                  margin: 0;
                  padding: 12px;
                  background: #ffffff;
                  font-size: 11px;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 14px;
                  font-size: 10px;
                }
                th {
                  background-color: #065f46;
                  color: #ffffff;
                  font-weight: bold;
                  text-align: left;
                  padding: 6px 8px;
                  border: 1px solid #065f46;
                  text-transform: uppercase;
                  font-size: 9px;
                }
                td {
                  padding: 5px 8px;
                  border: 1px solid #cbd5e1;
                }
                tr:nth-child(even) td {
                  background-color: #f8fafc;
                }
                .header-bar {
                  border-bottom: 2px solid #065f46;
                  padding-bottom: 10px;
                  margin-bottom: 12px;
                  display: flex;
                  justify-content: space-between;
                }
                .title-box {
                  background-color: #f1f5f9;
                  border: 1px solid #cbd5e1;
                  padding: 8px 12px;
                  border-radius: 6px;
                  margin-bottom: 10px;
                }
                .signatures {
                  margin-top: 25px;
                  display: flex;
                  justify-content: space-between;
                  page-break-inside: avoid;
                }
                .sig-box {
                  width: 30%;
                  border-top: 1px dashed #64748b;
                  padding-top: 6px;
                  font-size: 9.5px;
                  text-align: center;
                }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        iframeDoc.close();

        // Attendre le chargement complet des styles puis imprimer
        setTimeout(() => {
          try {
            printIframe.contentWindow?.focus();
            printIframe.contentWindow?.print();
          } catch (err) {
            console.warn('Iframe print failed, falling back to window.print():', err);
            window.print();
          } finally {
            setTimeout(() => {
              document.body.removeChild(printIframe);
            }, 1000);
          }
        }, 300);
      } else {
        window.print();
      }
    } catch (e) {
      console.warn('Impression navigateur:', e);
      window.print();
    }
  };

  // Copier les données tabulaires pour collage direct dans Excel / Word
  const handleCopyTable = () => {
    try {
      const headerLine = tableHeaders.join('\t');
      const rowLines = tableRows.map((r) => r.join('\t')).join('\n');
      const fullText = `${title}\n${description}\n\n${headerLine}\n${rowLines}`;
      navigator.clipboard.writeText(fullText);
      setCopySuccess(true);
      setFeedbackMessage('Données copiées dans le presse-papier (prêtes à être collées dans Excel) !');
      setTimeout(() => {
        setCopySuccess(false);
        setFeedbackMessage(null);
      }, 3000);
    } catch (e) {
      console.warn('Clipboard non supporté:', e);
    }
  };

  const handleExportExcel = () => {
    exportToExcel(reportData, `Rapport_COSITI_${selectedRapport}`);
    setFeedbackMessage('Export Excel généré avec succès.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Barre d'outils supérieure */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-emerald-700/80 rounded-xl text-white">
              <Printer className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-extrabold text-white">
                  Aperçu avant Impression & Export Officiel
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Format A4 • Certifié Conforme
                </span>
              </div>
              <p className="text-[11px] text-slate-300 line-clamp-1">{title}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyTable}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Copier les données tabulaires"
            >
              {copySuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copier tableau</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Télécharger en format Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
              title="Générer et télécharger le PDF vectoriel certifié"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Génération...' : 'Télécharger PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-extrabold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Lancer l'impression"
            >
              <Printer className="w-3.5 h-3.5 text-slate-700" />
              <span>Lancer l'impression</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer ml-1"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message de feedback temporaire */}
        {feedbackMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-900 flex items-center space-x-2 shrink-0 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Zone de contenu défilable / Papier A4 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100">
          <div
            ref={printAreaRef}
            className="bg-white rounded-xl shadow-lg border border-slate-300 max-w-[297mm] mx-auto p-8 sm:p-10 space-y-6 text-slate-900 print:shadow-none print:border-none print:p-0"
          >
            {/* En-tête officiel imprimable */}
            <div className="border-b-2 border-emerald-800 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-xs">
                    {parametres?.sigle ? parametres.sigle.slice(0, 1) : 'C'}
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase font-mono tracking-wider text-emerald-800 block">
                      {parametres?.nomOrganisation || 'COSITI - Coopérative de Solidarité et des Travailleurs Indépendants'}
                    </span>
                    <span className="text-xs text-slate-600 italic block mt-0.5">
                      "{parametres?.slogan || 'Solidarité - Prévoyance - Dignité des Travailleurs'}"
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-x-3">
                      <span>{parametres?.adresse || 'Abidjan, Côte d\'Ivoire'}</span>
                      <span>• Tél : {parametres?.telephone || '+225 05 45 67 89 01'}</span>
                      <span>• Email : {parametres?.email || 'contact@cositi-ci.org'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-500 shrink-0">
                  <div className="font-bold text-slate-800 flex items-center justify-end space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>DOCUMENT OFFICIEL CERTIFIÉ</span>
                  </div>
                  <div className="mt-0.5">
                    Édité le : {new Date().toLocaleDateString('fr-FR')} à{' '}
                    {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="font-bold text-emerald-800 mt-0.5">
                    Total enregistrements : {tableRows.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Titre et description officielle du rapport */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {title}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">{description}</p>
              </div>
              <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Lignes du rapport
                </span>
                <span className="font-mono font-extrabold text-sm text-emerald-800">
                  {tableRows.length}
                </span>
              </div>
            </div>

            {/* Tableau de données */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-emerald-800 text-white uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    {tableHeaders.map((h, i) => {
                      const isAmount =
                        h.toLowerCase().includes('montant') ||
                        h.toLowerCase().includes('cumul') ||
                        h.toLowerCase().includes('tarif') ||
                        h.toLowerCase().includes('fcfa');
                      return (
                        <th
                          key={i}
                          className={`px-3 py-2.5 border-r border-emerald-700 last:border-r-0 ${
                            isAmount ? 'text-right' : 'text-left'
                          }`}
                        >
                          {h}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {tableRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={tableHeaders.length}
                        className="p-8 text-center text-slate-400"
                      >
                        Aucun enregistrement à afficher pour ce rapport.
                      </td>
                    </tr>
                  ) : (
                    tableRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                      >
                        {row.map((cell, cIdx) => {
                          const h = tableHeaders[cIdx] || '';
                          const isAmount =
                            h.toLowerCase().includes('montant') ||
                            h.toLowerCase().includes('cumul') ||
                            h.toLowerCase().includes('tarif') ||
                            h.toLowerCase().includes('fcfa');
                          return (
                            <td
                              key={cIdx}
                              className={`px-3 py-2 border-r border-slate-100 last:border-r-0 text-slate-800 text-[11px] ${
                                isAmount ? 'text-right font-mono font-bold' : ''
                              }`}
                            >
                              {cell}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Blocs de signatures et visa légal */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs page-break-inside-avoid">
              <div className="space-y-12">
                <div>
                  <span className="font-extrabold text-slate-800 uppercase block tracking-wider text-[10px]">
                    L'Agent Opérationnel
                  </span>
                  <span className="text-[10px] text-slate-400 italic">
                    Établi et vérifié sur le terrain
                  </span>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1 text-[10px] text-slate-500">
                  Signature & Date
                </div>
              </div>

              <div className="space-y-12">
                <div>
                  <span className="font-extrabold text-slate-800 uppercase block tracking-wider text-[10px]">
                    Direction Financière (DAF)
                  </span>
                  <span className="text-[10px] text-slate-400 italic">
                    Contrôle comptable et conformité
                  </span>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1 text-[10px] text-slate-500">
                  Visa & Cachet DAF
                </div>
              </div>

              <div className="space-y-12">
                <div>
                  <span className="font-extrabold text-slate-800 uppercase block tracking-wider text-[10px]">
                    Direction Générale (DG)
                  </span>
                  <span className="text-[10px] text-slate-400 italic">
                    Approbation officielle et transmission
                  </span>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1 text-[10px] text-slate-500">
                  Signature DG & Sceau COSITI
                </div>
              </div>
            </div>

            {/* Pied de page imprimable */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>
                Document officiel généré par le Système Intégré de Gestion COSITI (Abidjan).
              </span>
              <span>Page 1 sur 1 • Certifié conforme aux registres de la coopérative</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
