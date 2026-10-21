import { sumMoney } from '../utils/money';
import React, { useState, useMemo } from 'react';
import { Cotisation, Adherent, ParametresApp } from '../types';
import { formatFCFA, formatDateFr } from '../utils/helpers';
import { Printer, X, CheckCircle2, Shield, FileDown, Check, Coins, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';

import { generateReceiptA5Pdf } from '../utils/pdfReceiptGenerator';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotisation: Cotisation | null;
  adherent?: Adherent | null;
  parametres?: ParametresApp;
  allCotisations?: Cotisation[];
  defaultTypeMontant?: 'CUMUL_MENSUEL' | 'VERSEMENT_PONCTUEL';
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  cotisation,
  adherent: propAdherent,
  parametres: propParametres,
  allCotisations: propAllCotisations,
  defaultTypeMontant = 'CUMUL_MENSUEL',
}) => {
  const { parametres: contextParametres, adherents, cotisations: contextCotisations } = useApp();
  const [typeMontant, setTypeMontant] = useState<'CUMUL_MENSUEL' | 'VERSEMENT_PONCTUEL'>(defaultTypeMontant);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const cotisationsList = propAllCotisations || contextCotisations || [];

  const currentParametres = propParametres || contextParametres;
  const currentAdherent =
    propAdherent ||
    (cotisation
      ? adherents?.find(
          (a) => a.id === cotisation.adherentId || a.matricule === cotisation.matricule
        )
      : null);

  // Calcul des versements du mois et du cumul mensuel de cet adhérent
  const memberCotisationsDuMois = useMemo(() => {
    if (!cotisation) return [];
    const adhId = cotisation.adherentId;
    const mat = cotisation.matricule;
    const targetMois = cotisation.mois;
    const targetAnnee = cotisation.annee;
    const targetDateMois = cotisation.datePaiement ? cotisation.datePaiement.slice(0, 7) : '';

    return cotisationsList.filter((c) => {
      const matchAdh = (adhId && c.adherentId === adhId) || (mat && c.matricule === mat);
      if (!matchAdh) return false;
      const matchMoisAnnee =
        (targetMois && targetAnnee && c.mois === targetMois && c.annee === targetAnnee) ||
        (targetDateMois && c.datePaiement && c.datePaiement.startsWith(targetDateMois));
      return matchMoisAnnee;
    });
  }, [cotisation, cotisationsList]);

  const cumulMensuel = useMemo(() => {
    if (!cotisation) return 0;
    if (memberCotisationsDuMois.length === 0) return cotisation.montant;
    return sumMoney(memberCotisationsDuMois);
  }, [memberCotisationsDuMois, cotisation]);

  if (!isOpen || !cotisation) return null;

  const isCumul = typeMontant === 'CUMUL_MENSUEL';
  const montantAffiche = isCumul ? cumulMensuel : cotisation.montant;
  const tarifJournalier = currentAdherent?.tarifJournalier || 700;
  const joursCouvertsCeMois = Math.floor(cumulMensuel / tarifJournalier);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    try {
      const success = generateReceiptA5Pdf({
        cotisation,
        adherent: currentAdherent,
        parametres: currentParametres,
        typeMontant,
        cumulMensuel,
        cotisationsDuMois: memberCotisationsDuMois,
      });
      if (success) {
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 2500);
      }
    } catch (e) {
      console.error('Erreur export PDF A5:', e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      {/* Styles d'impression calibrés en format A5 */}
      <style>{`
        @page {
          size: A5 portrait;
          margin: 6mm;
        }
        @media print {
          body {
            background-color: #ffffff !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          #printable-receipt {
            padding: 4mm !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Actions bar (hidden in print) */}
        <div className="p-3.5 bg-slate-100 border-b border-slate-200 space-y-2.5 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-slate-700 text-xs sm:text-sm font-semibold">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Reçu officiel d'encaissement</span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Format A5
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Bouton Exporter / Enregistrer en PDF Format A5 */}
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                  exportSuccess
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-98'
                }`}
                title="Enregistrer et télécharger le reçu au format fichier PDF A5 officiel"
              >
                {exportSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
                    <span>PDF A5 Enregistré !</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                    <span>{isExportingPdf ? 'Génération...' : 'Enregistrer en PDF (A5)'}</span>
                  </>
                )}
              </button>

              {/* Bouton Imprimer le reçu */}
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer active:scale-98"
                title="Imprimer directement le reçu sur imprimante ou PDF"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                <span>Imprimer</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sélecteur du montant du reçu : Cumul Mensuel (Par défaut) vs Versement Ponctuel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs">
            <span className="text-slate-600 font-semibold flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-emerald-700" />
              <span>Base du montant sur le reçu imprimé :</span>
            </span>

            <div className="inline-flex p-0.5 rounded-lg bg-slate-200 border border-slate-300">
              <button
                type="button"
                onClick={() => setTypeMontant('CUMUL_MENSUEL')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isCumul
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
                title="Imprimer au montant total du cumul mensuel cotisé par l'adhérent"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Cumul Mensuel ({formatFCFA(cumulMensuel)})</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-900/40 text-emerald-100 uppercase">
                  Recommandé
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTypeMontant('VERSEMENT_PONCTUEL')}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  !isCumul
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
                title="Imprimer uniquement au montant du versement ponctuel sélectionné"
              >
                <span>Versement du jour ({formatFCFA(cotisation.montant)})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Reçu imprimable */}
        <div className="p-8 bg-white text-slate-900 print:p-0 print:m-0" id="printable-receipt">
          {/* Entête institutionnelle */}
          <div className="border-b-2 border-emerald-800 pb-4 mb-5 text-center relative">
            <div className="inline-block px-3 py-1 bg-emerald-800 text-white text-xs font-extrabold rounded-md tracking-wider uppercase mb-1">
              {currentParametres?.sigle || 'COSITI'}
            </div>
            <h1 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
              {currentParametres?.nomOrganisation || 'COSITI — Coopérative du Secteur Informel et des Travailleurs Indépendants'}
            </h1>
            <p className="text-[11px] text-emerald-800 font-semibold italic mt-0.5">
              « {currentParametres?.slogan || 'Solidarité • Prévoyance • Dignité des Travailleurs Informels'} »
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              {currentParametres?.adresse || ''} • Tél : {currentParametres?.telephone || ''} • Email : {currentParametres?.email || ''}
            </p>
          </div>

          {/* Titre du document et numéro */}
          <div className="flex items-center justify-between bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/60 mb-5">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                {isCumul ? 'REÇU OFFICIEL DE COTISATIONS — CUMUL MENSUEL' : 'REÇU DE COTISATION JOURNALIÈRE'}
              </span>
              <span className="text-xs font-mono font-bold text-slate-800">
                N° {cotisation.reference || `REC-${cotisation.id.slice(-6).toUpperCase()}`}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">Date d'encaissement</span>
              <span className="text-xs font-bold text-slate-800">
                {formatDateFr(cotisation.datePaiement)}
              </span>
            </div>
          </div>

          {/* Adhérent & Cotisation détails */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-5">
            <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Identité de l'Adhérent
              </span>
              <div className="font-bold text-slate-900 text-sm">
                {cotisation.adherentNomPrenom}
              </div>
              <div>
                <span className="text-slate-500">Matricule : </span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                  {cotisation.matricule}
                </span>
              </div>
              {currentAdherent && (
                <>
                  <div>
                    <span className="text-slate-500">Activité : </span>
                    <span className="font-medium text-slate-800">{currentAdherent.profession}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Téléphone : </span>
                    <span className="font-medium text-slate-800">{currentAdherent.telephone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">N° CNPS : </span>
                    <span className="font-mono font-semibold text-slate-800">
                      {currentAdherent.numeroCnps || 'En cours d\'attribution'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Détails du Paiement & Période
              </span>
              <div>
                <span className="text-slate-500">Mode : </span>
                <span className="font-semibold text-slate-800">{cotisation.modePaiement}</span>
              </div>
              <div>
                <span className="text-slate-500">Mois d'imputation : </span>
                <span className="font-bold text-slate-900 bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded border border-blue-200">
                  {cotisation.mois} {cotisation.annee}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Agent caisse : </span>
                <span className="font-medium text-slate-800">{cotisation.agentEnregistreur}</span>
              </div>
              <div>
                <span className="text-slate-500">Total versements dans le mois : </span>
                <span className="font-bold text-emerald-800">
                  {memberCotisationsDuMois.length} versement(s)
                </span>
              </div>
              {cotisation.observations && (
                <div className="text-[11px] text-slate-600 italic">
                  Note : {cotisation.observations}
                </div>
              )}
            </div>
          </div>

          {/* Grand encadré Montant (Affiche le Cumul Mensuel par défaut) */}
          <div className="bg-emerald-700 text-white p-4 rounded-xl text-center shadow-xs mb-5">
            <span className="text-[11px] uppercase tracking-widest font-semibold opacity-90 block mb-1">
              {isCumul
                ? `Montant Total du Cumul Mensuel Encaissé (${cotisation.mois} ${cotisation.annee})`
                : 'Montant du Versement Encaissé'}
            </span>
            <div className="text-3xl font-extrabold tracking-tight">
              {formatFCFA(montantAffiche)}
            </div>
            <div className="text-[11px] mt-1 opacity-90 flex items-center justify-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {isCumul
                  ? `Cumul certifié régulier auprès de la trésorerie COSITI • ${memberCotisationsDuMois.length} versement(s)`
                  : 'Paiement certifié régulier auprès de la trésorerie COSITI'}
              </span>
            </div>
          </div>

          {/* Récapitulatif Prévoyance & Cumul */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 text-xs mb-5 space-y-1.5">
            <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1.5 flex items-center justify-between">
              <span>Récapitulatif de cotisation de l'adhérent — {cotisation.mois} {cotisation.annee}</span>
              <span className="text-emerald-800 font-bold font-mono">
                Tarif : {tarifJournalier} F/j
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Versement du jour</span>
                <span className="font-mono font-bold text-slate-900 text-xs">
                  {formatFCFA(cotisation.montant)}
                </span>
              </div>

              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                <span className="text-emerald-800 font-semibold block">Cumul du mois</span>
                <span className="font-mono font-extrabold text-emerald-900 text-xs">
                  {formatFCFA(cumulMensuel)}
                </span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Jours couverts</span>
                <span className="font-bold text-slate-900 text-xs">
                  {joursCouvertsCeMois} jours
                </span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Seuil CNPS (15 000 F)</span>
                <span className={`font-bold text-xs ${cumulMensuel >= 15000 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {cumulMensuel >= 15000 ? 'Atteint (Éligible)' : `${formatFCFA(Math.max(0, 15000 - cumulMensuel))} restant`}
                </span>
              </div>
            </div>
          </div>

          {/* Mini-tableau des versements du mois si multiple */}
          {memberCotisationsDuMois.length > 1 && (
            <div className="mb-5 overflow-hidden rounded-lg border border-slate-200 text-[10px]">
              <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 flex justify-between items-center">
                <span>Détail chronologique des versements du mois ({cotisation.mois} {cotisation.annee}) :</span>
                <span className="text-emerald-800 font-mono font-extrabold">Total : {formatFCFA(cumulMensuel)}</span>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-1 px-3">Date</th>
                    <th className="py-1 px-2 font-mono">Référence</th>
                    <th className="py-1 px-2">Mode</th>
                    <th className="py-1 px-3 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {memberCotisationsDuMois.map((item) => (
                    <tr
                      key={item.id}
                      className={item.id === cotisation.id ? 'bg-emerald-50/70 font-semibold' : ''}
                    >
                      <td className="py-1 px-3">{formatDateFr(item.datePaiement)}</td>
                      <td className="py-1 px-2 font-mono text-slate-500">{item.reference || '—'}</td>
                      <td className="py-1 px-2">{item.modePaiement}</td>
                      <td className="py-1 px-3 text-right font-mono font-bold text-slate-900">
                        {formatFCFA(item.montant)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-slate-200">
            <div className="text-center">
              <span className="text-slate-500 font-medium block mb-8">L'Adhérent</span>
              <div className="h-6 border-b border-dashed border-slate-400 mx-6"></div>
              <span className="text-[10px] text-slate-400 mt-1 block">Signature ou émargement</span>
            </div>
            <div className="text-center">
              <span className="text-slate-500 font-medium block mb-8">
                Pour la COSITI (Caisse / Agent)
              </span>
              <div className="h-6 border-b border-dashed border-slate-400 mx-6 font-script text-emerald-800 text-sm italic">
                {cotisation.agentEnregistreur}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Cachet & Signature</span>
            </div>
          </div>

          <div className="mt-8 pt-3 border-t border-slate-100 text-[10px] text-center text-slate-400">
            Document officiel certifié généré par le système de gestion COSITI • Conservez ce reçu pour faire valoir vos prestations de sécurité sociale.
          </div>
        </div>
      </div>
    </div>
  );
};
