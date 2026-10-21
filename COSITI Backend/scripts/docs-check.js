// npm run docs:check : valide la spécification OpenAPI générée (structure, $ref, schémas) et signale les lacunes
import SwaggerParser from '@apidevtools/swagger-parser';
import { createApp } from '../src/app.js';
import { mounts } from '../src/docs/registry.js';
import { buildOpenApi } from '../src/docs/openapi.js';

createApp(); // monte les routeurs (aucune connexion base nécessaire)
const spec = buildOpenApi({ mounts });

await SwaggerParser.validate(structuredClone(spec));

const ops = Object.entries(spec.paths).flatMap(([p, o]) => Object.entries(o).map(([m, op]) => ({ key: `${m.toUpperCase()} ${p}`, op })));
const sansResume = ops.filter(({ key, op }) => op.summary === key);
const sansBody = ops.filter(({ key, op }) => /^(POST|PUT|PATCH)/.test(key) && !op.requestBody && !/valider$|reset$|reset-demo|mise-a-jour|excel\/import|valider-direction|logout/.test(key));

console.log(`OpenAPI valide : ${ops.length} opérations, ${Object.keys(spec.paths).length} chemins, ${spec.tags.length} tags.`);
if (sansResume.length) console.warn(`Sans résumé (${sansResume.length}) :\n  ${sansResume.map((o) => o.key).join('\n  ')}`);
if (sansBody.length) console.warn(`POST/PUT sans corps documenté (${sansBody.length}) :\n  ${sansBody.map((o) => o.key).join('\n  ')}`);
process.exit(sansResume.length ? 1 : 0);
