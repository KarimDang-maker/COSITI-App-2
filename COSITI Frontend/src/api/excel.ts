/**
 * Échange de données Excel : le serveur produit ET relit le même format (Backend/src/services/excel.js).
 * Le navigateur ne fait que transférer le fichier.
 */
import { ApiError, downloadFile, errorMessage, request } from './client';
import type { CatalogueFeuille, RapportImport } from './models';

export interface ExportOptions {
  entites?: string[];
  /** limite l'export à une sélection (ex. la liste filtrée affichée à l'écran) : { adherents: [id, ...] } */
  ids?: Record<string, string[]>;
  du?: string;
  au?: string;
}

export const excel = {
  catalogue: async (): Promise<CatalogueFeuille[]> => (await request('GET', '/excel/catalogue')).data,

  /** Télécharge le classeur d'échange (réimportable tel quel) */
  exporter: (opts: ExportOptions = {}) => downloadFile('POST', '/excel/export', { body: opts, filename: 'COSITI_Echange.xlsx' }),

  /** Télécharge le modèle vierge (en-têtes + instructions) */
  modele: (entites?: string[]) => downloadFile('GET', '/excel/modele', { query: { entites: entites?.join(',') }, filename: 'COSITI_Modele_Import.xlsx' }),

  /**
   * Importe un fichier .xlsx. `simulation` : tout est exécuté puis annulé (rapport exact, aucune écriture) ;
   * `import` : écriture réelle (code de confirmation demandé), tout ou rien sauf `ignorerErreurs`.
   * Un import refusé (422) renvoie quand même le rapport d'erreurs.
   */
  async importer(file: File, opts: { mode: 'simulation' | 'import'; ignorerErreurs?: boolean }): Promise<RapportImport> {
    try {
      const r = await request('POST', '/excel/import', {
        binary: await file.arrayBuffer(),
        query: { mode: opts.mode, ignorerErreurs: opts.ignorerErreurs ? 'true' : 'false' },
      });
      return r.data as RapportImport;
    } catch (e) {
      if (e instanceof ApiError && e.data?.feuilles) return e.data as RapportImport;
      throw e;
    }
  },
};

/** Export d'une liste de l'écran au format d'échange, avec message en cas d'erreur */
export async function exporterListe(entite: string, ids?: string[]) {
  try {
    await excel.exporter({ entites: [entite], ids: ids ? { [entite]: ids } : undefined });
  } catch (e) {
    window.alert(`Export impossible : ${errorMessage(e)}`);
  }
}
