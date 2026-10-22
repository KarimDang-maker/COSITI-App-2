import { readFileSync } from 'node:fs';

/** Catalogue CNPS (branches, offres, pièces par défaut) — extrait de src/data/cnpsBranches.ts du front. */
export const BRANCHES_CNPS = JSON.parse(readFileSync(new URL('./cnps-branches.json', import.meta.url), 'utf8'));

export const getAllOffres = () => BRANCHES_CNPS.flatMap((b) => b.offres);

/** Pièces par défaut d'une offre (par id ou par nom) ; repli sur les allocations familiales. */
export function getPiecesForOffre(offreIdOrNom) {
  const match = getAllOffres().find((o) => o.id === offreIdOrNom || o.nom === offreIdOrNom);
  return (match || BRANCHES_CNPS[0].offres[0]).piecesDefaut;
}

export const OFFRE_ALLOCATIONS = 'Allocations Familiales (Enfants scolarisés & à charge)';

/** Pièces génériques du dossier d'allocations (DEFAULT_PIECES_DOSSIER du front) */
export const DEFAULT_PIECES_DOSSIER = [
  { id: 'p1', nom: "Extrait d'acte de naissance de l'adhérent", obligatoire: true },
  { id: 'p2', nom: "Photocopie de la Carte Nationale d'Identité (CNI)", obligatoire: true },
  { id: 'p3', nom: "Attestation ou Certificat d'immatriculation CNPS", obligatoire: true },
  { id: 'p4', nom: 'Certificat de mariage légal (si applicable)', obligatoire: false },
  { id: 'p5', nom: "Extraits d'acte de naissance des enfants à charge", obligatoire: true },
  { id: 'p6', nom: 'Certificats de scolarité des enfants (spécifique COSITI)', obligatoire: true },
  { id: 'p7', nom: "Certificat de vie et d'entretien collectif des enfants", obligatoire: true },
  { id: 'p8', nom: "2 photos d'identité récentes", obligatoire: true },
];
