import { logEvent } from '../api/client';
import { jsPDF } from 'jspdf';
import { ParametresApp } from '../types';

export interface GenerateReportPdfOptions {
  title: string;
  description: string;
  headers: string[];
  rows: (string | number)[][];
  parametres?: ParametresApp;
  fileName?: string;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Nettoie les caractères spéciaux pour l'encodage Helvetica standard de jsPDF
 */
function cleanPdfText(str?: string | number | null): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/[«»]/g, '"')
    .replace(/[’‘]/g, "'")
    .replace(/[•]/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE');
}

/**
 * Génère et télécharge un rapport officiel haute définition au format PDF (A4)
 */
export function generateReportPdf({
  title,
  description,
  headers,
  rows,
  parametres,
  fileName,
  orientation,
}: GenerateReportPdfOptions): boolean {
  try {
    // Si orientation non spécifiée, choix intelligent selon le nombre de colonnes et la teneur du rapport
    const autoOrientation: 'portrait' | 'landscape' =
      orientation ||
      (headers.length >= 5 ||
      title.toLowerCase().includes('alerte') ||
      title.toLowerCase().includes('dossier') ||
      title.toLowerCase().includes('nominatif') ||
      title.toLowerCase().includes('cotisation')
        ? 'landscape'
        : 'portrait');

    const isLandscape = autoOrientation === 'landscape';
    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;

    const marginLeft = 10;
    const marginRight = 10;
    const marginTop = 10;
    const marginBottom = 12;
    const printableWidth = pageWidth - marginLeft - marginRight;

    const doc = new jsPDF({
      orientation: autoOrientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const nomOrg = cleanPdfText(
      parametres?.nomOrganisation ||
        'COSITI - Coopérative du Secteur Informel et des Travailleurs Indépendants'
    );
    const sigle = cleanPdfText(parametres?.sigle || 'COSITI');
    const slogan = cleanPdfText(
      parametres?.slogan || 'Solidarité • Prévoyance • Dignité des Travailleurs'
    );
    const tel = cleanPdfText(parametres?.telephone || '+237 233 42 15 89 / +237 677 88 99 00');
    const email = cleanPdfText(parametres?.email || 'contact@cositi-cameroun.cm');

    const cleanTitle = cleanPdfText(title);
    const cleanDescription = cleanPdfText(description);

    // Calcul des largeurs de colonnes proportionnelles avec garantie de largeur pour les noms d'adhérents
    const colWeights: number[] = headers.map((h) => {
      const lower = h.toLowerCase();
      // Le nom de l'adhérent a la priorité absolue pour être lisible et visible sans coupure
      if (lower.includes('nom') || lower.includes('adhérent') || lower.includes('adherent') || lower.includes('salarié') || lower.includes('employé')) return 3.8;
      if (lower.includes('description') || lower.includes('message') || lower.includes('motif') || lower.includes('détails')) return 3.0;
      if (lower.includes('titre')) return 2.2;
      if (lower.includes('profession') || lower.includes('département') || lower.includes('poste') || lower.includes('catégorie')) return 2.0;
      if (lower.includes('statut') || lower.includes('immatriculation') || lower.includes('mode') || lower.includes('niveau') || lower.includes('type')) return 1.6;
      if (lower.includes('matricule') || lower.includes('cnps') || lower.includes('cni')) return 1.5;
      if (lower.includes('téléphone') || lower.includes('date') || lower.includes('référence')) return 1.4;
      if (lower.includes('montant') || lower.includes('cumul') || lower.includes('tarif') || lower.includes('salaire')) return 1.5;
      return 1.3;
    });

    const totalWeight = colWeights.reduce((a, b) => a + b, 0);
    const colWidths = colWeights.map((w) => (w / totalWeight) * printableWidth);

    let curY = marginTop;

    // Fonction de dessin de l'en-tête officiel
    const drawHeader = () => {
      // Bande verte décorative supérieure
      doc.setFillColor(6, 95, 70); // emerald-800
      doc.rect(0, 0, pageWidth, 3.5, 'F');

      curY = marginTop;

      // Badge Sigle
      doc.setFillColor(6, 95, 70);
      doc.roundedRect(marginLeft, curY, 20, 6.5, 1.2, 1.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(sigle, marginLeft + 10, curY + 4.8, { align: 'center' });

      // Nom organisation & Slogan
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(nomOrg, marginLeft + 23, curY + 4.5);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(4, 120, 87); // emerald-700
      doc.text(`"${slogan}"`, marginLeft + 23, curY + 8);

      // Coordonnées à droite
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139); // slate-500
      const nowStr = new Date().toLocaleDateString('fr-FR');
      const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      doc.text(`Édité le : ${nowStr} à ${timeStr}`, pageWidth - marginRight, curY + 3.5, { align: 'right' });
      doc.text(`Tél : ${tel} • ${email}`, pageWidth - marginRight, curY + 7.5, { align: 'right' });

      curY += 12;

      // Ligne séparatrice
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(marginLeft, curY, pageWidth - marginRight, curY);

      curY += 4;

      // Cadre Titre du Rapport
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.roundedRect(marginLeft, curY, printableWidth, 12, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(cleanTitle, marginLeft + 4, curY + 5.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(cleanDescription, marginLeft + 4, curY + 9.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(6, 95, 70);
      doc.text(`Total enregistrements : ${rows.length}`, pageWidth - marginRight - 4, curY + 7, {
        align: 'right',
      });

      curY += 15;
    };

    // Fonction de dessin de l'en-tête du tableau
    const drawTableHeaders = () => {
      const headerHeight = 7;
      doc.setFillColor(6, 95, 70); // emerald-800
      doc.rect(marginLeft, curY, printableWidth, headerHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);

      let colX = marginLeft;
      headers.forEach((h, i) => {
        const w = colWidths[i];
        const isRightAlign = h.toLowerCase().includes('montant') || h.toLowerCase().includes('cumul') || h.toLowerCase().includes('tarif') || h.toLowerCase().includes('fcfa');
        const textX = isRightAlign ? colX + w - 2 : colX + 2;
        const cleanH = cleanPdfText(h);
        doc.text(cleanH, textX, curY + 4.7, {
          align: isRightAlign ? 'right' : 'left',
          maxWidth: w - 3,
        });
        colX += w;
      });

      curY += headerHeight;
    };

    // Premier en-tête
    drawHeader();
    drawTableHeaders();

    // Lignes de données avec calcul dynamique de la hauteur de ligne
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);

    rows.forEach((row, rowIdx) => {
      // Découper le texte de chaque cellule selon la largeur exacte de sa colonne
      const preparedCells = row.map((cell, cellIdx) => {
        const w = colWidths[cellIdx];
        const cleanCell = cleanPdfText(cell);
        const lines = doc.splitTextToSize(cleanCell, Math.max(8, w - 3));
        return {
          lines: Array.isArray(lines) ? lines : [lines],
          cleanCell,
        };
      });

      // Calcul de la hauteur dynamique de la ligne (au minimum 6.2 mm, plus si le texte comporte plusieurs lignes)
      const maxLinesInRow = Math.max(1, ...preparedCells.map((c) => c.lines.length));
      const dynamicRowHeight = Math.max(6.5, maxLinesInRow * 3.3 + 2.6);

      // Vérifier saut de page
      if (curY + dynamicRowHeight > pageHeight - marginBottom) {
        doc.addPage();
        curY = marginTop;
        drawTableHeaders();
      }

      // Fond alterné
      if (rowIdx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(248, 250, 252); // slate-50
      }
      doc.rect(marginLeft, curY, printableWidth, dynamicRowHeight, 'F');

      // Bordure basse subtile
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(marginLeft, curY + dynamicRowHeight, pageWidth - marginRight, curY + dynamicRowHeight);

      // Rendu de chaque cellule
      let colX = marginLeft;
      preparedCells.forEach((c, cellIdx) => {
        const w = colWidths[cellIdx];
        const hName = headers[cellIdx]?.toLowerCase() || '';
        const isRightAlign =
          hName.includes('montant') ||
          hName.includes('cumul') ||
          hName.includes('tarif') ||
          hName.includes('fcfa');

        const textX = isRightAlign ? colX + w - 2 : colX + 2;

        // Mise en valeur des montants ou statuts clés
        if (isRightAlign) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
        } else if (hName.includes('nom') || hName.includes('adhérent') || hName.includes('salarié')) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42); // Noir profond pour les noms d'adhérents
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
        }

        doc.text(c.lines, textX, curY + 3.8, {
          align: isRightAlign ? 'right' : 'left',
        });

        colX += w;
      });

      curY += dynamicRowHeight;
    });

    // Numérotation des pages dans le pied de page
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginLeft, pageHeight - 9, pageWidth - marginRight, pageHeight - 9);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);

      doc.text(
        'Document certifié généré par le système informatisé de gestion de la coopérative COSITI.',
        marginLeft,
        pageHeight - 5.5
      );

      doc.text(`Page ${p} sur ${totalPages}`, pageWidth - marginRight, pageHeight - 5.5, {
        align: 'right',
      });
    }

    // Sauvegarde / Téléchargement immédiat
    const safeTitle = (fileName || `Rapport_COSITI_${cleanTitle}`)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    const dateStamp = new Date().toISOString().split('T')[0];
    const finalFileName = `${safeTitle}_${dateStamp}.pdf`;

    logEvent('EXPORT_DONNEES', 'Rapport PDF : ' + String(finalFileName));
    doc.save(finalFileName);
    return true;
  } catch (err) {
    console.error('Erreur lors de la génération du PDF du rapport:', err);
    return false;
  }
}

export interface GenerateEtatEncaissementsDecaissementsPdfOptions {
  periode: string;
  /** noms des signataires (acteurs en poste) */
  signataires?: { dg?: string; daf?: string; pca?: string };
  totalEncaissements: number;
  totalDecaissements: number;
  totalDecaissementsExploitationCnps: number;
  decaissementsExploitationDetails?: Array<{
    date: string;
    piece?: string;
    motif: string;
    montant: number;
    beneficiaire?: string;
    mode?: string;
  }>;
  totalDecaissementsApportPca: number;
  decaissementsApportPcaDetails?: Array<{
    date: string;
    piece?: string;
    motif: string;
    montant: number;
    beneficiaire?: string;
    mode?: string;
    categorie?: string;
  }>;
  soldeNet?: number;
  parametres?: ParametresApp;
  fileName?: string;
}

/**
 * Génère et exporte le PDF certifié officiel de l'État des Encaissements et Décaissements
 * avec ventilation stricte des décaissements selon leurs deux origines de fonds :
 * 1. Exploitation : UNIQUEMENT les montants relatifs aux cotisations CNPS
 * 2. Apport personnel du PCA : Tout le reste des dépenses
 */
export function generateEtatEncaissementsDecaissementsPdf({
  periode,
  totalEncaissements,
  totalDecaissements,
  totalDecaissementsExploitationCnps,
  decaissementsExploitationDetails = [],
  totalDecaissementsApportPca,
  decaissementsApportPcaDetails = [],
  soldeNet,
  parametres,
  fileName,
  signataires,
}: GenerateEtatEncaissementsDecaissementsPdfOptions): boolean {
  try {
    const pageWidth = 210;
    const pageHeight = 297;
    const marginLeft = 12;
    const marginRight = 12;
    const marginTop = 10;
    const marginBottom = 12;
    const printableWidth = pageWidth - marginLeft - marginRight;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const nomOrg = cleanPdfText(
      parametres?.nomOrganisation ||
        'COOPÉRATIVE DE SÉCURITÉ SOCIALE DES TRAVAILLEURS INDÉPENDANTS (COSITI)'
    );
    const sigle = cleanPdfText(parametres?.sigle || 'COSITI');
    const slogan = cleanPdfText(
      parametres?.slogan || 'Solidarité • Prévoyance • Dignité des Travailleurs'
    );
    const tel = cleanPdfText(parametres?.telephone || '+225 05 45 67 89 01');
    const email = cleanPdfText(parametres?.email || 'contact@cositi-ci.org');

    const soldeCalcule =
      soldeNet !== undefined ? soldeNet : totalEncaissements - totalDecaissements;

    let curY = marginTop;

    const drawHeader = () => {
      // Bande verte décorative supérieure
      doc.setFillColor(6, 95, 70); // emerald-800
      doc.rect(0, 0, pageWidth, 4, 'F');

      curY = marginTop;

      // Sigle
      doc.setFillColor(6, 95, 70);
      doc.roundedRect(marginLeft, curY, 22, 7.5, 1.2, 1.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(sigle, marginLeft + 11, curY + 5.2, { align: 'center' });

      // Nom organisation & Slogan
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(nomOrg, marginLeft + 25, curY + 4.5);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(4, 120, 87);
      doc.text(`"${slogan}"`, marginLeft + 25, curY + 8);

      // Horodatage et infos à droite
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      const nowStr = new Date().toLocaleDateString('fr-FR');
      const timeStr = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      doc.text(`Document certifié officiel`, pageWidth - marginRight, curY + 3.5, { align: 'right' });
      doc.text(`Édité le : ${nowStr} à ${timeStr}`, pageWidth - marginRight, curY + 7, { align: 'right' });

      curY += 12;

      // Ligne séparatrice
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(marginLeft, curY, pageWidth - marginRight, curY);

      curY += 4;
    };

    drawHeader();

    // Bannière Titre Principal du Document
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginLeft, curY, printableWidth, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('ÉTAT OFFICIEL DES ENCAISSEMENTS ET DES DÉCAISSEMENTS', marginLeft + 4, curY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(4, 120, 87);
    doc.text(`PÉRIODE : ${cleanPdfText(periode).toUpperCase()}`, marginLeft + 4, curY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(
      'Ventilation des Décaissements : (1) Exploitation CNPS  •  (2) Apport Personnel du PCA',
      pageWidth - marginRight - 4,
      curY + 10.5,
      { align: 'right' }
    );

    curY += 17;

    // Encadré Règle de Gouvernance Financière
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(245, 158, 11); // amber-500
    doc.setLineWidth(0.3);
    doc.roundedRect(marginLeft, curY, printableWidth, 10.5, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(146, 64, 14); // amber-900
    doc.text('RÈGLE DE GESTION & ORIGINE DE FINANCEMENT DES FONDS :', marginLeft + 3, curY + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(120, 53, 15);
    const regleDesc =
      'Les décaissements de la coopérative obéissent à une dissociation stricte : (A) Les dépenses d\'EXPLOITATION regroupent EXCLUSIVEMENT les montants relatifs aux cotisations CNPS des adhérents ; (B) TOUT LE RESTE des charges de fonctionnement (loyer, carburant, primes, matériel, etc.) provient intégralement de l\'APPORT PERSONNEL DU PCA.';
    const splitRegle = doc.splitTextToSize(regleDesc, printableWidth - 6);
    doc.text(splitRegle, marginLeft + 3, curY + 7);

    curY += 13.5;

    // 3 Cadres Synthétiques KPI (Encaissements, Décaissements, Solde Net)
    const cardWidth = (printableWidth - 6) / 3;

    // 1. Cadre Encaissements
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.roundedRect(marginLeft, curY, cardWidth, 18, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(4, 120, 87);
    doc.text('TOTAL ENCAISSEMENTS', marginLeft + 3, curY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(6, 95, 70);
    doc.text(`+ ${totalEncaissements.toLocaleString('fr-FR')} F`, marginLeft + 3, curY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text('Recettes cotisations adhérents', marginLeft + 3, curY + 15.5);

    // 2. Cadre Décaissements
    const card2X = marginLeft + cardWidth + 3;
    doc.setFillColor(254, 242, 242); // rose-50
    doc.setDrawColor(244, 63, 94); // rose-500
    doc.roundedRect(card2X, curY, cardWidth, 18, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(190, 18, 60);
    doc.text('TOTAL DÉCAISSEMENTS', card2X + 3, curY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(159, 18, 57);
    doc.text(`- ${totalDecaissements.toLocaleString('fr-FR')} F`, card2X + 3, curY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(71, 85, 105);
    doc.text('Exploitation CNPS + Apport PCA', card2X + 3, curY + 15.5);

    // 3. Cadre Solde Net de Trésorerie
    const card3X = card2X + cardWidth + 3;
    const isPositif = soldeCalcule >= 0;
    if (isPositif) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(34, 197, 94);
    } else {
      doc.setFillColor(255, 241, 242);
      doc.setDrawColor(239, 68, 68);
    }
    doc.roundedRect(card3X, curY, cardWidth, 18, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    if (isPositif) {
      doc.setTextColor(21, 128, 61);
    } else {
      doc.setTextColor(185, 28, 28);
    }
    doc.text('SOLDE NET DE TRÉSORERIE', card3X + 3, curY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    if (isPositif) {
      doc.setTextColor(20, 83, 45);
    } else {
      doc.setTextColor(153, 27, 27);
    }
    doc.text(`${isPositif ? '+' : ''}${soldeCalcule.toLocaleString('fr-FR')} F`, card3X + 3, curY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(isPositif ? 'Excédent net consolidé' : 'Déficit de période', card3X + 3, curY + 15.5);

    curY += 21;

    // Tableau Récapitulatif Consolidé des Deux Origines de Décaissement
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginLeft, curY, printableWidth, 31, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('TABLEAU DE CONCILIATION FINANCIÈRE & ORIGINES DE PROVENANCE', marginLeft + 3, curY + 4.5);

    // Lignes de conciliation
    const recapRows = [
      {
        libelle: '1. ENCAISSEMENTS GLOBAUX (Cotisations Adhérents perçues)',
        origine: 'Ressources de la coopérative',
        montant: `+ ${totalEncaissements.toLocaleString('fr-FR')} FCFA`,
        isPlus: true,
      },
      {
        libelle: '2. DÉCAISSEMENTS EXPLOITATION (Uniquement Cotisations CNPS)',
        origine: 'Fonds propres Exploitation (CNPS)',
        montant: `- ${totalDecaissementsExploitationCnps.toLocaleString('fr-FR')} FCFA`,
        isMinus: true,
      },
      {
        libelle: '3. DÉCAISSEMENTS SUR APPORT DU PCA (Toutes les autres charges)',
        origine: 'Apport Personnel du PCA (YAO K. Daniel)',
        montant: `- ${totalDecaissementsApportPca.toLocaleString('fr-FR')} FCFA`,
        isMinus: true,
      },
      {
        libelle: 'TOTAL DES DÉCAISSEMENTS CUMULÉS (2 + 3)',
        origine: 'Exploitation CNPS + Apport PCA',
        montant: `- ${totalDecaissements.toLocaleString('fr-FR')} FCFA`,
        isBold: true,
      },
    ];

    let rowY = curY + 8;
    recapRows.forEach((r, idx) => {
      doc.setFont('helvetica', r.isBold ? 'bold' : 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(r.isBold ? 15 : 51, r.isBold ? 23 : 65, r.isBold ? 42 : 85);
      doc.text(r.libelle, marginLeft + 3, rowY);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text(`[${r.origine}]`, marginLeft + 105, rowY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      if (r.isPlus) doc.setTextColor(4, 120, 87);
      else if (r.isMinus) doc.setTextColor(190, 18, 60);
      else doc.setTextColor(15, 23, 42);

      doc.text(r.montant, pageWidth - marginRight - 3, rowY, { align: 'right' });

      // Ligne séparatrice fine
      if (idx < recapRows.length - 1) {
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(marginLeft + 2, rowY + 1.8, pageWidth - marginRight - 2, rowY + 1.8);
      }
      rowY += 5.2;
    });

    curY += 34;

    // Section 1 : Détail Décaissements Exploitation (Uniquement Cotisations CNPS)
    const drawSectionHeader = (titleText: string, colorRgb: [number, number, number]) => {
      doc.setFillColor(colorRgb[0], colorRgb[1], colorRgb[2]);
      doc.rect(marginLeft, curY, printableWidth, 5.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(255, 255, 255);
      doc.text(titleText, marginLeft + 3, curY + 3.8);
      curY += 5.5;
    };

    drawSectionHeader(
      `SECTION A : DÉCAISSEMENTS D'EXPLOITATION — UNIQUEMENT COTISATIONS CNPS (${decaissementsExploitationDetails.length} opérations • Total : ${totalDecaissementsExploitationCnps.toLocaleString('fr-FR')} FCFA)`,
      [30, 64, 175] // blue-800
    );

    // En-tête colonnes tableau CNPS
    const drawSubTableHeaders = (isExploitation: boolean) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(marginLeft, curY, printableWidth, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.3);
      doc.setTextColor(71, 85, 105);

      doc.text('Date', marginLeft + 2, curY + 3.5);
      doc.text('N° Pièce / Réf.', marginLeft + 22, curY + 3.5);
      doc.text(isExploitation ? 'Motif Reversement CNPS' : 'Dépense / Motif (Apport PCA)', marginLeft + 50, curY + 3.5);
      doc.text('Bénéficiaire', marginLeft + 120, curY + 3.5);
      doc.text('Mode', marginLeft + 155, curY + 3.5);
      doc.text('Montant (FCFA)', pageWidth - marginRight - 2, curY + 3.5, { align: 'right' });
      curY += 5;
    };

    drawSubTableHeaders(true);

    if (decaissementsExploitationDetails.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Aucun décaissement au titre des cotisations CNPS enregistré sur cette période.',
        marginLeft + 4,
        curY + 4
      );
      curY += 6;
    } else {
      decaissementsExploitationDetails.forEach((d) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(15, 23, 42);

        doc.text(cleanPdfText(d.date), marginLeft + 2, curY + 3.5);
        doc.text(cleanPdfText(d.piece || '—'), marginLeft + 22, curY + 3.5);

        const motifSplit = doc.splitTextToSize(cleanPdfText(d.motif), 68);
        doc.text(motifSplit[0] || '', marginLeft + 50, curY + 3.5);

        doc.text(cleanPdfText(d.beneficiaire || 'CNPS'), marginLeft + 120, curY + 3.5);
        doc.text(cleanPdfText(d.mode || 'Virement'), marginLeft + 155, curY + 3.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text(`${d.montant.toLocaleString('fr-FR')} F`, pageWidth - marginRight - 2, curY + 3.5, {
          align: 'right',
        });

        curY += 4.8;
      });
    }

    curY += 3;

    // Section 2 : Détail Décaissements financés par l'Apport Personnel du PCA
    // Vérification saut de page
    if (curY + 45 > pageHeight - marginBottom) {
      doc.addPage();
      curY = marginTop;
      drawHeader();
    }

    drawSectionHeader(
      `SECTION B : DÉCAISSEMENTS SUR APPORT PERSONNEL DU PCA — TOUT LE RESTE (${decaissementsApportPcaDetails.length} opérations • Total : ${totalDecaissementsApportPca.toLocaleString('fr-FR')} FCFA)`,
      [180, 83, 9] // amber-700
    );

    drawSubTableHeaders(false);

    if (decaissementsApportPcaDetails.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Aucune autre dépense enregistrée sur apport personnel du PCA sur cette période.',
        marginLeft + 4,
        curY + 4
      );
      curY += 6;
    } else {
      decaissementsApportPcaDetails.slice(0, 10).forEach((d) => {
        if (curY + 5 > pageHeight - marginBottom - 35) {
          doc.addPage();
          curY = marginTop;
          drawHeader();
          drawSectionHeader('SECTION B (SUITE) : DÉCAISSEMENTS SUR APPORT DU PCA', [180, 83, 9]);
          drawSubTableHeaders(false);
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.4);
        doc.setTextColor(15, 23, 42);

        doc.text(cleanPdfText(d.date), marginLeft + 2, curY + 3.5);
        doc.text(cleanPdfText(d.piece || '—'), marginLeft + 22, curY + 3.5);

        const motifSplit = doc.splitTextToSize(cleanPdfText(d.motif), 68);
        doc.text(motifSplit[0] || '', marginLeft + 50, curY + 3.5);

        doc.text(cleanPdfText(d.beneficiaire || '—'), marginLeft + 120, curY + 3.5);
        doc.text(cleanPdfText(d.mode || 'Caisse'), marginLeft + 155, curY + 3.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 83, 9);
        doc.text(`${d.montant.toLocaleString('fr-FR')} F`, pageWidth - marginRight - 2, curY + 3.5, {
          align: 'right',
        });

        curY += 4.6;
      });

      if (decaissementsApportPcaDetails.length > 10) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.2);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `... et ${decaissementsApportPcaDetails.length - 10} autre(s) dépense(s) prise(s) en charge par l'apport personnel du PCA (voir détail en annexe)`,
          marginLeft + 4,
          curY + 3.5
        );
        curY += 5;
      }
    }

    curY += 4;

    // Cartouche officiel de signatures en 3 volets (DAF, PCA, DG)
    if (curY + 32 > pageHeight - marginBottom) {
      doc.addPage();
      curY = marginTop + 10;
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(marginLeft, curY, pageWidth - marginRight, curY);

    curY += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('VISA & SIGNATURES CONJOINTES DE VALIDATION', marginLeft, curY + 2);
    curY += 5;

    const sigBoxWidth = (printableWidth - 8) / 3;

    // 1. Signature DAF
    doc.setFillColor(248, 250, 252);
    doc.rect(marginLeft, curY, sigBoxWidth, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text('Le Directeur Admin. & Financier (DAF)', marginLeft + 2, curY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.text(cleanPdfText(signataires?.daf || ''), marginLeft + 2, curY + 7.5);
    doc.text('Certifié conforme aux pièces de caisse', marginLeft + 2, curY + 19);

    // 2. Signature PCA (Mise en valeur spéciale car apporteur personnel)
    const sig2X = marginLeft + sigBoxWidth + 4;
    doc.setFillColor(254, 243, 199); // ambre clair
    doc.setDrawColor(245, 158, 11);
    doc.rect(sig2X, curY, sigBoxWidth, 22, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(146, 64, 14);
    doc.text('Le Président du CA (PCA)', sig2X + 2, curY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.text(cleanPdfText(signataires?.pca || ''), sig2X + 2, curY + 7.5);
    doc.text('Apporteur personnel des fonds de gestion', sig2X + 2, curY + 19);

    // 3. Signature DG
    const sig3X = sig2X + sigBoxWidth + 4;
    doc.setFillColor(248, 250, 252);
    doc.rect(sig3X, curY, sigBoxWidth, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text('Le Directeur Général (DG)', sig3X + 2, curY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.text(cleanPdfText(signataires?.dg || ''), sig3X + 2, curY + 7.5);
    doc.text('Visa de validation générale', sig3X + 2, curY + 19);

    // Numérotation des pages
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginLeft, pageHeight - 8, pageWidth - marginRight, pageHeight - 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Document certifié COSITI • État des encaissements et décaissements (Exploitation CNPS / Apport PCA)',
        marginLeft,
        pageHeight - 4.5
      );
      doc.text(`Page ${p} sur ${totalPages}`, pageWidth - marginRight, pageHeight - 4.5, {
        align: 'right',
      });
    }

    const cleanSafePeriod = cleanPdfText(periode).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeTitle = (fileName || `COSITI_Encaissements_Decaissements_${cleanSafePeriod}`)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    const dateStamp = new Date().toISOString().split('T')[0];
    const finalFileName = `${safeTitle}_${dateStamp}.pdf`;

    logEvent('EXPORT_DONNEES', 'Rapport PDF : ' + String(finalFileName));
    doc.save(finalFileName);
    return true;
  } catch (err) {
    console.error('Erreur génération PDF Encaissements/Décaissements:', err);
    return false;
  }
}
