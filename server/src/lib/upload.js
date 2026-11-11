import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { prisma } from './prisma.js';

export const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

const ALLOWED = /\.(png|jpe?g|webp|gif|pdf|svg|xlsx?|csv|docx?)$/i;
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };

// Files are kept in memory, then saved either to the database (FILE_STORAGE=db) or to local disk.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED.test(file.originalname)) return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Unsupported file type'));
    cb(null, true);
  },
});

/** Persist an uploaded file and return its public URL. */
export async function saveUpload(req, file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (process.env.FILE_STORAGE === 'db') {
    const f = await prisma.storedFile.create({
      data: { schoolId: req.school?.id || req.tenant?.id || null, name: file.originalname, mime: file.mimetype || MIME[ext] || 'application/octet-stream', size: file.size, data: file.buffer },
    });
    return `/api/files/${f.id}${ext}`;
  }
  const tenant = (req.school?.slug || req.tenant?.slug || 'platform').replace(/[^a-z0-9-]/gi, '');
  const dir = path.join(UPLOAD_ROOT, tenant, new Date().toISOString().slice(0, 7));
  fs.mkdirSync(dir, { recursive: true });
  const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]+/gi, '-').slice(0, 40).toLowerCase();
  const name = `${base}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(dir, name), file.buffer);
  return '/uploads/' + path.relative(UPLOAD_ROOT, path.join(dir, name)).split(path.sep).join('/');
}
