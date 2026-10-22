import { z } from 'zod';
import { config } from '../config.js';
import { innerSchemas } from '../middleware/validate.js';
import { ROLES, getUserPermissions } from '../utils/permissions.js';
import { SUMMARIES, TAGS } from './summaries.js';

const JSON_OPTS = {
  target: 'openapi-3.0',
  io: 'input',
  unrepresentable: 'any',
  override: (ctx) => {
    // opt() : "" / null ignorés -> on documente le schéma interne
    const inner = innerSchemas.get(ctx.zodSchema);
    if (inner) {
      const j = z.toJSONSchema(inner, JSON_OPTS);
      delete j.$schema;
      for (const k of Object.keys(ctx.jsonSchema)) delete ctx.jsonSchema[k];
      Object.assign(ctx.jsonSchema, j);
    }
  },
};

function toJson(schema) {
  const j = z.toJSONSchema(schema, JSON_OPTS);
  delete j.$schema;
  // les champs opt() sont facultatifs même si le schéma de pré-traitement les déclare requis
  if (j.type === 'object' && j.required && schema.shape) {
    j.required = j.required.filter((k) => !innerSchemas.has(schema.shape[k]));
    if (!j.required.length) delete j.required;
  }
  return j;
}

/** Rôles autorisés par défaut à partir des drapeaux de droits (profil par défaut de chaque rôle). */
const rolesFor = (flags, roleList) => {
  let roles = ROLES.filter((r) => flags.every((f) => getUserPermissions({ role: r })[f]));
  if (roleList) roles = roles.filter((r) => roleList.includes(r));
  return roles;
};

function walk(router) {
  const found = [];
  const pre = []; // middlewares posés par router.use() avant la route (ordre d'exécution)
  for (const layer of router.stack) {
    if (layer.route) {
      const handlers = layer.route.stack.map((l) => l.handle);
      for (const method of Object.keys(layer.route.methods)) {
        found.push({ method, path: layer.route.path, chain: [...pre, ...handlers] });
      }
    } else if (layer.handle?.meta) {
      pre.push(layer.handle);
    }
  }
  return found;
}

export function buildOpenApi({ mounts }) {
  const paths = {};
  const tagSet = new Set();

  for (const { prefix, router } of mounts) {
    for (const r of walk(router)) {
      const full = `/api${prefix}${r.path === '/' ? '' : r.path}` || '/api';
      const oaPath = full.replace(/:([A-Za-z_]+)/g, '{$1}') || '/api';
      const metas = r.chain.map((h) => h.meta).filter(Boolean);
      const key = `${r.method.toUpperCase()} ${oaPath}`;
      const info = SUMMARIES[key] || {};

      const isAuth = metas.some((m) => m.auth);
      const flags = metas.flatMap((m) => m.flags || []);
      const roleLimit = metas.find((m) => m.roles)?.roles;
      const confirm = metas.some((m) => m.confirm);
      const maintenance = metas.some((m) => m.maintenance);
      const schemas = Object.assign({}, ...metas.filter((m) => m.schemas).map((m) => m.schemas));

      const segment = (oaPath.split('/')[2] || 'dashboard').replace(/\{.*\}/, '');
      const tag = TAGS[segment] || segment;
      tagSet.add(tag);

      const roles = isAuth ? rolesFor(flags, roleLimit) : [];
      const access = !isAuth
        ? '**Accès :** public (aucun jeton requis).'
        : flags.length || roleLimit
        ? `**Rôles autorisés :** ${roles.join(', ') || '—'}${flags.length ? `\n\n**Droits requis :** ${flags.join(' + ')}` : ''}`
        : '**Rôles autorisés :** tout utilisateur authentifié.';
      const notes = [];
      if (confirm) notes.push('🔒 Exige le **code de confirmation** (en-tête `X-Confirmation-Code` ou champ `pinCode`).');
      if (maintenance) notes.push('🔑 Exige le **code de maintenance** (en-tête `X-Maintenance-Code`).');
      if (info.note) notes.push(info.note);

      const parameters = [];
      for (const name of [...oaPath.matchAll(/\{([^}]+)\}/g)].map((m) => m[1])) {
        const ps = schemas.params?.shape?.[name];
        parameters.push({ name, in: 'path', required: true, schema: ps ? toJson(ps) : { type: 'string' } });
      }
      if (schemas.query) {
        const q = toJson(schemas.query);
        for (const [name, s] of Object.entries(q.properties || {})) {
          parameters.push({ name, in: 'query', required: (q.required || []).includes(name), schema: s });
        }
      }
      if (confirm) parameters.push({ name: 'X-Confirmation-Code', in: 'header', required: true, schema: { type: 'string', example: '0000' }, description: 'Code de confirmation (0000 par défaut).' });
      if (maintenance) parameters.push({ name: 'X-Maintenance-Code', in: 'header', required: true, schema: { type: 'string', example: '1111' }, description: 'Code de maintenance (MAINTENANCE_CODE).' });

      const op = {
        tags: [tag],
        summary: info.summary || `${r.method.toUpperCase()} ${oaPath}`,
        description: [info.description, access, ...notes].filter(Boolean).join('\n\n'),
        operationId: `${r.method}_${oaPath.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
        ...(parameters.length ? { parameters } : {}),
        ...(isAuth ? { security: [{ bearerAuth: [] }] } : {}),
        'x-roles': roles,
        responses: {
          200: { description: 'Succès', content: { 'application/json': { schema: { $ref: '#/components/schemas/Succes' } } } },
          ...(r.method === 'post' ? { 201: { description: 'Créé', content: { 'application/json': { schema: { $ref: '#/components/schemas/Succes' } } } } } : {}),
          ...(schemas.body || schemas.query || schemas.params ? { 400: { $ref: '#/components/responses/Invalide' } } : {}),
          ...(isAuth ? { 401: { $ref: '#/components/responses/NonAuthentifie' }, 403: { $ref: '#/components/responses/Interdit' } } : {}),
          404: { $ref: '#/components/responses/Introuvable' },
        },
      };
      if (schemas.body) {
        const body = toJson(schemas.body);
        const example = info.example;
        op.requestBody = { required: true, content: { 'application/json': { schema: body, ...(example ? { example } : {}) } } };
      }
      if (!isAuth) delete op.responses[404];

      paths[oaPath] = { ...(paths[oaPath] || {}), [r.method]: op };
    }
  }

  const err = (description) => ({ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/Erreur' } } } });
  return {
    openapi: '3.0.3',
    info: {
      title: 'COSITI — API de gestion de la coopérative',
      version: '1.0.0',
      description: [
        'API REST de la plateforme COSITI : adhérents, cotisations, dossiers CNPS, finances DAF, paie, direction, rapports et audit.',
        '',
        '### Se connecter dans Swagger',
        '1. Ouvrez **POST /api/auth/login**, cliquez sur *Try it out* puis *Execute* avec un compte (ex. `dg@cositi-ci.org` / `Cositi@2026!`).',
        '2. Copiez la valeur de `data.accessToken`, cliquez sur le bouton **Authorize** en haut de page et collez-la (sans le mot « Bearer »).',
        '3. Le jeton dure 15 minutes ; renouvelez-le avec **POST /api/auth/refresh**.',
        '',
        '### Réponses',
        'Succès : `{ "success": true, "data": …, "meta"?: … }` — Erreur : `{ "success": false, "error": "…", "details"?: […], "code"?: "…" }`.',
        '',
        '### Droits d\'accès',
        'Chaque opération indique les **rôles autorisés** (déduits des droits réellement appliqués par le serveur). La synthèse par rôle est disponible via **GET /api/roles** et dans `docs/ROLES.md`.',
        '',
        '### Codes de sécurité',
        'Les opérations sensibles exigent le **code de confirmation** (`X-Confirmation-Code`, `0000` par défaut). La mise à jour logicielle exige le **code de maintenance** (`X-Maintenance-Code`).',
      ].join('\n'),
    },
    servers: [{ url: `http://localhost:${config.port}`, description: 'Serveur local' }],
    tags: [...tagSet].sort().map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: "Jeton d'accès renvoyé par POST /api/auth/login" } },
      schemas: {
        Succes: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { description: 'Résultat (objet, liste ou message)' },
            meta: { type: 'object', description: 'Pagination (total, page, pageSize, pages) et totaux éventuels' },
          },
        },
        Erreur: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Message lisible' },
            code: { type: 'string', example: 'PASSWORD_CHANGE_REQUIRED' },
            details: { type: 'array', items: { type: 'object', properties: { champ: { type: 'string' }, message: { type: 'string' } } } },
          },
        },
      },
      responses: {
        Invalide: err('Données invalides (détail par champ dans `details`)'),
        NonAuthentifie: err('Jeton absent, invalide ou expiré'),
        Interdit: err('Droit insuffisant pour ce profil, ou code de confirmation incorrect'),
        Introuvable: err('Ressource introuvable'),
      },
    },
  };
}
