/**
 * Moteur de paie — port de src/utils/paieCalculations.ts (régime CNPS / CGI Cameroun).
 */

import { round2 } from './money.js';

export function nombreEnLettresFCFA(montant) {
  const n = Math.floor(Math.abs(montant));
  if (n === 0) return 'Zéro Franc CFA';

  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze',
    'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const dizaines = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

  const centaines = (val) => {
    let res = '';
    const c = Math.floor(val / 100);
    const reste = val % 100;
    if (c > 0) res += c === 1 ? 'cent ' : `${unites[c]} cent${reste === 0 ? 's ' : ' '}`;
    if (reste > 0) {
      if (reste < 20) res += `${unites[reste]} `;
      else if (reste < 70) {
        const d = Math.floor(reste / 10);
        const u = reste % 10;
        res += u === 1 ? `${dizaines[d]} et un ` : u > 0 ? `${dizaines[d]}-${unites[u]} ` : `${dizaines[d]} `;
      } else if (reste < 80) {
        const u = reste % 10;
        res += u === 1 ? 'soixante et onze ' : `soixante-${unites[10 + u]} `;
      } else if (reste < 90) {
        const u = reste % 10;
        res += u === 0 ? 'quatre-vingts ' : `quatre-vingt-${unites[u]} `;
      } else {
        res += `quatre-vingt-${unites[10 + (reste % 10)]} `;
      }
    }
    return res.trim();
  };

  let reste = n;
  let out = '';
  const milliards = Math.floor(reste / 1e9);
  if (milliards > 0) { out += milliards === 1 ? 'un milliard ' : `${centaines(milliards)} milliards `; reste %= 1e9; }
  const millions = Math.floor(reste / 1e6);
  if (millions > 0) { out += millions === 1 ? 'un million ' : `${centaines(millions)} millions `; reste %= 1e6; }
  const milliers = Math.floor(reste / 1000);
  if (milliers > 0) { out += milliers === 1 ? 'mille ' : `${centaines(milliers)} mille `; reste %= 1000; }
  if (reste > 0) out += `${centaines(reste)} `;

  const txt = out.trim().replace(/\s+/g, ' ');
  return `${txt.charAt(0).toUpperCase()}${txt.slice(1)} Francs CFA`;
}

export function determinerTrancheLoi(salaireReference) {
  if (salaireReference < 60000) {
    return {
      tranche: 'MOINS_DE_60K',
      libelle: 'Moins de 60 000 FCFA (Exonération Fiscale Totale DGI Cameroun)',
      explication: "Tranche < 60 000 FCFA : Exonération fiscale totale de plein droit au Cameroun (0 FCFA d'IRPP, 0 FCFA de CAC, 0 FCFA de TDL). Prélèvement CNPS allégé.",
    };
  }
  if (salaireReference === 60000) {
    return {
      tranche: 'EGAL_60K',
      libelle: 'Égal à 60 000 FCFA (Seuil Charnière & Cotisable Référence CNPS Cameroun)',
      explication: "Tranche pivot = 60 000 FCFA : Franchise fiscale IRPP de base (0 FCFA d'IRPP). Cotisation CNPS Cameroun (4,2% PVID = 2 520 F), CFC (1% = 600 F) et TDL (250 F). Net garanti : 56 630 FCFA.",
    };
  }
  return {
    tranche: 'PLUS_DE_60K',
    libelle: 'Plus de 60 000 FCFA (Assujetti CNPS Cameroun & IRPP Progressif)',
    explication: "Tranche > 60 000 FCFA : Assujettissement complet aux cotisations CNPS Cameroun (4,2% PVID, 12,95% patronal), CFC (1%), TDL, et au barème progressif de l'IRPP Cameroun après abattement de 30% et 500 000 F/an.",
  };
}

const MOIS_NOMS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/**
 * @param {object} p { employe?, adherent?, typeBeneficiaire?, salaireBaseOptionnel?, mois('YYYY-MM'), dateEdition?,
 *   heuresTravaillees?, joursTravailles?, sursalaire?, primeAnciennete?, primeRendement?, indemniteTransport?,
 *   indemniteLogement?, autresPrimes?, acomptesAvances?, retenuesDiverses?, bulletinNumero?, notesCommentaires?,
 *   statut?, validePar? }
 */
export function calculerBulletinPaie(p) {
  const { employe, adherent, salaireBaseOptionnel, mois } = p;
  const typeBeneficiaire = p.typeBeneficiaire || (adherent ? 'ADHERENT_CNPS' : 'EMPLOYE');
  const dateEdition = p.dateEdition || new Date().toISOString().split('T')[0];
  const heuresTravaillees = p.heuresTravaillees ?? 173.33;
  const joursTravailles = p.joursTravailles ?? 30;
  const sursalaire = p.sursalaire ?? employe?.sursalaire ?? 0;
  const primeAnciennete = p.primeAnciennete ?? 0;
  const primeRendement = p.primeRendement ?? 0;
  const indemniteTransport = p.indemniteTransport ?? employe?.indemniteTransport ?? 0;
  const indemniteLogement = p.indemniteLogement ?? employe?.indemniteLogement ?? 0;
  const autresPrimes = p.autresPrimes ?? employe?.primesFixes ?? 0;
  const acomptesAvances = p.acomptesAvances ?? 0;
  const retenuesDiverses = p.retenuesDiverses ?? 0;

  const isAdherent = typeBeneficiaire === 'ADHERENT_CNPS' && !!adherent;
  const matricule = isAdherent ? adherent.matricule : employe?.matricule || 'COSITI-000';
  const nomComplet = isAdherent ? `${adherent.nom} ${adherent.prenom}` : employe ? `${employe.nom} ${employe.prenom}` : 'Salarié';
  const poste = isAdherent ? `Travailleur Indépendant (${adherent.profession || 'Adhérent Affilié'})` : employe?.poste || 'Personnel';
  const departement = isAdherent ? 'Adhérents Immatriculés CNPS' : employe?.departement || 'Direction';
  const isSansEnfant = isAdherent ? adherent.sansEnfant === true : false;
  const cleanMat = matricule.replace(/[^a-zA-Z0-9]/g, '');
  const bulletinNumero = p.bulletinNumero || (isAdherent ? `BP-ADH-${mois}-${cleanMat}` : `BP-${mois}-${cleanMat}`);

  // 1. Gains
  const salaireBase = Math.round(salaireBaseOptionnel !== undefined ? salaireBaseOptionnel : isAdherent ? 60000 : employe?.salaireBase || 60000);
  const totalGainsBruts = round2(salaireBase + sursalaire + primeAnciennete + primeRendement + indemniteTransport + indemniteLogement + autresPrimes);
  const partTransportExoneree = Math.min(indemniteTransport, 30000);
  const salaireBrutImposable = round2(Math.max(0, totalGainsBruts - partTransportExoneree));
  const { tranche, libelle: trancheLibelle, explication: explicationLegale } = determinerTrancheLoi(salaireBase);

  // 2. Retenues sociales (plafond CNPS 750 000 FCFA)
  const assietteCnps = Math.min(totalGainsBruts, 750000);
  const cnpsPvidSalariale = employe?.typeContrat === 'Stage' && salaireBase < 60000 ? 0 : Math.round(assietteCnps * 0.042);
  const totalRetenuesSocialesSalariales = cnpsPvidSalariale;

  // 3. Retenues fiscales & parafiscales
  const cfcSalariale = Math.round(salaireBrutImposable * 0.01);
  let tdlSalariale;
  if (salaireBase < 60000) tdlSalariale = 0;
  else if (salaireBase <= 100000) tdlSalariale = 250;
  else if (salaireBase <= 200000) tdlSalariale = 500;
  else if (salaireBase <= 300000) tdlSalariale = 1000;
  else if (salaireBase <= 500000) tdlSalariale = 1500;
  else tdlSalariale = 2500;

  let ravSalariale;
  if (salaireBrutImposable <= 100000) ravSalariale = 0;
  else if (salaireBrutImposable <= 200000) ravSalariale = 1950;
  else if (salaireBrutImposable <= 300000) ravSalariale = 3250;
  else if (salaireBrutImposable <= 400000) ravSalariale = 4550;
  else ravSalariale = 5850;

  let irppSalariale = 0;
  let cacSalariale = 0;
  if (tranche === 'PLUS_DE_60K') {
    const netApresCnps = Math.max(0, salaireBrutImposable - cnpsPvidSalariale);
    const base = Math.max(0, netApresCnps * 0.7 - 41667); // 30% frais pro + abattement 500 000/an
    if (base > 0) {
      const t1 = Math.min(base, 166667);
      const t2 = Math.min(Math.max(0, base - 166667), 83333);
      const t3 = Math.min(Math.max(0, base - 250000), 166667);
      const t4 = Math.max(0, base - 416667);
      irppSalariale = Math.round(t1 * 0.1 + t2 * 0.15 + t3 * 0.25 + t4 * 0.35);
      cacSalariale = Math.round(irppSalariale * 0.1);
    }
  }
  const totalRetenuesFiscalesSalariales = irppSalariale + cacSalariale + cfcSalariale + tdlSalariale + ravSalariale;

  // 4-5. Totaux
  const totalAutresRetenues = round2(acomptesAvances + retenuesDiverses);
  const totalRetenuesSalariales = round2(totalRetenuesSocialesSalariales + totalRetenuesFiscalesSalariales + totalAutresRetenues);
  const netImposable = round2(Math.max(0, salaireBrutImposable - totalRetenuesSocialesSalariales));
  const netAPayer = round2(Math.max(0, totalGainsBruts - totalRetenuesSalariales));

  // 6. Charges patronales
  const cnpsPvidPatronale = Math.round(assietteCnps * 0.042);
  const cnpsPfPatronale = isSansEnfant ? 0 : Math.round(assietteCnps * 0.07);
  const cnpsAtmpPatronale = Math.round(assietteCnps * 0.0175);
  const fnePatronale = Math.round(salaireBrutImposable * 0.01);
  const cfcPatronale = Math.round(salaireBrutImposable * 0.015);
  const totalChargesPatronales = cnpsPvidPatronale + cnpsPfPatronale + cnpsAtmpPatronale + fnePatronale + cfcPatronale;

  const [annee, moisNum] = mois.split('-');
  const periodeLibelle = `${MOIS_NOMS[parseInt(moisNum, 10) - 1] || 'Mois'} ${annee}`;
  const now = new Date().toISOString();

  return {
    id: isAdherent ? `bp-adh-${mois}-${adherent.id}` : `bp-${mois}-${employe?.id || 'emp'}`,
    bulletinNumero,
    employeId: isAdherent ? adherent.id : employe?.id || 'emp-0',
    mois,
    periodeLibelle,
    dateEdition,
    datePaiement: dateEdition,
    statut: p.statut || 'Brouillon',

    employeNomComplet: nomComplet,
    employeMatricule: matricule,
    employePoste: poste,
    employeDepartement: departement,
    employeDateEmbauche: isAdherent ? '2026-01-01' : employe?.dateEmbauche || dateEdition,
    employeNumeroCnps: isAdherent ? adherent.numeroCnps : employe?.numeroCnps,
    employeNumeroCmu: '',
    employePartsFiscales: 1,
    modePaiement: isAdherent ? 'Espèces / Caisse COSITI' : employe?.modePaiement || 'Virement bancaire',
    banqueVirement: isAdherent ? 'Caisse Centrale COSITI' : employe?.banqueNom,
    compteVirement: isAdherent ? '' : employe?.numeroCompteBancaire,

    trancheLoi: tranche,
    trancheLibelle,
    explicationLegale,
    heuresTravaillees,
    joursTravailles,

    salaireBase, sursalaire, primeAnciennete, primeRendement, indemniteTransport, indemniteLogement, autresPrimes,
    totalGainsBruts, salaireBrutImposable,

    cnpsPvidSalariale,
    cnpsRetraiteSalariale: cnpsPvidSalariale,
    cmuSalariale: 0,
    totalRetenuesSocialesSalariales,

    irppSalariale, cacSalariale, cfcSalariale, tdlSalariale, ravSalariale,
    itsSalariale: irppSalariale,
    cnSalariale: cacSalariale,
    igrSalariale: 0,
    totalRetenuesFiscalesSalariales,

    acomptesAvances, retenuesDiverses, totalAutresRetenues,
    totalRetenuesSalariales, netImposable, netAPayer,
    netAPayerEnLettres: nombreEnLettresFCFA(netAPayer),

    cnpsPvidPatronale,
    cnpsRetraitePatronale: cnpsPvidPatronale,
    cnpsPfPatronale,
    cnpsPrestationsFamiliales: cnpsPfPatronale,
    cnpsAtmpPatronale,
    cnpsAccidentTravail: cnpsAtmpPatronale,
    fnePatronale,
    cfcPatronale,
    cmuPatronale: 0,
    fdfpPatronale: fnePatronale + cfcPatronale,
    totalChargesPatronales,
    coutTotalEmployeur: round2(totalGainsBruts + totalChargesPatronales),

    typeBeneficiaire,
    adherentId: isAdherent ? adherent.id : undefined,
    adherentMatricule: isAdherent ? adherent.matricule : undefined,
    adherentNumeroCnps: isAdherent ? adherent.numeroCnps : undefined,
    sansEnfant: isSansEnfant,

    validePar: p.validePar,
    dateValidation: p.statut === 'Validé DAF' ? dateEdition : undefined,
    notesCommentaires: p.notesCommentaires || '',
    createdAt: now,
    updatedAt: now,
  };
}
