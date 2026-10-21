import { logEvent } from '../api/client';
import { jsPDF } from 'jspdf';
import { Cotisation, Adherent, ParametresApp } from '../types';
import { formatFCFA, formatDateFr } from './helpers';

export interface GenerateReceiptA5Options {
  cotisation: Cotisation;
  adherent?: Adherent | null;
  parametres?: ParametresApp;
  typeMontant?: 'CUMUL_MENSUEL' | 'VERSEMENT_PONCTUEL';
  cumulMensuel?: number;
  cotisationsDuMois?: Cotisation[];
}

/**
 * Nettoie les chaînes de caractères pour garantir un rendu parfait
 * dans l'encodage de police par défaut de jsPDF (WinAnsi / Helvetica).
 */
function cleanPdfText(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/[«»]/g, '"')
    .replace(/[’‘]/g, "'")
    .replace(/[•]/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE');
}

/**
 * Génère et télécharge le reçu officiel de cotisation au format international A5 (148 x 210 mm)
 */
export function generateReceiptA5Pdf({
  cotisation,
  adherent,
  parametres,
  typeMontant = 'CUMUL_MENSUEL',
  cumulMensuel,
  cotisationsDuMois,
}: GenerateReceiptA5Options): boolean {
  try {
    const isCumul = typeMontant === 'CUMUL_MENSUEL';
    const computedCumul =
      cotisationsDuMois && cotisationsDuMois.length > 0
        ? cotisationsDuMois.reduce((acc, c) => acc + (c.montant || 0), 0)
        : cotisation.montant;
    const montantFinal = isCumul
      ? (cumulMensuel !== undefined && cumulMensuel > 0 ? cumulMensuel : computedCumul)
      : cotisation.montant;
    const nbVersementsMois = cotisationsDuMois?.length || 1;

    // Initialisation du document jsPDF en format A5 portrait (148 mm × 210 mm)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5',
      compress: true,
    });

    const nomOrg = cleanPdfText(
      parametres?.nomOrganisation ||
        'COSITI - Coopérative du Secteur Informel et des Travailleurs Indépendants'
    );
    const sigle = cleanPdfText(parametres?.sigle || 'COSITI');
    const slogan = cleanPdfText(
      parametres?.slogan || 'Solidarité - Prévoyance - Dignité des Travailleurs Informels'
    );
    const adresse = cleanPdfText(
      parametres?.adresse || 'Avenue des Banques, Bonanjo, B.P. 3140 Douala'
    );
    const tel = cleanPdfText(parametres?.telephone || '+237 233 42 15 89');
    const email = cleanPdfText(parametres?.email || 'contact@cositi-cameroun.cm');

    const reference = cleanPdfText(
      cotisation.reference || `REC-${cotisation.id.slice(-6).toUpperCase()}`
    );
    const dateFormatted = cleanPdfText(formatDateFr(cotisation.datePaiement));
    const nomAdherent = cleanPdfText(
      cotisation.adherentNomPrenom ||
        (adherent ? `${adherent.nom} ${adherent.prenom}` : 'Adhérent')
    );
    const matricule = cleanPdfText(cotisation.matricule || adherent?.matricule || 'COSITI-0000');
    const profession = cleanPdfText(adherent?.profession || 'Travailleur indépendant');
    const telephoneAdh = cleanPdfText(adherent?.telephone || '-');
    const adresseAdherent = cleanPdfText(adherent?.adresse || 'Douala, Cameroun');
    const modePaiement = cleanPdfText(cotisation.modePaiement || 'Espèces');
    const periode = cleanPdfText(`${cotisation.mois || ''} ${cotisation.annee || ''}`);
    const agent = cleanPdfText(cotisation.agentEnregistreur || 'Caisse Centrale');
    const observations = cleanPdfText(cotisation.observations || '');

    // 1. Bande supérieure décorative
    doc.setFillColor(6, 95, 70); // emerald-800
    doc.rect(0, 0, 148, 3.5, 'F');

    // 2. Badge Sigle
    doc.setFillColor(6, 95, 70);
    doc.roundedRect(61, 6.5, 26, 6, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(sigle, 74, 10.8, { align: 'center' });

    // 3. Nom de l'organisation
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42); // slate-900
    const splitOrg = doc.splitTextToSize(nomOrg.toUpperCase(), 124);
    doc.text(splitOrg, 74, 16, { align: 'center' });
    let curY = 16 + splitOrg.length * 3.8;

    // Slogan
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.text(`"${slogan}"`, 74, curY, { align: 'center' });
    curY += 3.8;

    // Coordonnées
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139); // slate-500
    const contactLine = [adresse, tel ? `Tél: ${tel}` : '', email ? `Email: ${email}` : '']
      .filter(Boolean)
      .join(' - ');
    const splitContacts = doc.splitTextToSize(contactLine, 126);
    doc.text(splitContacts, 74, curY, { align: 'center' });
    curY += splitContacts.length * 3 + 2;

    // Ligne séparatrice
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.3);
    doc.line(11, curY, 137, curY);
    curY += 3.5;

    // 4. Cadre Titre & Référence (Bannière vert pâle)
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.setDrawColor(134, 239, 172); // emerald-300
    doc.setLineWidth(0.35);
    doc.roundedRect(11, curY, 126, 13, 2, 2, 'FD');

    // Côté Gauche de la bannière
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52); // emerald-800
    doc.text(
      isCumul
        ? 'REÇU OFFICIEL DE COTISATIONS — CUMUL MENSUEL'
        : 'REÇU OFFICIEL DE COTISATION JOURNALIÈRE',
      15,
      curY + 4.5
    );

    doc.setFont('courier', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`N° ${reference}`, 15, curY + 9.8);

    // Côté Droit de la bannière
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Date d'encaissement", 133, curY + 4.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(dateFormatted, 133, curY + 9.8, { align: 'right' });

    curY += 16;

    // 5. Deux encadrés côte à côte (Adhérent & Modalités)
    const boxHeight = 35;
    const boxWidth = 61.5;

    // Boîte Adhérent (Gauche)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.roundedRect(11, curY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("IDENTITÉ DE L'ADHÉRENT", 15, curY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const splitName = doc.splitTextToSize(nomAdherent, boxWidth - 8);
    doc.text(splitName, 15, curY + 9.5);

    let adY = curY + 9.5 + Math.min(splitName.length * 3.8, 7.6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Matricule :', 15, adY);
    doc.setFont('courier', 'bold');
    doc.setTextColor(4, 120, 87);
    doc.text(matricule, 29, adY);
    adY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Activité :', 15, adY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const splitProf = doc.splitTextToSize(profession, 32);
    doc.text(splitProf[0] || '', 27, adY);
    adY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Téléphone :', 15, adY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(telephoneAdh, 31, adY);
    adY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    const splitAdr = doc.splitTextToSize(`Adresse : ${adresseAdherent}`, boxWidth - 8);
    doc.text(splitAdr[0] || '', 15, adY);

    // Boîte Paiement (Droite)
    const rightBoxX = 75.5;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(rightBoxX, curY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('MODALITÉS DU VERSEMENT', rightBoxX + 4, curY + 5);

    let pyY = curY + 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Mode :', rightBoxX + 4, pyY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(modePaiement, rightBoxX + 16, pyY);
    pyY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Période :', rightBoxX + 4, pyY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(periode, rightBoxX + 18, pyY);
    pyY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Agent caisse :', rightBoxX + 4, pyY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(agent, rightBoxX + 23, pyY);
    pyY += 5;

    if (observations) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      const splitObs = doc.splitTextToSize(`Note : ${observations}`, boxWidth - 8);
      doc.text(splitObs.slice(0, 2), rightBoxX + 4, pyY);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(4, 120, 87);
      doc.text('Enregistrement validé en caisse', rightBoxX + 4, pyY);
    }

    curY += boxHeight + 3.5;

    // 6. Carte Montant Encaissé (Hero Badge Émeraude)
    const amountCardHeight = 23;
    doc.setFillColor(4, 120, 87); // emerald-700
    doc.roundedRect(11, curY, 126, amountCardHeight, 2.5, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(167, 243, 208); // emerald-200
    doc.text(
      isCumul ? 'MONTANT DU CUMUL MENSUEL ENCAISSÉ' : 'MONTANT DU VERSEMENT ENCAISSÉ',
      74,
      curY + 5.5,
      { align: 'center' }
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(formatFCFA(montantFinal), 74, curY + 13.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(236, 253, 245); // emerald-50
    doc.text(
      isCumul
        ? `Cumul certifié pour le mois de ${periode} • ${nbVersementsMois} versement(s)`
        : 'Paiement certifié régulier auprès de la trésorerie COSITI',
      74,
      curY + 19,
      { align: 'center' }
    );

    curY += amountCardHeight + 3.5;

    // 7. Bloc Règlements & Prévoyance CNPS
    const noticeHeight = 16;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(11, curY, 126, noticeHeight, 1.5, 1.5, 'FD');

    if (isCumul) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Versement sélectionné :', 15, curY + 4.8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${formatFCFA(cotisation.montant)} (${modePaiement})`, 48, curY + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Total cumulé du mois :', 15, curY + 9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(4, 120, 87);
      doc.text(`${formatFCFA(montantFinal)} (Jours couverts : ${Math.floor(montantFinal / (adherent?.tarifJournalier || 700))} j)`, 48, curY + 9.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Seuil CNPS (15 000 F) :', 15, curY + 14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(montantFinal >= 15000 ? 4 : 194, montantFinal >= 15000 ? 120 : 65, montantFinal >= 15000 ? 87 : 12);
      doc.text(
        montantFinal >= 15000
          ? 'Seuil atteint • Adhérent éligible à l\'immatriculation CNPS'
          : `En cours de cotisation (${formatFCFA(Math.max(0, 15000 - montantFinal))} restant pour seuil)`,
        48,
        curY + 14
      );
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.7);
      doc.setTextColor(71, 85, 105);
      doc.text('Affectation des fonds :', 15, curY + 5.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Sécurité sociale, prévoyance et fonds de solidarité informelle', 45, curY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Seuil CNPS requis :', 15, curY + 11.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(4, 120, 87);
      doc.text(
        `Seuil officiel : ${formatFCFA(parametres?.seuilImmatriculation || 15000)} • Suivi automatique`,
        45,
        curY + 11.5
      );
    }

    curY += noticeHeight + 4;

    // 8. Signatures officielles
    const sigHeight = 22;
    // Côté Adhérent
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("L'Adhérent", 38, curY + 4, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('(Signature ou émargement)', 38, curY + 7.5, { align: 'center' });

    doc.setDrawColor(203, 213, 225);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(18, curY + 20, 58, curY + 20);

    // Côté COSITI
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Pour la COSITI (Caisse / Agent)', 110, curY + 4, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('(Cachet & Signature)', 110, curY + 7.5, { align: 'center' });

    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(7.5);
    doc.setTextColor(6, 95, 70);
    doc.text(agent, 110, curY + 15, { align: 'center' });

    doc.line(90, curY + 20, 130, curY + 20);
    doc.setLineDashPattern([], 0); // Réinitialiser le tiret

    curY += sigHeight + 3;

    // 9. Pied de page légal et horodatage
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(11, curY, 137, curY);

    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Document officiel généré au format A5 par le système de gestion informatisée COSITI.',
      74,
      curY + 3.5,
      { align: 'center' }
    );
    doc.text(
      `Conservez ce reçu pour faire valoir vos prestations sociales • Émis le ${dateStr} à ${timeStr}`,
      74,
      curY + 6.8,
      { align: 'center' }
    );

    // 10. Sauvegarde / Téléchargement du fichier
    const safeMatricule = matricule.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeRef = reference.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safePeriode = (periode || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = isCumul
      ? `Recu_Cumul_Mensuel_${safeMatricule}_${safePeriode}_${safeRef}.pdf`
      : `Recu_Cotisation_A5_${safeMatricule}_${safeRef}.pdf`;

    logEvent('IMPRESSION_RECU', 'Reçu PDF : ' + String(fileName));
    doc.save(fileName);
    return true;
  } catch (error) {
    console.error('Erreur lors de la génération du PDF A5:', error);
    return false;
  }
}
