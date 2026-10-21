import { logEvent } from '../api/client';
import type { EtatMensuel } from '../api/models';
import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], fileName: string, sheetName = 'Données') {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    logEvent('EXPORT_DONNEES', 'Export Excel : ' + String(`${fileName}.xlsx`));
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (err) {
    console.error('Erreur lors de l\'export Excel:', err);
    // Fallback simple CSV si souci
    exportToCsv(data, fileName);
  }
}

/**
 * Classeur de clôture mensuelle. MISE EN FORME UNIQUEMENT : tous les chiffres viennent de l'état mensuel calculé par
 * le serveur (GET /rapports/etat-mensuel) ; rien n'est recalculé ici.
 */
export function exportMonthlyReportExcel({ etat, parametres }: { etat: EtatMensuel; parametres: any }) {
  try {
    const workbook = XLSX.utils.book_new();
    const { mois, annee } = etat.periode;
    const fin = etat.finances;
    const totalCotiseMois = etat.cotisations.total;
    const totalDepensesMois = fin?.depenses.total ?? 0;
    const totalVersementsMois = fin?.versements.total ?? 0;
    const rapp = fin?.rapprochement;

    // 1. Feuille Synthèse Mensuelle
    const syntheseData: any[] = [
      { Rubrique: 'ÉTAT FINANCIER & STATISTIQUE MENSUEL', Valeur: `${mois.toUpperCase()} ${annee}` },
      { Rubrique: 'Organisation', Valeur: parametres.nomOrganisation || 'COSITI' },
      { Rubrique: "Date d'exportation", Valeur: new Date().toLocaleString('fr-FR') },
      { Rubrique: '', Valeur: '' },
      { Rubrique: '--- INDICATEURS CLÉS DU MOIS ---', Valeur: '' },
      { Rubrique: 'Total Cotisations Encaissées (FCFA)', Valeur: totalCotiseMois },
      { Rubrique: 'Nombre total de versements reçus', Valeur: etat.cotisations.nombre },
      { Rubrique: "Nombre d'adhérents cotisants ce mois", Valeur: etat.comptes.cotisants },
      { Rubrique: 'Total Dépenses décaissées ce mois (FCFA)', Valeur: totalDepensesMois },
      { Rubrique: 'Total Versements en Banque ce mois (FCFA)', Valeur: totalVersementsMois },
      { Rubrique: 'Solde Net Mensuel Théorique (FCFA)', Valeur: fin?.soldeNet ?? totalCotiseMois },
      { Rubrique: '', Valeur: '' },
      { Rubrique: '--- VENTILATION PAR MODE DE PAIEMENT ---', Valeur: '' },
      ...etat.statsParMode.map((m) => ({ Rubrique: `Mode : ${m.mode}`, Valeur: `${m.montant} FCFA (${m.pourcentage}%)` })),
      { Rubrique: '', Valeur: '' },
      { Rubrique: '--- VENTILATION PAR AGENT ENREGISTREUR ---', Valeur: '' },
      ...etat.statsParAgent.map((a) => ({ Rubrique: `Agent : ${a.agent}`, Valeur: `${a.montant} FCFA (${a.count} versements)` })),
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(syntheseData), 'Synthèse Mensuelle');

    // 2. Feuille Relevé des Cotisations du Mois
    const cotisData = etat.cotisations.liste.map((c) => ({
      'Date Paiement': c.datePaiement,
      'Matricule Adhérent': c.matricule,
      'Nom & Prénoms Adhérent': c.adherentNomPrenom,
      'Montant (FCFA)': c.montant,
      'Mode de Paiement': c.modePaiement,
      'Référence Transaction': c.reference || '—',
      'Mois Déclaré': c.mois,
      'Année': c.annee,
      'Agent Enregistreur': c.agentEnregistreur,
      'Observations': c.observations || '',
    }));
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(cotisData.length > 0 ? cotisData : [{ 'Information': 'Aucun versement enregistré pour ce mois' }]),
      'Cotisations du Mois'
    );

    // 3. Feuille Relevé Nominatif par Adhérent pour le Mois
    const adherentsData = etat.nominatif.map((n) => ({
      'Matricule': n.adherent.matricule,
      'Nom & Prénoms': `${n.adherent.nom} ${n.adherent.prenom}`,
      'Téléphone': n.adherent.telephone,
      'Tarif Journalier (FCFA)': n.adherent.tarifJournalier,
      'Versements ce Mois (FCFA)': n.montantMois,
      'Nombre Jours Couverts ce Mois': n.nbJoursMois,
      'Nb Versements ce Mois': n.nbVersementsMois,
      'Cumul Total Fin de Mois (FCFA)': n.cumulTotal,
      'Seuil 15 000 F': n.seuil15000Atteint ? 'ATTEINT' : 'EN COURS',
      'Statut Immatriculation': n.adherent.statutImmatriculation || 'Non immatriculé',
      'N° CNPS': n.adherent.numeroCnps || '—',
      'A Cotisé ce Mois': n.aCotiseCeMois ? 'OUI' : 'NON',
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(adherentsData), 'État Nominatif Adhérents');

    // 4. Feuille Dépenses du Mois (direction financière)
    if (fin && fin.depenses.liste.length > 0) {
      const depensesData = fin.depenses.liste.map((d) => ({
        'Date': d.date,
        'Référence': d.numeroPiece || d.id,
        'Catégorie': d.categorie,
        'Montant (FCFA)': d.montant,
        'Bénéficiaire': d.beneficiaire || '—',
        'Description': d.motif || '',
        'Enregistré par': d.enregistrePar || '',
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(depensesData), 'Dépenses du Mois');
    }

    // 5. Feuille Rapprochement Banque & Réserve Cotisations CNPS (direction financière)
    if (rapp) {
      const rapprochementData: any[] = [
        { Poste: 'RAPPROCHEMENT BANCAIRE & RÉSERVE COTISATIONS CNPS', Montant: '', Observations: `Période : ${mois} ${annee}` },
        { Poste: 'Organisation', Montant: parametres?.nomOrganisation || 'COSITI', Observations: parametres?.sigle || 'COSITI' },
        { Poste: "Date d'édition", Montant: new Date().toLocaleString('fr-FR'), Observations: 'Clôture mensuelle certifiée' },
        { Poste: '', Montant: '', Observations: '' },
        { Poste: '1. TOTAL DES FONDS VERSÉS EN BANQUE (Bordereaux)', Montant: rapp.fondsBanque.total, Observations: `${rapp.fondsBanque.nombre} remise(s) bancaire(s) effectuée(s)` },
        { Poste: '2. DÉDUCTION : FONDS RÉSERVÉS AUX COTISATIONS CNPS', Montant: -rapp.reserveCnps.total, Observations: `${rapp.reserveCnps.nombreAdherents} travailleur(s) couvert(s) par la réserve CNPS` },
        { Poste: '3. SOLDE RÉEL DISPONIBLE EN BANQUE (HORS CNPS)', Montant: rapp.soldeReelBanque, Observations: rapp.soldeReelBanque >= 0 ? 'Trésorerie nette libre disponible (Réserve CNPS 100% sanctuarisée en banque)' : 'ATTENTION : Déficit de couverture bancaire de la réserve CNPS' },
        { Poste: '', Montant: '', Observations: '' },
        { Poste: 'Taux de couverture de la Réserve CNPS en Banque', Montant: `${rapp.tauxCouverture.toFixed(1)} %`, Observations: rapp.tauxCouverture >= 100 ? 'Réserve intégralement sécurisée' : 'Dépôt complémentaire en banque requis' },
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rapprochementData), 'Rapprochement Banque - CNPS');
    }

    const fileName = `COSITI_Cloture_Mensuelle_${mois}_${annee}`;
    logEvent('EXPORT_DONNEES', 'Export Excel : ' + String(`${fileName}.xlsx`));
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (err) {
    console.error("Erreur lors de la génération de l'état mensuel Excel:", err);
  }
}

export function exportToCsv(data: any[], fileName: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((obj) =>
    headers
      .map((header) => {
        const val = obj[header] === undefined || obj[header] === null ? '' : String(obj[header]);
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(';')
  );
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportRapprochementBanqueCnpsExcel({
  periode,
  parametres,
  totalFondsBanque,
  totalReserveCnps,
  soldeReelBanque,
  tauxCouverture,
  versementsList,
  adherentsReserveList,
}: {
  periode: string;
  parametres: any;
  totalFondsBanque: number;
  totalReserveCnps: number;
  soldeReelBanque: number;
  tauxCouverture: number;
  versementsList: any[];
  adherentsReserveList: any[];
}) {
  try {
    const workbook = XLSX.utils.book_new();

    // 1. Feuille Synthèse du Rapprochement & Solde Réel
    const syntheseRows = [
      { Postes: 'ÉTAT DE RAPPROCHEMENT BANCAIRE & RÉSERVE CNPS', Montant: '', Observations: `Période : ${periode}` },
      { Postes: 'Organisation', Montant: parametres?.nomOrganisation || 'COSITI', Observations: parametres?.sigle || 'COSITI' },
      { Postes: 'Date d\'édition du rapport', Montant: new Date().toLocaleString('fr-FR'), Observations: 'Document certifié' },
      { Postes: '', Montant: '', Observations: '' },
      { Postes: '1. TOTAL DES FONDS VERSÉS EN BANQUE (Bordereaux)', Montant: totalFondsBanque, Observations: `${versementsList.length} remise(s) bancaire(s)` },
      { Postes: '2. DÉDUCTION : FONDS RÉSERVÉS AUX COTISATIONS CNPS', Montant: -totalReserveCnps, Observations: 'Fonds sanctuarisés sécurité sociale' },
      { Postes: '3. SOLDE RÉEL DISPONIBLE EN BANQUE (HORS CNPS)', Montant: soldeReelBanque, Observations: soldeReelBanque >= 0 ? 'Trésorerie nette libre disponible' : 'Déficit de couverture de la réserve CNPS' },
      { Postes: '', Montant: '', Observations: '' },
      { Postes: 'INDICATEURS DE COUVERTURE', Montant: '', Observations: '' },
      { Postes: 'Part des fonds bancaires réservée à la CNPS', Montant: `${tauxCouverture.toFixed(1)} %`, Observations: 'Ratio de sanctuarisation' },
      { Postes: 'Nombre d\'adhérents bénéficiaires de la réserve CNPS', Montant: adherentsReserveList.length, Observations: 'Travailleurs couverts' },
    ];
    const wsSynthese = XLSX.utils.json_to_sheet(syntheseRows);
    XLSX.utils.book_append_sheet(workbook, wsSynthese, 'Synthèse Rapprochement');

    // 2. Feuille Détail des Versements en Banque
    const versementsRows = versementsList.map((v) => ({
      'Date': v.date,
      'Banque Partenaire': v.banque,
      'N° Bordereau': v.numeroBordereau,
      'N° Compte Bancaire': v.numeroCompte || '—',
      'Source des Fonds': v.sourceFonds,
      'Déposant': v.deposant,
      'Montant Déposé (FCFA)': v.montant,
      'Statut': v.statut,
      'Observations': v.observations || '',
    }));
    const wsVersements = XLSX.utils.json_to_sheet(
      versementsRows.length > 0 ? versementsRows : [{ 'Information': 'Aucun versement bancaire trouvé pour cette période' }]
    );
    XLSX.utils.book_append_sheet(workbook, wsVersements, 'Bordereaux Versements');

    // 3. Feuille Détail de la Réserve Cotisations CNPS par Adhérent
    const reserveRows = adherentsReserveList.map((a) => ({
      'Matricule Adhérent': a.matricule,
      'Nom & Prénoms': a.nomComplet,
      'Téléphone': a.telephone,
      'Statut CNPS': a.statutCnps,
      'N° Immatriculation CNPS': a.numeroCnps || 'En attente',
      'Cotisations Perçues (FCFA)': a.cotisationsPercues,
      'Montant Réservé CNPS (FCFA)': a.montantReserve,
      'Affectation Prévoyance': a.affectation,
    }));
    const wsReserve = XLSX.utils.json_to_sheet(
      reserveRows.length > 0 ? reserveRows : [{ 'Information': 'Aucune réserve CNPS enregistrée pour cette période' }]
    );
    XLSX.utils.book_append_sheet(workbook, wsReserve, 'Réserve Cotisations CNPS');

    const cleanPeriode = periode.replace(/[^a-zA-Z0-9_-]/g, '_');
    logEvent('EXPORT_DONNEES', 'Export Excel : ' + String(`COSITI_Rapprochement_Banque_Reserve_CNPS_${cleanPeriode}.xlsx`));
    XLSX.writeFile(workbook, `COSITI_Rapprochement_Banque_Reserve_CNPS_${cleanPeriode}.xlsx`);
  } catch (err) {
    console.error('Erreur lors de l\'export Excel du rapprochement banque-CNPS:', err);
  }
}

export function exportEtatEncaissementsDecaissementsExcel({
  periode,
  parametres,
  totalEncaissements,
  totalDecaissements,
  totalDecaissementsExploitationCnps,
  decaissementsExploitationDetails = [],
  totalDecaissementsApportPca,
  decaissementsApportPcaDetails = [],
  soldeNet,
}: {
  periode: string;
  parametres: any;
  totalEncaissements: number;
  totalDecaissements: number;
  totalDecaissementsExploitationCnps: number;
  decaissementsExploitationDetails?: any[];
  totalDecaissementsApportPca: number;
  decaissementsApportPcaDetails?: any[];
  soldeNet?: number;
}) {
  try {
    const workbook = XLSX.utils.book_new();
    const soldeFinal =
      soldeNet !== undefined ? soldeNet : totalEncaissements - totalDecaissements;

    // 1. Feuille Synthèse des Flux & Origines
    const syntheseRows = [
      { Poste: 'ÉTAT DES ENCAISSEMENTS ET DÉCAISSEMENTS', Montant: '', Observations: `Période : ${periode}` },
      { Poste: 'Organisation', Montant: parametres?.nomOrganisation || 'COSITI', Observations: parametres?.sigle || 'COSITI' },
      { Poste: 'Date d\'édition', Montant: new Date().toLocaleString('fr-FR'), Observations: 'Document certifié DAF / PCA' },
      { Poste: '', Montant: '', Observations: '' },
      { Poste: '1. TOTAL ENCAISSEMENTS (Recettes Cotisations)', Montant: totalEncaissements, Observations: 'Ressources perçues de la coopérative' },
      { Poste: '2. TOTAL DÉCAISSEMENTS EFFECTUÉS', Montant: -totalDecaissements, Observations: 'Sorties de trésorerie consolidées' },
      { Poste: '   • Dont Exploitation (Uniquement Cotisations CNPS)', Montant: -totalDecaissementsExploitationCnps, Observations: 'Fonds sanctuarisés sécurité sociale' },
      { Poste: '   • Dont Apport Personnel du PCA (Tout le reste)', Montant: -totalDecaissementsApportPca, Observations: 'Prise en charge personnelle PCA YAO K. Daniel' },
      { Poste: '', Montant: '', Observations: '' },
      { Poste: '3. SOLDE NET DE TRÉSORERIE (1 - 2)', Montant: soldeFinal, Observations: soldeFinal >= 0 ? 'Excédent net consolidé' : 'Déficit de période' },
      { Poste: '', Montant: '', Observations: '' },
      { Poste: 'RÈGLE DE GESTION APPLIQUÉE', Montant: '', Observations: 'Décaissements Exploitation = Uniquement Cotisations CNPS • Décaissements Apport PCA = Toutes les autres charges' },
    ];
    const wsSynthese = XLSX.utils.json_to_sheet(syntheseRows);
    XLSX.utils.book_append_sheet(workbook, wsSynthese, 'Synthèse des Flux');

    // 2. Feuille Décaissements Exploitation (Cotisations CNPS)
    const cnpsRows = decaissementsExploitationDetails.map((d) => ({
      'Date': d.date,
      'N° Pièce / Bordereau': d.piece || d.numeroPiece || '—',
      'Motif Reversement CNPS': d.motif,
      'Bénéficiaire': d.beneficiaire || 'CNPS',
      'Mode de Paiement': d.mode || d.modePaiement || 'Virement',
      'Montant Décaissé (FCFA)': d.montant,
      'Origine de Financement': 'Exploitation (Cotisations CNPS)',
    }));
    const wsCnps = XLSX.utils.json_to_sheet(
      cnpsRows.length > 0 ? cnpsRows : [{ 'Information': 'Aucun décaissement CNPS sur cette période' }]
    );
    XLSX.utils.book_append_sheet(workbook, wsCnps, 'Exploitation CNPS');

    // 3. Feuille Décaissements Apport Personnel du PCA
    const pcaRows = decaissementsApportPcaDetails.map((d) => ({
      'Date': d.date,
      'N° Pièce / Facture': d.piece || d.numeroPiece || '—',
      'Catégorie de Dépense': d.categorie || 'Fonctionnement',
      'Motif / Objet': d.motif,
      'Bénéficiaire': d.beneficiaire || '—',
      'Mode de Paiement': d.mode || d.modePaiement || 'Espèces',
      'Montant Pris en Charge (FCFA)': d.montant,
      'Origine de Financement': 'Apport personnel du PCA',
    }));
    const wsPca = XLSX.utils.json_to_sheet(
      pcaRows.length > 0 ? pcaRows : [{ 'Information': 'Aucun décaissement sur apport PCA sur cette période' }]
    );
    XLSX.utils.book_append_sheet(workbook, wsPca, 'Apport Personnel PCA');

    const cleanPeriode = periode.replace(/[^a-zA-Z0-9_-]/g, '_');
    logEvent('EXPORT_DONNEES', 'Export Excel : ' + String(`COSITI_Encaissements_Decaissements_${cleanPeriode}.xlsx`));
    XLSX.writeFile(workbook, `COSITI_Encaissements_Decaissements_${cleanPeriode}.xlsx`);
  } catch (err) {
    console.error('Erreur lors de l\'export Excel des encaissements/décaissements:', err);
  }
}
