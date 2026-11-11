import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

export const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

const ALLOWED = /\.(png|jpe?g|webp|gif|pdf|svg|xlsx?|csv|docx?)$/i;

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const tenant = (req.school?.slug || req.tenant?.slug || 'platform').replace(/[^a-z0-9-]/gi, '');
    const dir = path.join(UPLOAD_ROOT, tenant, new Date().toISOString().slice(0, 7));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9]+/gi, '-')
      .slice(0, 40)
      .toLowerCase();
    cb(null, `${base}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED.test(file.originalname)) return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Unsupported file type'));
    cb(null, true);
  },
});

/** Convert a saved multer file into its public URL. */
export const fileUrl = (file) =>
  '/uploads/' + path.relative(UPLOAD_ROOT, file.path).split(path.sep).join('/');
