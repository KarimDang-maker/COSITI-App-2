import 'express-async-errors'; // les rejets des handlers async arrivent au gestionnaire d'erreurs (Express 4)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from './config.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import utilisateursRoutes from './routes/utilisateurs.routes.js';
import adherentsRoutes from './routes/adherents.routes.js';
import cotisationsRoutes from './routes/cotisations.routes.js';
import dossiersRoutes, { alertesRouter } from './routes/dossiers.routes.js';
import paieRoutes from './routes/paie.routes.js';
import rapportsRoutes from './routes/rapports.routes.js';
import rolesRoutes from './routes/roles.routes.js';
import financesRoutes from './routes/finances.routes.js';
import excelRoutes from './routes/excel.routes.js';
import { parametres, journal, systeme } from './routes/systeme.routes.js';
import * as e from './routes/entities.js';
import { mount, mounts } from './docs/registry.js';
import { buildOpenApi } from './docs/openapi.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Pas d'en-tête Origin (curl, appels serveur à serveur) : autorisé ; sinon liste blanche stricte
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Confirmation-Code', 'X-Maintenance-Code'],
      exposedHeaders: ['X-Filename', 'Content-Disposition'], // nom du fichier téléchargé (export Excel)
      maxAge: 600,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  // Limite globale par IP (anti-abus), plus large que celle de /auth
  app.use(
    '/api',
    rateLimit({ windowMs: 60_000, limit: config.apiRateLimit, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, error: 'Trop de requêtes.' } })
  );

  const api = express.Router();
  mount(api, '/systeme', systeme);
  mount(api, '/auth', authRoutes);
  mount(api, '/roles', rolesRoutes);
  mount(api, '/utilisateurs', utilisateursRoutes);
  mount(api, '/parametres', parametres);
  mount(api, '/adherents', adherentsRoutes);
  mount(api, '/cotisations', cotisationsRoutes);
  mount(api, '/dossiers', dossiersRoutes);
  mount(api, '/alertes', alertesRouter);
  mount(api, '/gestionnaires', e.gestionnaires);
  mount(api, '/depenses', e.depenses);
  mount(api, '/versements', e.versementsExtra, e.versements);
  mount(api, '/frais-mobile-money', e.fraisMobileMoney);
  mount(api, '/finances', financesRoutes);
  mount(api, '/excel', excelRoutes);
  mount(api, '/banques', e.banques);
  mount(api, '/employes', e.employes);
  mount(api, '/paie', paieRoutes);
  mount(api, '/partenaires', e.partenaires);
  mount(api, '/rendez-vous', e.rendezVous);
  mount(api, '/notes-direction', e.notesDirection);
  mount(api, '/rapports-reunions', e.rapportsReunions);
  mount(api, '/rapports-agents', e.rapportsAgents);
  mount(api, '/journal', journal);
  mount(api, '', rapportsRoutes); // /dashboard, /rapports/*

  // Documentation Swagger / OpenAPI générée à partir des routes réelles
  const spec = buildOpenApi({ mounts });
  app.get('/api/docs.json', (_req, res) => res.json(spec));
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'COSITI — API',
      swaggerOptions: { persistAuthorization: true, docExpansion: 'none', tagsSorter: 'alpha', filter: true },
    })
  );

  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
