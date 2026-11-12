import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'node:path';
import fs from 'node:fs';
import { authenticate, requireTenant } from './lib/auth.js';
import { errorHandler } from './lib/http.js';
import { UPLOAD_ROOT } from './lib/upload.js';
import { prisma } from './lib/prisma.js';

import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import platformRoutes from './routes/platform.js';
import resourceRoutes from './routes/resources.js';
import studentRoutes from './routes/students.js';
import attendanceRoutes from './routes/attendance.js';
import hrRoutes from './routes/hr.js';
import examRoutes from './routes/exams.js';
import feeRoutes from './routes/fees.js';
import opsRoutes from './routes/ops.js';
import portalRoutes from './routes/portal.js';
import { recycleRouter } from './routes/recycle.js';
import { teacherRoutes as homeworkTeacher, familyRoutes as homeworkFamily } from './routes/homework.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.use(cors({ origin: (process.env.CORS_ORIGIN || '*').split(','), credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.use('/uploads', express.static(UPLOAD_ROOT, { maxAge: '7d' }));

  app.get('/api/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: 'RnY EduSuite API', time: new Date().toISOString() });
  });

  // Uploaded files stored in the database (FILE_STORAGE=db)
  app.get('/api/files/:id', async (req, res, next) => {
    try {
      const f = await prisma.storedFile.findUnique({ where: { id: req.params.id.replace(/\.[a-z0-9]+$/i, '') } });
      if (!f) return res.status(404).json({ error: 'File not found' });
      res.setHeader('Content-Type', f.mime);
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(f.name)}"`);
      res.send(Buffer.from(f.data));
    } catch (e) { next(e); }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/platform/recycle-bin', authenticate, recycleRouter());
  app.use('/api/platform', authenticate, platformRoutes);

  // Everything below is tenant-scoped and requires login
  const tenant = express.Router();
  tenant.use(authenticate, requireTenant);
  tenant.use('/students', studentRoutes);
  tenant.use('/attendance', attendanceRoutes);
  tenant.use('/assessment', examRoutes);
  tenant.use('/fees', feeRoutes);
  tenant.use('/portal', homeworkFamily);
  tenant.use('/portal', portalRoutes);
  tenant.use('/recycle-bin', recycleRouter());
  tenant.use('/', homeworkTeacher);
  tenant.use('/', hrRoutes);
  tenant.use('/', opsRoutes);
  tenant.use('/', resourceRoutes);
  app.use('/api', tenant);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));

  // Production: serve the built React app (web/dist) from the same server
  const dist = path.resolve(process.cwd(), '../web/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { maxAge: '1h', index: false }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  } else {
    // Dev mode: the website runs on the Vite dev server
    const web = (process.env.CORS_ORIGIN || 'http://localhost:5174').split(',')[0];
    app.get('*', (req, res) => res.redirect(web + req.originalUrl));
  }

  app.use(errorHandler);
  return app;
}
