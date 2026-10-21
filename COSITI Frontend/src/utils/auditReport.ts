import type { JournalOperation } from '../types';
import type { RapportAudit } from '../context/AppContext';

/** Libellés lisibles des types d'opération du journal d'audit */
export const LIBELLES_OPERATIONS: Record<string, string> = {
  CONNEXION: 'Connexion',
  DECONNEXION: 'Déconnexion',
  ECHEC_CONNEXION: 'Échec de connexion',
  CHANGEMENT_MOT_DE_PASSE: 'Changement de mot de passe',
  CHANGEMENT_UTILISATEUR: "Bascule d'utilisateur",
  ECHEC_CODE_CONFIRMATION: 'Code de confirmation erroné',
  CREATION_ADHERENT: "Création d'adhérent",
  MODIFICATION_ADHERENT: "Modification d'adhérent",
  MODIFICATION_STATUT_ADHERENT: "Changement de statut d'adhérent",
  SUPPRESSION_ADHERENT: "Suppression d'adhérent",
  ENREGISTREMENT_COTISATION: 'Encaissement de cotisation',
  MODIFICATION_COTISATION: 'Modification de cotisation',
  REGULARISATION_COTISATION: 'Régularisation de cotisation',
  SUPPRESSION_COTISATION: 'Suppression de cotisation',
  IMMATRICULATION: 'Immatriculation CNPS',
  CREATION_DOSSIER: 'Création de dossier CNPS',
  MODIFICATION_DOSSIER: 'Mise à jour de dossier CNPS',
  DECLARATION_TRAVAILLEUR_SANS_ENFANT: 'Déclaration « sans enfant »',
  MODIFICATION_PARAMETRES: 'Modification des paramètres',
  CREATION_UTILISATEUR: 'Création de compte',
  MODIFICATION_UTILISATEUR: 'Modification de compte',
  MODIFICATION_IDENTIFIANTS: 'Modification des identifiants',
  SUPPRESSION_UTILISATEUR: 'Suppression de compte',
  ENREGISTREMENT_DEPENSE: 'Enregistrement de dépense',
  MODIFICATION_DEPENSE: 'Modification de dépense',
  SUPPRESSION_DEPENSE: 'Suppression de dépense',
  ENREGISTREMENT_VERSEMENT_BANCAIRE: 'Versement bancaire',
  MODIFICATION_VERSEMENT_BANCAIRE: 'Modification de versement',
  SUPPRESSION_VERSEMENT_BANCAIRE: 'Suppression de versement',
  ENREGISTREMENT_FRAIS_MOBILE_MONEY: 'Frais Mobile Money',
  MODIFICATION_FRAIS_MOBILE_MONEY: 'Modification de frais Mobile Money',
  SUPPRESSION_FRAIS_MOBILE_MONEY: 'Suppression de frais Mobile Money',
  AJOUT_BANQUE: 'Ajout de banque',
  SUPPRESSION_BANQUE: 'Suppression de banque',
  AJOUT_EMPLOYE: 'Ajout de salarié',
  MODIFICATION_EMPLOYE: 'Modification de salarié',
  SUPPRESSION_EMPLOYE: 'Suppression de salarié',
  GENERATION_BULLETIN_PAIE: 'Génération de la paie',
  GENERATION_PAIE_ADHERENTS_CNPS: 'Paie des adhérents CNPS',
  MODIFICATION_BULLETIN_PAIE: 'Modification de bulletin',
  VALIDATION_PAIE_MOIS: 'Validation de la paie',
  AJUSTEMENT_COTISABLE_ADHERENT: "Ajustement d'assiette CNPS",
  CREATION_PARTENAIRE: 'Création de partenaire',
  MODIFICATION_PARTENAIRE: 'Modification de partenaire',
  SUPPRESSION_PARTENAIRE: 'Suppression de partenaire',
  CREATION_RENDEZ_VOUS: 'Planification de rendez-vous',
  MODIFICATION_RENDEZ_VOUS: 'Modification de rendez-vous',
  SUPPRESSION_RENDEZ_VOUS: 'Suppression de rendez-vous',
  CREATION_NOTE_DIRECTION: 'Création de note de direction',
  MODIFICATION_NOTE_DIRECTION: 'Modification de note de direction',
  SUPPRESSION_NOTE_DIRECTION: 'Suppression de note de direction',
  CREATION_GESTIONNAIRE: 'Création de gestionnaire',
  MODIFICATION_GESTIONNAIRE: 'Modification de gestionnaire',
  SUPPRESSION_GESTIONNAIRE: 'Suppression de gestionnaire',
  AFFECTATION_PORTEFEUILLE: 'Affectation de portefeuille',
  CREATION_RAPPORT_REUNION: 'Création de PV',
  MODIFICATION_RAPPORT_REUNION: 'Modification de PV',
  SUPPRESSION_RAPPORT_REUNION: 'Suppression de PV',
  ENREGISTREMENT_RAPPORT_AGENT: "Saisie de rapport d'agent",
  MODIFICATION_RAPPORT_AGENT: "Modification de rapport d'agent",
  SUPPRESSION_RAPPORT_AGENT: "Suppression de rapport d'agent",
  VALIDATION_RAPPORT_AGENT_DAF: 'Visa DAF de rapport',
  PURGE_OU_IMPORT_DONNEES: 'Purge / import / export de données',
  MISE_A_JOUR_LOGICIEL: 'Mise à jour logicielle',
  CONSULTATION_RAPPORT_AUDIT: "Génération d'un rapport d'audit",
  CONSULTATION_PROFIL: "Consultation du profil d'un acteur",
  IMPRESSION_RAPPORT_AUDIT: "Impression d'un rapport d'audit",
  IMPRESSION_DOCUMENT: 'Impression de document',
  IMPRESSION_RECU: 'Impression de reçu',
  EXPORT_DONNEES: 'Export de données',
  CONSULTATION_RAPPORT: 'Consultation de rapport',
};

export const libelleOperation = (t?: string) => (t ? LIBELLES_OPERATIONS[t] || t.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) : '—');

/** Catégorie visuelle d'une opération (couleur de badge) */
export function toneOperation(t?: string): 'auth' | 'danger' | 'create' | 'update' | 'other' {
  if (!t) return 'other';
  if (/ECHEC/.test(t)) return 'danger';
  if (/CONNEXION|DECONNEXION|MOT_DE_PASSE|UTILISATEUR$|IDENTIFIANTS/.test(t)) return 'auth';
  if (/SUPPRESSION|PURGE/.test(t)) return 'danger';
  if (/CREATION|ENREGISTREMENT|AJOUT|IMMATRICULATION|GENERATION/.test(t)) return 'create';
  if (/MODIFICATION|REGULARISATION|VALIDATION|AFFECTATION|AJUSTEMENT/.test(t)) return 'update';
  return 'other';
}

export const fmtDateHeure = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso)) : '—';

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const NIVEAU: Record<string, string> = { ecriture: 'Écriture', lecture: 'Lecture', aucun: 'Aucun accès' };

/** Document HTML imprimable du rapport d'audit d'un acteur */
export function rapportAuditHtml(r: RapportAudit): string {
  const u = r.utilisateur;
  const s = r.statistiques;
  const periode = r.periode.du || r.periode.au ? `du ${r.periode.du ? new Date(r.periode.du).toLocaleDateString('fr-FR') : '…'} au ${r.periode.au ? new Date(r.periode.au).toLocaleDateString('fr-FR') : '…'}` : 'toute la période';
  const logo = `${window.location.origin}/cositi-logo.jpg`;
  const rows = (r.actions as JournalOperation[])
    .map(
      (a, i) => `<tr><td class="n">${i + 1}</td><td class="nowrap">${esc(fmtDateHeure(a.dateHeure))}</td><td>${esc(libelleOperation(a.typeOperation))}</td><td>${esc(a.entite)}</td><td>${esc(a.description || a.details || '')}${a.matricule ? ` <span class="mat">[${esc(a.matricule)}]</span>` : ''}</td></tr>`
    )
    .join('');
  const parType = Object.entries(s.parTypeOperation)
    .map(([k, v]) => `<tr><td>${esc(libelleOperation(k))}</td><td class="num">${v}</td></tr>`)
    .join('');
  const modules = (u.modules || []).map((m) => `<tr><td>${esc(m.label)}</td><td>${NIVEAU[m.niveau] || m.niveau}</td></tr>`).join('');

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Rapport d'audit — ${esc(u.nom)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body { background: #fff; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #2b2116; font-size: 11px; margin: 0; padding: 0 2px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  header { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #D97F2E; padding-bottom: 10px; }
  header img { width: 78px; height: 78px; object-fit: cover; transform: scale(1.45); }
  header .logo { width: 78px; height: 78px; overflow: hidden; border-radius: 10px; }
  header h1 { margin: 0; font-size: 18px; color: #3A2A1C; }
  header p { margin: 2px 0 0; color: #6B5440; }
  h2 { font-size: 13px; color: #5B8A4A; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .04em; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #e3d6c4; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #FBF1E3; font-weight: 700; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .kpi { border: 1px solid #e3d6c4; border-radius: 8px; padding: 8px; }
  .kpi b { display: block; font-size: 18px; color: #D97F2E; }
  .num, .n { text-align: right; width: 34px; }
  .nowrap { white-space: nowrap; }
  .mat { color: #5B8A4A; font-weight: 600; }
  .meta td:first-child { width: 38%; color: #6B5440; }
  .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 28px; }
  .sign div { border-top: 1px solid #999; padding-top: 4px; text-align: center; color: #555; }
  footer { margin-top: 16px; font-size: 9px; color: #7a6a5a; text-align: center; }
  tr { page-break-inside: avoid; }
</style></head><body>
<header>
  <div class="logo"><img src="${logo}" alt="COSITI"></div>
  <div>
    <h1>Rapport d'audit d'un acteur de la plateforme</h1>
    <p>${esc(r.organisation.nom || 'COSITI')}</p>
    <p>${esc([r.organisation.adresse, r.organisation.telephone, r.organisation.email].filter(Boolean).join(' — '))}</p>
  </div>
</header>

<div class="grid">
  <div>
    <h2>Acteur audité</h2>
    <table class="meta">
      <tr><td>Nom</td><td><b>${esc(u.nom)}</b></td></tr>
      <tr><td>Rôle</td><td>${esc(u.role)}</td></tr>
      <tr><td>Type d'accès</td><td>${esc(u.typeAcces)}</td></tr>
      <tr><td>Poste</td><td>${esc(u.poste || u.titreComplet || '—')}</td></tr>
      <tr><td>E-mail de connexion</td><td>${esc(u.email)}</td></tr>
      <tr><td>Statut du compte</td><td>${u.actif ? 'Actif' : 'Désactivé'}</td></tr>
      <tr><td>Dernier accès</td><td>${esc(u.dernierAcces && /^\d{4}-/.test(u.dernierAcces) ? fmtDateHeure(u.dernierAcces) : u.dernierAcces || '—')}</td></tr>
    </table>
  </div>
  <div>
    <h2>Rapport</h2>
    <table class="meta">
      <tr><td>Période analysée</td><td>${esc(periode)}</td></tr>
      <tr><td>Généré le</td><td>${esc(fmtDateHeure(r.genereLe))}</td></tr>
      <tr><td>Généré par</td><td>${esc(r.generePar.nom)} (${esc(r.generePar.role)})</td></tr>
      <tr><td>Première action</td><td>${esc(fmtDateHeure(s.premiereAction))}</td></tr>
      <tr><td>Dernière action</td><td>${esc(fmtDateHeure(s.derniereAction))}</td></tr>
      <tr><td>Source</td><td>Journal d'audit (base MySQL)</td></tr>
    </table>
  </div>
</div>

<h2>Synthèse</h2>
<div class="kpis">
  <div class="kpi"><b>${s.total}</b>actions enregistrées</div>
  <div class="kpi"><b>${s.connexions}</b>connexions</div>
  <div class="kpi"><b>${s.echecsConnexion}</b>échecs de connexion</div>
  <div class="kpi"><b>${Object.keys(s.parTypeOperation).length}</b>types d'opérations</div>
</div>

<div class="grid">
  <div><h2>Répartition par type d'opération</h2><table><tr><th>Opération</th><th class="num">Nb</th></tr>${parType || '<tr><td colspan="2">Aucune action</td></tr>'}</table></div>
  <div><h2>Droits du profil</h2><table><tr><th>Module</th><th>Niveau</th></tr>${modules}</table></div>
</div>

<h2>Détail des actions (${r.actions.length}${r.actionsTronquees ? ` sur ${s.total} — les plus récentes` : ''})</h2>
<table><thead><tr><th class="n">#</th><th>Date / heure</th><th>Opération</th><th>Module</th><th>Description</th></tr></thead><tbody>
${rows || '<tr><td colspan="5">Aucune action sur la période.</td></tr>'}
</tbody></table>

<div class="sign"><div>Visa du Super Administrateur</div><div>Visa du Conseil de Surveillance</div></div>
<footer>Document généré par la plateforme COSITI — l'édition de ce rapport est elle-même tracée dans le journal d'audit.</footer>
</body></html>`;
}

/** Imprime le rapport via un cadre caché (pas de fenêtre surgissante bloquée par le navigateur) */
export function imprimerRapportAudit(r: RapportAudit) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  const doc = frame.contentWindow!.document;
  doc.open();
  doc.write(rapportAuditHtml(r));
  doc.close();
  const go = () => {
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
    setTimeout(() => frame.remove(), 1500);
  };
  const img = doc.querySelector('img');
  if (img && !img.complete) img.addEventListener('load', go, { once: true });
  else setTimeout(go, 150);
}
