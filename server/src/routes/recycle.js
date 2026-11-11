// Recycle Bin API (school users + RnY super admin). No endpoint here erases anything.
import { Router } from 'express';
import { prisma, contains } from '../lib/prisma.js';
import { ah, paging, parseJSON } from '../lib/http.js';
import { authorize, STAFF_ROLES } from '../lib/auth.js';
import { visibleWhere, isHolder, restoreEntry, escalate, entryDetail, rankOf } from '../lib/recycle.js';
import { audit } from '../lib/audit.js';

export function recycleRouter() {
  const r = Router();
  r.use(authorize(STAFF_ROLES));

  r.get('/', ah(async (req, res) => {
    const where = { ...visibleWhere(req) };
    const view = req.query.view || 'mine';
    if (view === 'mine') {
      where.status = 'IN_BIN';
      where.AND = [{ OR: [{ holderUserId: req.user.id }, { holderUserId: null, holderRole: req.user.role }] }];
    } else if (view === 'deletedByMe') where.deletedById = req.user.id;
    else if (view === 'archived') where.status = 'ARCHIVED';
    else if (view === 'restored') where.status = 'RESTORED';
    else if (view === 'team') { where.status = { in: ['IN_BIN', 'ARCHIVED'] }; where.deletedByRank = { lt: rankOf(req.user.role) === 3 ? 4 : rankOf(req.user.role) }; }
    if (req.query.q) where.AND = [...(where.AND || []), { OR: [{ label: contains(req.query.q) }, { deletedByName: contains(req.query.q) }, { reason: contains(req.query.q) }] }];
    if (req.query.type) where.entityType = req.query.type;
    const { skip, take, page, pageSize } = paging(req.query);
    const select = { id: true, schoolId: true, entityType: true, label: true, summary: true, reason: true, deletedById: true, deletedByName: true, deletedByRole: true, deletedBy: true, holderRole: true, holderUserId: true, status: true, deletedAt: true, updatedAt: true };
    const [items, total, counts] = await Promise.all([
      prisma.recycleBinEntry.findMany({ where, select, orderBy: { deletedAt: 'desc' }, skip, take }),
      prisma.recycleBinEntry.count({ where }),
      prisma.recycleBinEntry.count({ where: { AND: [visibleWhere(req), { status: 'IN_BIN' }, { OR: [{ holderUserId: req.user.id }, { holderUserId: null, holderRole: req.user.role }] }] } }),
    ]);
    const schools = req.user.role === 'SUPER_ADMIN' && !req.schoolId
      ? Object.fromEntries((await prisma.school.findMany({ where: { id: { in: [...new Set(items.map((i) => i.schoolId).filter(Boolean))] } }, select: { id: true, name: true } })).map((s) => [s.id, s.name]))
      : {};
    res.json({
      items: items.map((e) => ({ ...e, summary: parseJSON(e.summary, {}), deletedBy: parseJSON(e.deletedBy, {}), schoolName: schools[e.schoolId], inMyBin: isHolder(req, e) })),
      total, page, pageSize, inMyBin: counts,
    });
  }));

  r.get('/:id', ah(async (req, res) => res.json(await entryDetail(req, req.params.id))));

  r.post('/:id/restore', ah(async (req, res) => {
    const out = await restoreEntry(req, req.params.id);
    audit(req, 'RESTORE', 'RecycleBinEntry', req.params.id);
    res.json(out);
  }));

  // "Delete from bin" — never erases: moves to the next manager's bin, or archives at the top
  r.post('/:id/escalate', ah(async (req, res) => {
    const e = await escalate(req, req.params.id, req.body?.reason);
    audit(req, 'RECYCLE_ESCALATE', 'RecycleBinEntry', e.id, { to: e.holderRole, status: e.status });
    res.json(e);
  }));

  return r;
}
