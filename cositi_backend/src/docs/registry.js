/**
 * Registre des routeurs montés : le générateur Swagger s'en sert pour lister TOUTES les routes réelles
 * (la documentation ne peut donc pas diverger du code).
 */
export const mounts = [];

export function mount(parent, prefix, ...routers) {
  for (const router of routers) {
    parent.use(prefix || '/', router);
    mounts.push({ prefix, router });
  }
}
