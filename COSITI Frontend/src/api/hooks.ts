import { useEffect, useState } from 'react';
import { request, errorMessage } from './client';
import { useApp } from '../context/AppContext';

/**
 * Lecture d'un modèle calculé par le serveur (GET). La requête est rejouée quand les paramètres changent et après
 * chaque modification de données (`lastSync` du contexte) : l'écran reflète toujours l'état réel de la base.
 * Les valeurs précédentes restent affichées pendant le rechargement (pas de clignotement).
 */
export function useApiQuery<T>(path: string | null, query?: Record<string, string | number | boolean | undefined | null>) {
  const { lastSync } = useApp();
  const key = JSON.stringify([path, query]);
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({ data: null, loading: !!path, error: null });

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let annule = false;
    setState((s) => ({ ...s, loading: true }));
    request('GET', path, { query })
      .then((r) => !annule && setState({ data: r.data as T, loading: false, error: null }))
      .catch((e) => !annule && setState((s) => ({ ...s, loading: false, error: errorMessage(e) })));
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lastSync]);

  return state;
}
