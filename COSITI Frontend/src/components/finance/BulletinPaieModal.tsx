import React, { useRef } from 'react';
import { BulletinPaie, ParametresApp } from '../../types';
import {
  FileText,
  Printer,
  Download,
  X,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Briefcase,
  Coins,
} from 'lucide-react';

interface BulletinPaieModalProps {
  bulletin: BulletinPaie | null;
  onClose: () => void;
  parametres: ParametresApp;
}

export const BulletinPaieModal: React.FC<BulletinPaieModalProps> = ({
  bulletin,
  onClose,
  parametres,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!bulletin) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTxt = () => {
    const textContent = `
================================================================================
                    BULLETIN DE PAIE OFFICIEL - COSITI
              (RÉPUBLIQUE DU CAMEROUN - RÉGIME CNPS & CGI)
================================================================================
Organisation       : ${parametres.nomOrganisation || 'COSITI'}
Période            : ${bulletin.periodeLibelle}
N° Bulletin        : ${bulletin.bulletinNumero}
Date d'édition     : ${bulletin.dateEdition}
Date de paiement   : ${bulletin.datePaiement || bulletin.dateEdition}
Statut             : ${bulletin.statut}

--------------------------------------------------------------------------------
INFORMATIONS DU BÉNÉFICIAIRE
--------------------------------------------------------------------------------
Matricule          : ${bulletin.employeMatricule}
Nom et Prénoms     : ${bulletin.employeNomComplet}
Poste / Statut     : ${bulletin.employePoste}
Département        : ${bulletin.employeDepartement}
Date d'affiliation : ${bulletin.employeDateEmbauche}
N° CNPS Officiel   : ${bulletin.employeNumeroCnps || 'En attente / Immatriculation en cours'}
Mode de règlement  : ${bulletin.modePaiement} ${bulletin.banqueVirement ? `(${bulletin.banqueVirement} - ${bulletin.compteVirement})` : ''}

--------------------------------------------------------------------------------
TRANCHE LÉGALE & CADRE JURIDIQUE (CAMEROUN)
--------------------------------------------------------------------------------
Catégorie légale   : ${bulletin.trancheLibelle}
Règle applicable   : ${bulletin.explicationLegale}

--------------------------------------------------------------------------------
DÉTAIL DE LA RÉMUNÉRATION (en FCFA)
--------------------------------------------------------------------------------
GAINS & SALAIRE BRUT :
- Salaire de base contractuel / Cotisable : ${bulletin.salaireBase.toLocaleString('fr-FR')} FCFA
- Sursalaire conventionnel               : ${bulletin.sursalaire.toLocaleString('fr-FR')} FCFA
- Primes d'ancienneté & rendement        : ${(bulletin.primeAnciennete + bulletin.primeRendement).toLocaleString('fr-FR')} FCFA
- Indemnité de transport                 : ${bulletin.indemniteTransport.toLocaleString('fr-FR')} FCFA (Exonéré max 30 000 F)
- Indemnité logement & autres            : ${(bulletin.indemniteLogement + bulletin.autresPrimes).toLocaleString('fr-FR')} FCFA
TOTAL GAINS BRUTS                        : ${bulletin.totalGainsBruts.toLocaleString('fr-FR')} FCFA
SALAIRE BRUT IMPOSABLE                   : ${bulletin.salaireBrutImposable.toLocaleString('fr-FR')} FCFA

RETENUES SOCIALES SALARIALES (CNPS CAMEROUN - Plafond 750 000 F) :
- CNPS PVID (Pensions 4,20%)             : ${(bulletin.cnpsPvidSalariale || bulletin.cnpsRetraiteSalariale).toLocaleString('fr-FR')} FCFA
TOTAL RETENUES SOCIALES                  : ${bulletin.totalRetenuesSocialesSalariales.toLocaleString('fr-FR')} FCFA

RETENUES FISCALES & PARAFISCALES SALARIALES (DGI CAMEROUN) :
- CFC Salarial (Crédit Foncier 1,00%)    : ${(bulletin.cfcSalariale || Math.round(bulletin.salaireBrutImposable * 0.01)).toLocaleString('fr-FR')} FCFA
- TDL (Taxe de Développement Local)     : ${(bulletin.tdlSalariale || 0).toLocaleString('fr-FR')} FCFA
- IRPP (Impôt sur le Revenu)             : ${(bulletin.irppSalariale || bulletin.itsSalariale).toLocaleString('fr-FR')} FCFA ${bulletin.trancheLoi !== 'PLUS_DE_60K' ? '(EXONÉRÉ - 0 F)' : ''}
- CAC (Centimes Additionnels 10% IRPP)   : ${(bulletin.cacSalariale || bulletin.cnSalariale).toLocaleString('fr-FR')} FCFA
TOTAL RETENUES FISCALES                  : ${bulletin.totalRetenuesFiscalesSalariales.toLocaleString('fr-FR')} FCFA

ACOMPTES & AUTRES DÉDUCTIONS             : ${bulletin.totalAutresRetenues.toLocaleString('fr-FR')} FCFA
TOTAL DES RETENUES SALARIALES            : ${bulletin.totalRetenuesSalariales.toLocaleString('fr-FR')} FCFA

--------------------------------------------------------------------------------
RÉSUMÉ DU NET À PAYER
--------------------------------------------------------------------------------
NET IMPOSABLE                            : ${bulletin.netImposable.toLocaleString('fr-FR')} FCFA
NET À PAYER EN CHIFFRES                  : ${bulletin.netAPayer.toLocaleString('fr-FR')} FCFA
NET À PAYER EN TOUTES LETTRES            : ${bulletin.netAPayerEnLettres}

CHARGES PATRONALES (CNPS & FISCALITÉ CAMEROUN) :
- CNPS PVID Part Patronale (4,20%)       : ${(bulletin.cnpsPvidPatronale || bulletin.cnpsRetraitePatronale).toLocaleString('fr-FR')} FCFA
- Prestations Familiales (PF 7,00%)      : ${(bulletin.cnpsPfPatronale !== undefined ? bulletin.cnpsPfPatronale : bulletin.cnpsPrestationsFamiliales).toLocaleString('fr-FR')} FCFA ${bulletin.sansEnfant ? '(EXONÉRÉ SANS ENFANT)' : ''}
- Accidents du Travail (AT/MP 1,75%)     : ${(bulletin.cnpsAtmpPatronale !== undefined ? bulletin.cnpsAtmpPatronale : bulletin.cnpsAccidentTravail).toLocaleString('fr-FR')} FCFA
- FNE (Fonds National Emploi 1,00%)      : ${(bulletin.fnePatronale || Math.round(bulletin.salaireBrutImposable * 0.01)).toLocaleString('fr-FR')} FCFA
- CFC Patronal (Crédit Foncier 1,50%)    : ${(bulletin.cfcPatronale || Math.round(bulletin.salaireBrutImposable * 0.015)).toLocaleString('fr-FR')} FCFA
TOTAL CHARGES PATRONALES                 : ${bulletin.totalChargesPatronales.toLocaleString('fr-FR')} FCFA
COÛT TOTAL GLOBAL EMPLOYEUR              : ${bulletin.coutTotalEmployeur.toLocaleString('fr-FR')} FCFA

Visé par : ${bulletin.validePar || 'Direction Administrative et Financière (DAF)'}
Mentions : Pour faire valoir ce que de droit. Conserver ce bulletin sans limitation de durée.
================================================================================
    `.trim();

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bulletin_${bulletin.bulletinNumero}_${bulletin.employeMatricule}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-4 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:m-0 print:w-full">
        {/* Barre d'action supérieure - masquée à l'impression */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white flex items-center gap-2">
                Bulletin de Paie Officiel
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  {bulletin.bulletinNumero}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Période : {bulletin.periodeLibelle} • {bulletin.employeNomComplet}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
              title="Imprimer ou enregistrer en PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / PDF</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition-colors"
              title="Télécharger format texte"
            >
              <Download className="w-4 h-4" />
              <span>Export Texte</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-2"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps du Bulletin - Imprimable */}
        <div
          ref={printAreaRef}
          className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 bg-white print:p-4 print:text-black"
          id="bulletin-paie-print-area"
        >
          {/* En-tête officiel entreprise */}
          <div className="border-b-2 border-slate-800 pb-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-sm print:border print:border-black">
                    C
                  </div>
                  <div>
                    <h1 className="font-extrabold text-lg text-slate-900 tracking-tight uppercase">
                      {parametres.nomOrganisation || 'COSITI'}
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">
                      {parametres.slogan || 'Coopérative de Solidarité et Prévoyance des Travailleurs Indépendants'}
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 leading-tight space-y-0.5">
                  <p>{parametres.adresse || 'Avenue des Banques, Quartier Bonanjo, B.P. 3140 Douala, Cameroun'}</p>
                  <p>Tél : {parametres.telephone || '+237 233 42 15 89'} • Email : {parametres.email || 'contact@cositi-cameroun.cm'}</p>
                  <p className="text-slate-600 font-medium">Régime fiscal et social : République du Cameroun • N° CNPS Organisme : 371-00291-C</p>
                </div>
              </div>

              <div className="text-left sm:text-right bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-[240px] print:bg-transparent print:border-black">
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center justify-between sm:justify-end gap-2">
                  <span>BULLETIN DE PAIE</span>
                  {bulletin.typeBeneficiaire === 'ADHERENT_CNPS' && (
                    <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                      Adhérent CNPS
                    </span>
                  )}
                </div>
                <div className="text-base font-extrabold font-mono text-slate-900">
                  {bulletin.bulletinNumero}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Période : <span className="font-semibold text-slate-800">{bulletin.periodeLibelle}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Édité le : {new Date(bulletin.dateEdition).toLocaleDateString('fr-FR')} • Système DGI / CNPS Cameroun
                </div>
              </div>
            </div>
          </div>

          {/* Bandeau Tranche Légale Spécifique demandée */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-3 ${
              bulletin.trancheLoi === 'MOINS_DE_60K'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : bulletin.trancheLoi === 'EGAL_60K'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-purple-50 border-purple-200 text-purple-900'
            }`}
          >
            <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed">
              <div className="font-bold flex items-center gap-2">
                <span>Tranche Légale Cameroun : {bulletin.trancheLibelle}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border bg-white/70">
                  {bulletin.trancheLoi === 'MOINS_DE_60K'
                    ? '0 F IRPP (Exonéré)'
                    : bulletin.trancheLoi === 'EGAL_60K'
                    ? '0 F IRPP (Franchise 60k)'
                    : 'IRPP Progressif'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {bulletin.explicationLegale}
              </p>
            </div>
          </div>

          {/* Cartouche Informations Salarié */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200 print:bg-transparent print:border-black text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between border-b border-slate-200/80 pb-1">
                <span className="text-slate-500 font-medium">Matricule :</span>
                <span className="font-bold font-mono text-slate-900">{bulletin.employeMatricule}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-1">
                <span className="text-slate-500 font-medium">Nom & Prénoms :</span>
                <span className="font-bold text-slate-900">{bulletin.employeNomComplet}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-1">
                <span className="text-slate-500 font-medium">Emploi / Poste :</span>
                <span className="font-semibold text-slate-800">{bulletin.employePoste}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Département :</span>
                <span className="text-slate-700">{bulletin.employeDepartement}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between border-b border-slate-200/80 pb-1">
                <span className="text-slate-500 font-medium">Date d'embauche :</span>
                <span className="text-slate-800 font-medium">
                  {new Date(bulletin.employeDateEmbauche).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-1">
                <span className="text-slate-500 font-medium">N° CNPS / Sécu :</span>
                <span className="font-mono text-slate-800">
                  {bulletin.employeNumeroCnps || 'En cours'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-1">
                <span className="text-slate-500 font-medium">N° CMU :</span>
                <span className="font-mono text-slate-800">
                  {bulletin.employeNumeroCmu || 'Non renseigné'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Règlement :</span>
                <span className="font-medium text-slate-800">
                  {bulletin.modePaiement} {bulletin.banqueVirement ? `(${bulletin.banqueVirement})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Tableau de Décompte Détaillé de Paie */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 print:border-black">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 print:bg-slate-200 print:border-black">
                  <th className="py-2.5 px-3 w-16">Code</th>
                  <th className="py-2.5 px-3">Rubrique</th>
                  <th className="py-2.5 px-3 text-right">Base</th>
                  <th className="py-2.5 px-3 text-right w-20">Taux Sal.</th>
                  <th className="py-2.5 px-3 text-right">Part Salariale</th>
                  <th className="py-2.5 px-3 text-right w-20">Taux Pat.</th>
                  <th className="py-2.5 px-3 text-right">Part Patronale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {/* 1. ÉLÉMENTS DU SALAIRE BRUT */}
                <tr className="bg-slate-50/50 font-semibold text-slate-800">
                  <td className="py-1.5 px-3 text-slate-400 font-mono">101</td>
                  <td className="py-1.5 px-3">Salaire de base contractuel</td>
                  <td className="py-1.5 px-3 text-right font-mono">{bulletin.salaireBase.toLocaleString('fr-FR')}</td>
                  <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-right font-mono text-emerald-700 font-bold">
                    +{bulletin.salaireBase.toLocaleString('fr-FR')}
                  </td>
                  <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                </tr>

                {bulletin.sursalaire > 0 && (
                  <tr>
                    <td className="py-1.5 px-3 text-slate-400 font-mono">102</td>
                    <td className="py-1.5 px-3">Sursalaire conventionnel</td>
                    <td className="py-1.5 px-3 text-right font-mono">{bulletin.sursalaire.toLocaleString('fr-FR')}</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-3 text-right font-mono text-emerald-700">
                      +{bulletin.sursalaire.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  </tr>
                )}

                {(bulletin.primeAnciennete > 0 || bulletin.primeRendement > 0) && (
                  <tr>
                    <td className="py-1.5 px-3 text-slate-400 font-mono">103</td>
                    <td className="py-1.5 px-3">Primes de fonction & rendement</td>
                    <td className="py-1.5 px-3 text-right font-mono">
                      {(bulletin.primeAnciennete + bulletin.primeRendement).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-3 text-right font-mono text-emerald-700">
                      +{(bulletin.primeAnciennete + bulletin.primeRendement).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  </tr>
                )}

                {bulletin.indemniteTransport > 0 && (
                  <tr>
                    <td className="py-1.5 px-3 text-slate-400 font-mono">104</td>
                    <td className="py-1.5 px-3">
                      Indemnité légale de transport
                      <span className="text-[10px] text-slate-400 ml-1.5">(Exonéré max 30 000 F)</span>
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono">{bulletin.indemniteTransport.toLocaleString('fr-FR')}</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-3 text-right font-mono text-emerald-700">
                      +{bulletin.indemniteTransport.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  </tr>
                )}

                {(bulletin.indemniteLogement > 0 || bulletin.autresPrimes > 0) && (
                  <tr>
                    <td className="py-1.5 px-3 text-slate-400 font-mono">105</td>
                    <td className="py-1.5 px-3">Indemnités diverses / Logement</td>
                    <td className="py-1.5 px-3 text-right font-mono">
                      {(bulletin.indemniteLogement + bulletin.autresPrimes).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-3 text-right font-mono text-emerald-700">
                      +{(bulletin.indemniteLogement + bulletin.autresPrimes).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  </tr>
                )}

                {/* SOUS-TOTAL SALAIRE BRUT */}
                <tr className="bg-emerald-50/60 font-bold text-slate-900 border-y border-emerald-200">
                  <td className="py-2 px-3 text-emerald-800 font-mono">BRUT</td>
                  <td className="py-2 px-3">TOTAL GAINS BRUTS (Imposable: {bulletin.salaireBrutImposable.toLocaleString('fr-FR')} F)</td>
                  <td className="py-2 px-3 text-right font-mono">{bulletin.totalGainsBruts.toLocaleString('fr-FR')}</td>
                  <td className="py-2 px-3 text-right">-</td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-800">
                    {bulletin.totalGainsBruts.toLocaleString('fr-FR')} F
                  </td>
                  <td className="py-2 px-3 text-right">-</td>
                  <td className="py-2 px-3 text-right">-</td>
                </tr>

                {/* 2. COTISATIONS SOCIALES (CNPS CAMEROUN - Plafond 750 000 FCFA) */}
                <tr>
                  <td className="py-1.5 px-3 text-slate-400 font-mono">201</td>
                  <td className="py-1.5 px-3">
                    <span className="font-semibold text-slate-800">CNPS Cameroun — PVID (Pensions Vieillesse & Invalidité)</span>
                    <span className="text-[10px] text-slate-400 block">Plafond légal 750 000 F/mois</span>
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">{Math.min(bulletin.totalGainsBruts, 750000).toLocaleString('fr-FR')}</td>
                  <td className="py-1.5 px-3 text-right font-mono">4,20%</td>
                  <td className="py-1.5 px-3 text-right font-mono text-rose-700 font-medium">
                    {bulletin.cnpsPvidSalariale > 0 ? `-${bulletin.cnpsPvidSalariale.toLocaleString('fr-FR')}` : (bulletin.cnpsRetraiteSalariale > 0 ? `-${bulletin.cnpsRetraiteSalariale.toLocaleString('fr-FR')}` : '0')}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">4,20%</td>
                  <td className="py-1.5 px-3 text-right font-mono text-slate-700">
                    {(bulletin.cnpsPvidPatronale || bulletin.cnpsRetraitePatronale || 0).toLocaleString('fr-FR')}
                  </td>
                </tr>

                <tr>
                  <td className="py-1.5 px-3 text-slate-400 font-mono">202</td>
                  <td className="py-1.5 px-3">
                    <span className="font-semibold text-slate-800">CNPS Cameroun — Prestations Familiales (PF)</span>
                    {bulletin.sansEnfant && (
                      <span className="text-[10px] text-purple-700 font-bold block">
                        [EXONÉRÉ : Travailleur sans enfant à charge]
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">{Math.min(bulletin.totalGainsBruts, 750000).toLocaleString('fr-FR')}</td>
                  <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-right font-mono">{bulletin.sansEnfant ? '0,00%' : '7,00%'}</td>
                  <td className="py-1.5 px-3 text-right font-mono text-slate-700">
                    {(bulletin.cnpsPfPatronale !== undefined ? bulletin.cnpsPfPatronale : bulletin.cnpsPrestationsFamiliales).toLocaleString('fr-FR')}
                  </td>
                </tr>

                <tr>
                  <td className="py-1.5 px-3 text-slate-400 font-mono">203</td>
                  <td className="py-1.5 px-3">
                    <span className="font-semibold text-slate-800">CNPS Cameroun — Accidents du Travail & Maladie Pro (AT/MP)</span>
                    <span className="text-[10px] text-slate-400 block">Groupe A (Tertiaire / Bureaux / Coopératives)</span>
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">{Math.min(bulletin.totalGainsBruts, 750000).toLocaleString('fr-FR')}</td>
                  <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-right font-mono">1,75%</td>
                  <td className="py-1.5 px-3 text-right font-mono text-slate-700">
                    {(bulletin.cnpsAtmpPatronale !== undefined ? bulletin.cnpsAtmpPatronale : bulletin.cnpsAccidentTravail).toLocaleString('fr-FR')}
                  </td>
                </tr>

                {/* 3. IMPÔTS & CONTRIBUTIONS FISCALES (CGI CAMEROUN) */}
                <tr className={bulletin.trancheLoi !== 'PLUS_DE_60K' ? 'bg-amber-50/40' : ''}>
                  <td className="py-1.5 px-3 text-slate-400 font-mono">301</td>
                  <td className="py-1.5 px-3">
                    <span className="font-semibold text-slate-800">IRPP (Impôt sur le Revenu des Personnes Physiques)</span>
                    {bulletin.trancheLoi === 'MOINS_DE_60K' && (
                      <span className="text-[10px] text-emerald-700 font-bold block">
                        [EXONÉRATION TOTALE : Salaire &lt; 60 000 FCFA]
                      </span>
                    )}
                    {bulletin.trancheLoi === 'EGAL_60K' && (
                      <span className="text-[10px] text-blue-700 font-bold block">
                        [FRANCHISE LÉGALE : Seuil pivot 60 000 FCFA (Abattement 500k/an)]
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">{bulletin.salaireBrutImposable.toLocaleString('fr-FR')}</td>
                  <td className="py-1.5 px-3 text-right font-mono">
                    {bulletin.trancheLoi === 'PLUS_DE_60K' ? 'Barème' : '0,00%'}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-rose-700 font-medium">
                    {(bulletin.irppSalariale || bulletin.itsSalariale) > 0 ? `-${(bulletin.irppSalariale || bulletin.itsSalariale).toLocaleString('fr-FR')}` : '0'}
                  </td>
                  <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                </tr>

                {(bulletin.cacSalariale || bulletin.cnSalariale) > 0 && (
                  <tr>
                    <td className="py-1.5 px-3 text-slate-400 font-mono">302</td>
                    <td className="py-1.5 px-3">CAC (Centimes Additionnels Communaux — 10% IRPP)</td>
                    <td className="py-1.5 px-3 text-right font-mono">{(bulletin.irppSalariale || bulletin.itsSalariale).toLocaleString('fr-FR')}</td>
                    <td className="py-1.5 px-3 text-right font-mono">10,00%</td>
                    <td className="py-1.5 px-3 text-right font-mono text-rose-700 font-medium">
                      -{(bulletin.cacSalariale || bulletin.cnSalariale).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  </tr>
                )}

                {/* CFC (Crédit Foncier du Cameroun) */}
                <tr>
                  <td className="py-1.5 px-3 text-slate-400 font-mono">303</td>
                  <td className="py-1.5 px-3">
                    <span className="font-semibold text-slate-800">CFC (Crédit Foncier du Cameroun)</span>
                    <span className="text-[10px] text-slate-400 block">Salarial 1% • Patronal 1,5%</span>
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">{bulletin.salaireBrutImposable.toLocaleString('fr-FR')}</td>
                  <td className="py-1.5 px-3 text-right font-mono">1,00%</td>
                  <td className="py-1.5 px-3 text-right font-mono text-rose-700 font-medium">
                    {(bulletin.cfcSalariale || Math.round(bulletin.salaireBrutImposable * 0.01)) > 0
                      ? `-${(bulletin.cfcSalariale || Math.round(bulletin.salaireBrutImposable * 0.01)).toLocaleString('fr-FR')}`
                      : '0'}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">1,50%</td>
                  <td className="py-1.5 px-3 text-right font-mono text-slate-700">
                    {(bulletin.cfcPatronale || Math.round(bulletin.salaireBrutImposable * 0.015)).toLocaleString('fr-FR')}
                  </td>
                </tr>

                {/* TDL (Taxe de Développement Local) */}
                <tr>
                  <td className="py-1.5 px-3 text-slate-400 font-mono">304</td>
                  <td className="py-1.5 px-3">
                    <span className="font-semibold text-slate-800">TDL (Taxe de Développement Local Cameroun)</span>
                    <span className="text-[10px] text-slate-400 block">Tranche barème communal</span>
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">{bulletin.salaireBase.toLocaleString('fr-FR')}</td>
                  <td className="py-1.5 px-3 text-right font-mono">Fixe</td>
                  <td className="py-1.5 px-3 text-right font-mono text-rose-700 font-medium">
                    {(bulletin.tdlSalariale || 0) > 0 ? `-${bulletin.tdlSalariale.toLocaleString('fr-FR')}` : '0'}
                  </td>
                  <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                </tr>

                {/* FNE Patronal */}
                <tr>
                  <td className="py-1.5 px-3 text-slate-400 font-mono">305</td>
                  <td className="py-1.5 px-3">
                    <span className="font-semibold text-slate-800">FNE (Fonds National de l'Emploi — Cameroun)</span>
                    <span className="text-[10px] text-slate-400 block">Contribution patronale pour l'insertion des jeunes</span>
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">{bulletin.salaireBrutImposable.toLocaleString('fr-FR')}</td>
                  <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-right font-mono">1,00%</td>
                  <td className="py-1.5 px-3 text-right font-mono text-slate-700">
                    {(bulletin.fnePatronale || Math.round(bulletin.salaireBrutImposable * 0.01)).toLocaleString('fr-FR')}
                  </td>
                </tr>

                {/* 4. Acomptes ou retenues */}
                {bulletin.acomptesAvances > 0 && (
                  <tr>
                    <td className="py-1.5 px-3 text-slate-400 font-mono">401</td>
                    <td className="py-1.5 px-3">Acomptes & Avances sur salaire versés</td>
                    <td className="py-1.5 px-3 text-right font-mono">{bulletin.acomptesAvances.toLocaleString('fr-FR')}</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-3 text-right font-mono text-rose-700 font-medium">
                      -{bulletin.acomptesAvances.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                  </tr>
                )}
              </tbody>

              {/* LIGNES DE TOTAUX */}
              <tfoot className="border-t-2 border-slate-800 bg-slate-50 font-bold text-slate-800 print:bg-slate-100">
                <tr>
                  <td colSpan={4} className="py-2 px-3 text-right uppercase text-[11px] text-slate-600">
                    Total Retenues Salariales :
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-rose-700 text-sm">
                    -{bulletin.totalRetenuesSalariales.toLocaleString('fr-FR')} F
                  </td>
                  <td className="py-2 px-3 text-right uppercase text-[11px] text-slate-600">
                    Total Charges Pat. :
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-800 text-sm">
                    {bulletin.totalChargesPatronales.toLocaleString('fr-FR')} F
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Synthèse finale & NET À PAYER */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
            {/* Décompte fiscal & patronal */}
            <div className="sm:col-span-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 print:bg-transparent print:border-black">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1">
                Indicateurs Clés
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Net Imposable :</span>
                <span className="font-mono font-semibold text-slate-800">{bulletin.netImposable.toLocaleString('fr-FR')} F</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Charges Patronales :</span>
                <span className="font-mono font-semibold text-slate-800">{bulletin.totalChargesPatronales.toLocaleString('fr-FR')} F</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                <span>Coût Global Entreprise :</span>
                <span className="font-mono text-emerald-800">{bulletin.coutTotalEmployeur.toLocaleString('fr-FR')} F</span>
              </div>
            </div>

            {/* Cadre Mis en avant Net à Payer */}
            <div className="sm:col-span-2 bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-4 rounded-xl shadow-sm flex flex-col justify-between print:bg-transparent print:text-black print:border-2 print:border-black print:shadow-none">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-200 print:text-black">
                  NET À PAYER AU SALARIÉ (EN FCFA)
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight mt-1">
                  {bulletin.netAPayer.toLocaleString('fr-FR')} FCFA
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-emerald-600/60 print:border-black text-xs font-medium text-emerald-100 print:text-black italic">
                Arrêté à la somme de : <span className="font-bold underline not-italic">{bulletin.netAPayerEnLettres}</span>
              </div>
            </div>
          </div>

          {/* Blocs de Signatures & Mentions Légales */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
            <div className="border border-slate-300 rounded-xl p-3.5 h-28 flex flex-col justify-between print:border-black">
              <span className="font-bold text-slate-800">
                Pour l'Employeur (Le DAF / Direction) :
              </span>
              <div className="text-[11px] text-slate-500 italic flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Validé par {bulletin.validePar || 'Le DAF'}</span>
              </div>
            </div>

            <div className="border border-slate-300 rounded-xl p-3.5 h-28 flex flex-col justify-between print:border-black">
              <span className="font-bold text-slate-800">
                Le Salarié (Signature précédée de la mention "Lu et approuvé") :
              </span>
              <div className="text-[10px] text-slate-400 italic">
                Signature :
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center leading-normal border-t border-slate-100 pt-3">
            Conformément aux dispositions du Code du Travail et du Code Général des Impôts de la République de Côte d'Ivoire.
            Ce bulletin doit être conservé sans limitation de durée par le salarié.
          </div>
        </div>

        {/* Pied de modal - masqué à l'impression */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print:hidden shrink-0">
          <span>
            Document comptable certifié DAF • Logiciel COSITI Gestion Financière
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
