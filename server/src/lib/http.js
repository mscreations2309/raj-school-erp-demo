export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const forbidden = (msg = 'You do not have permission to do this') => new HttpError(403, msg);

/** Wrap async route handlers so thrown errors reach the error middleware. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, req, res, _next) {
  // Prisma known errors → friendly messages
  if (err?.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target;
    return res.status(409).json({ error: `A record with the same ${target || 'value'} already exists` });
  }
  if (err?.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
  if (err?.code === 'P2003') return res.status(400).json({ error: 'This record is linked to other data and cannot be changed/deleted' });
  if (err?.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation failed', details: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`) });
  }
  if (err?.name === 'MulterError') return res.status(400).json({ error: err.message });

  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message, details: err.details });
}

/** Parse pagination params. */
export function paging(q) {
  const page = Math.max(1, parseInt(q.page) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(q.pageSize) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export const startOfDay = (d) => {
  const x = new Date(d);
  return new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()));
};

/** Parse "YYYY-MM-DD" into a UTC midnight Date (stable day key across timezones). */
export const dayKey = (s) => {
  if (s instanceof Date) return startOfDay(s);
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) throw badRequest('Invalid date, expected YYYY-MM-DD');
  return new Date(Date.UTC(y, m - 1, d));
};

export const parseJSON = (s, fallback) => {
  try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
};
