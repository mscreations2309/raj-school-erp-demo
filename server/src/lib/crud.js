import { Router } from 'express';
import { prisma, Prisma, contains } from './prisma.js';
import { ah, badRequest, notFound, paging } from './http.js';
import { authorize, requireModule, ADMINS, STAFF_ROLES } from './auth.js';
import { audit } from './audit.js';
import { moveToBin } from './recycle.js';

const MODELS = Object.fromEntries(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
const delegate = (model) => prisma[model[0].toLowerCase() + model.slice(1)];
const hasSchoolId = (model) => MODELS[model].fields.some((f) => f.name === 'schoolId');

/**
 * Prisma `where` fragment that restricts a model to one tenant.
 * Models without `schoolId` (e.g. HostelRoom, RouteStop) are scoped through their parent relation.
 */
export function tenantWhere(model, schoolId, depth = 0) {
  if (hasSchoolId(model)) return { schoolId };
  if (depth > 2) throw new Error(`Cannot tenant-scope model ${model}`);
  const parent = MODELS[model].fields.find(
    (f) => f.kind === 'object' && f.relationFromFields?.length && f.isRequired,
  );
  if (!parent) throw new Error(`Cannot tenant-scope model ${model}`);
  return { [parent.name]: tenantWhere(parent.type, schoolId, depth + 1) };
}

/**
 * Whitelist + type-coerce incoming JSON against the Prisma model definition.
 * Unknown fields, ids, schoolId and timestamps are dropped.
 */
export function sanitize(model, body = {}, { partial = false, allow, deny = [] } = {}) {
  const def = MODELS[model];
  const out = {};
  const missing = [];
  for (const f of def.fields) {
    if (f.kind !== 'scalar' || f.isId || f.name === 'schoolId' || f.isUpdatedAt || f.name === 'createdAt') continue;
    if (deny.includes(f.name) || (allow && !allow.includes(f.name))) continue;
    if (!(f.name in body)) {
      if (!partial && f.isRequired && !f.hasDefaultValue) missing.push(f.name);
      continue;
    }
    let v = body[f.name];
    if (v === '' || v === undefined) v = null;
    if (v === null) {
      if (f.isRequired && !f.hasDefaultValue) missing.push(f.name);
      else if (!f.isRequired) out[f.name] = null;
      continue;
    }
    switch (f.type) {
      case 'Int': {
        const n = parseInt(v, 10);
        if (Number.isNaN(n)) throw badRequest(`${f.name} must be a whole number`);
        out[f.name] = n;
        break;
      }
      case 'Float': {
        const n = parseFloat(v);
        if (Number.isNaN(n)) throw badRequest(`${f.name} must be a number`);
        out[f.name] = n;
        break;
      }
      case 'Boolean':
        out[f.name] = v === true || v === 'true' || v === 1 || v === '1' || v === 'on';
        break;
      case 'DateTime': {
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) throw badRequest(`${f.name} must be a valid date`);
        out[f.name] = d;
        break;
      }
      default:
        out[f.name] = typeof v === 'object' ? JSON.stringify(v) : String(v).trim();
    }
  }
  if (missing.length) throw badRequest(`Missing required field(s): ${missing.join(', ')}`);
  return out;
}

/** Ensure every foreign key in `data` points at a record of the same tenant. */
export async function assertSameTenant(model, data, schoolId) {
  const def = MODELS[model];
  for (const rel of def.fields) {
    if (rel.kind !== 'object' || !rel.relationFromFields?.length) continue;
    const fk = rel.relationFromFields[0];
    if (fk === 'schoolId' || data[fk] == null) continue;
    if (rel.type === 'User' || rel.type === 'Plan') {
      if (rel.type === 'User') {
        const u = await prisma.user.findFirst({ where: { id: data[fk], schoolId } });
        if (!u) throw badRequest(`Invalid ${fk}`);
      }
      continue;
    }
    const found = await delegate(rel.type).findFirst({
      where: { id: data[fk], ...tenantWhere(rel.type, schoolId) },
      select: { id: true },
    });
    if (!found) throw badRequest(`Invalid ${fk}: record not found in this school`);
  }
}

/**
 * Build a full tenant-scoped REST router for a model.
 * GET / (search, filters, paging, ?all=1)  GET /:id  POST /  PUT /:id  DELETE /:id
 */
export function crudRouter(model, opts = {}) {
  const {
    module,
    read = STAFF_ROLES, // who may list/view (secure default: staff only, never parents)
    write = ADMINS, // who may create/update/delete
    search = [],
    filters = [],
    include,
    listInclude,
    orderBy = { id: 'desc' },
    beforeSave,
    afterSave,
    beforeDelete,
    extraWhere,
    deny = [],
  } = opts;
  const r = Router();
  const db = delegate(model);
  if (module) r.use(requireModule(module));
  const readGuard = authorize(...read, ...write);
  const writeGuard = authorize(...write);

  r.get(
    '/',
    readGuard,
    ah(async (req, res) => {
      const where = { ...tenantWhere(model, req.schoolId) };
      if (req.query.q && search.length) {
        where.OR = search.map((f) => {
          if (f.includes('.')) {
            const [a, b] = f.split('.');
            return { [a]: { [b]: contains(req.query.q) } };
          }
          return { [f]: contains(req.query.q) };
        });
      }
      for (const f of filters) {
        const v = req.query[f];
        if (v === undefined || v === '') continue;
        const field = MODELS[model].fields.find((x) => x.name === f);
        where[f] = field?.type === 'Boolean' ? v === 'true' : field?.type === 'Int' ? parseInt(v) : v;
      }
      if (extraWhere) Object.assign(where, await extraWhere(req));
      let order = orderBy;
      if (req.query.sort) {
        const [field, dir] = String(req.query.sort).split(':');
        if (MODELS[model].fields.some((f) => f.name === field && f.kind === 'scalar')) {
          order = { [field]: dir === 'asc' ? 'asc' : 'desc' };
        }
      }
      const inc = listInclude ?? include;
      if (req.query.all === '1') {
        const items = await db.findMany({ where, include: inc, orderBy: order, take: 5000 });
        return res.json({ items, total: items.length });
      }
      const { page, pageSize, skip, take } = paging(req.query);
      const [items, total] = await Promise.all([
        db.findMany({ where, include: inc, orderBy: order, skip, take }),
        db.count({ where }),
      ]);
      res.json({ items, total, page, pageSize });
    }),
  );

  r.get(
    '/:id',
    readGuard,
    ah(async (req, res) => {
      const item = await db.findFirst({ where: { id: req.params.id, ...tenantWhere(model, req.schoolId) }, include });
      if (!item) throw notFound();
      res.json(item);
    }),
  );

  r.post(
    '/',
    writeGuard,
    ah(async (req, res) => {
      let data = sanitize(model, req.body, { deny });
      if (beforeSave) data = (await beforeSave(data, req, null)) || data;
      await assertSameTenant(model, data, req.schoolId);
      if (hasSchoolId(model)) data.schoolId = req.schoolId;
      const item = await db.create({ data, include });
      if (afterSave) await afterSave(item, req, 'create');
      audit(req, 'CREATE', model, item.id);
      res.status(201).json(item);
    }),
  );

  r.put(
    '/:id',
    writeGuard,
    ah(async (req, res) => {
      const existing = await db.findFirst({ where: { id: req.params.id, ...tenantWhere(model, req.schoolId) } });
      if (!existing) throw notFound();
      let data = sanitize(model, req.body, { partial: true, deny });
      if (beforeSave) data = (await beforeSave(data, req, existing)) || data;
      await assertSameTenant(model, data, req.schoolId);
      const item = await db.update({ where: { id: existing.id }, data, include });
      if (afterSave) await afterSave(item, req, 'update');
      audit(req, 'UPDATE', model, item.id, Object.keys(data));
      res.json(item);
    }),
  );

  r.delete(
    '/:id',
    writeGuard,
    ah(async (req, res) => {
      const existing = await db.findFirst({ where: { id: req.params.id, ...tenantWhere(model, req.schoolId) } });
      if (!existing) throw notFound();
      if (beforeDelete) await beforeDelete(existing, req);
      // Never hard delete: move to the Recycle Bin (restorable) with a mandatory reason
      const entry = await moveToBin(req, { roots: [{ model, ids: [existing.id] }], reason: req.body?.reason });
      audit(req, 'MOVE_TO_RECYCLE_BIN', model, existing.id, { entry: entry.id, reason: req.body?.reason });
      res.json({ ok: true, recycleBinEntryId: entry.id });
    }),
  );

  return r;
}
