// Recycle Bin engine — soft delete with full restore. Nothing is ever erased.
//
// moveToBin()  : snapshots the record(s) + every record linked to them (cascade children are copied,
//                "set null" links are remembered), then removes them from the live tables and stores the
//                snapshot as a RecycleBinEntry with who / when / why.
// restoreEntry(): re-creates every record with the same IDs and re-links "set null" references.
// escalate()   : "delete from bin" → moves the entry to the next manager's bin; at the top it is ARCHIVED
//                (still restorable). There is no code path that permanently erases an entry.
import { prisma, Prisma } from './prisma.js';
import { HttpError, badRequest, forbidden, notFound, parseJSON } from './http.js';

const MODELS = Object.fromEntries(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
const client = (tx, model) => tx[model[0].toLowerCase() + model.slice(1)];

// ── Role hierarchy (fixed by role)
export const RANK = { TEACHER: 0, ACCOUNTANT: 0, RECEPTIONIST: 0, LIBRARIAN: 0, PRINCIPAL: 1, SCHOOL_ADMIN: 2, SUPER_ADMIN: 3 };
const LADDER = ['PRINCIPAL', 'SCHOOL_ADMIN', 'SUPER_ADMIN'];
export const rankOf = (role) => (role in RANK ? RANK[role] : -1);

// ── Which models point at which (from the Prisma schema)
const DEPENDENTS = {};
for (const m of Object.values(MODELS)) {
  for (const f of m.fields) {
    if (f.kind !== 'object' || !f.relationFromFields?.length) continue;
    const onDelete = f.relationOnDelete || (f.isRequired ? 'Restrict' : 'SetNull');
    (DEPENDENTS[f.type] ||= []).push({ model: m.name, fk: f.relationFromFields[0], onDelete });
  }
}
const PARENTS = Object.fromEntries(
  Object.values(MODELS).map((m) => [m.name, m.fields.filter((f) => f.kind === 'object' && f.relationFromFields?.length).map((f) => f.type)]),
);

const chunk = (arr, n = 2000) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

/** Collect roots + cascade children (recursively) and SetNull links. */
async function snapshot(tx, roots) {
  const records = new Map(); // "Model:id" → { model, data }
  const relinks = [];
  const restrict = [];
  const queue = roots.map((r) => ({ model: r.model, ids: r.ids }));
  while (queue.length) {
    const { model, ids } = queue.shift();
    if (!ids.length) continue;
    const fresh = [];
    for (const part of chunk(ids)) {
      const rows = await client(tx, model).findMany({ where: { id: { in: part } } });
      for (const row of rows) {
        const key = `${model}:${row.id}`;
        if (records.has(key)) continue;
        records.set(key, { model, data: row });
        fresh.push(row.id);
      }
    }
    if (!fresh.length) continue;
    for (const dep of DEPENDENTS[model] || []) {
      if (dep.model === 'School') continue;
      for (const part of chunk(fresh)) {
        const kids = await client(tx, dep.model).findMany({ where: { [dep.fk]: { in: part } }, select: { id: true, [dep.fk]: true } });
        if (!kids.length) continue;
        if (dep.onDelete === 'Cascade') queue.push({ model: dep.model, ids: kids.map((k) => k.id) });
        else if (dep.onDelete === 'SetNull') kids.forEach((k) => relinks.push({ model: dep.model, id: k.id, field: dep.fk, value: k[dep.fk] }));
        else kids.forEach((k) => restrict.push({ model: dep.model, id: k.id }));
      }
    }
  }
  const blocking = restrict.filter((r) => !records.has(`${r.model}:${r.id}`));
  if (blocking.length) throw badRequest(`Cannot delete: ${blocking.length} linked ${blocking[0].model} record(s) depend on this. Remove or reassign them first.`);
  return { records: [...records.values()], relinks: relinks.filter((r) => !records.has(`${r.model}:${r.id}`)) };
}

/** Topological order so parents are created before children on restore. */
function creationOrder(models) {
  const set = new Set(models);
  const out = [];
  const visiting = new Set();
  const visit = (m) => {
    if (out.includes(m) || visiting.has(m)) return;
    visiting.add(m);
    for (const p of PARENTS[m] || []) if (set.has(p) && p !== m) visit(p);
    visiting.delete(m);
    out.push(m);
  };
  models.forEach(visit);
  return out;
}

async function deleterDetails(user, schoolId) {
  const staff = user?.id ? await prisma.staff.findFirst({ where: { userId: user.id } }) : null;
  return { id: user?.id, name: user?.name, role: user?.role, email: user?.email, phone: user?.phone, employeeId: staff?.employeeId, designation: staff?.designation, schoolId };
}

const LABEL_FIELDS = ['title', 'name', 'titleEn', 'label', 'invoiceNo', 'receiptNo', 'tcNo', 'regNo', 'number', 'studentName', 'purposeEn', 'labelEn', 'roomNo', 'code', 'key', 'category', 'month'];
export function labelFor(model, d) {
  if (model === 'Student') return `Student: ${d.firstName} ${d.lastName || ''} • ${d.admissionNo}`.trim();
  if (model === 'Staff') return `Staff: ${d.firstName} ${d.lastName || ''} • ${d.employeeId} • ${d.designation}`;
  if (model === 'User') return `Login: ${d.name} (${d.role}) • ${d.email}`;
  if (model === 'StudentDocument') return `Document: ${d.name}`;
  const f = LABEL_FIELDS.find((k) => d[k]);
  return `${model.replace(/([a-z])([A-Z])/g, '$1 $2')}: ${f ? d[f] : d.id}`;
}

/**
 * Move records to the Recycle Bin.
 * roots: [{ model, ids }]  — label: shown in the bin  — reason: mandatory
 */
export async function moveToBin(req, { roots, label, entityType, reason }) {
  if (!reason || String(reason).trim().length < 3) throw badRequest('Please enter a reason for deleting (at least 3 characters)');
  const role = req.user.role;
  if (rankOf(role) < 0) throw forbidden('You cannot delete records');
  const schoolId = req.schoolId || null;
  const details = await deleterDetails(req.user, schoolId);
  return prisma.$transaction(async (tx) => {
    const snap = await snapshot(tx, roots);
    // Lock logins of deleted people: staff login, student login, and parent login if no other child remains
    const deletedStudentIds = new Set(snap.records.filter((r) => r.model === 'Student').map((r) => r.data.id));
    const lock = new Set();
    for (const r of snap.records) {
      if (r.model === 'Staff' && r.data.userId) lock.add(r.data.userId);
      if (r.model === 'Student' && r.data.userId) lock.add(r.data.userId);
      if (r.model === 'Student' && r.data.parentUserId) {
        const others = await tx.student.count({ where: { parentUserId: r.data.parentUserId, id: { notIn: [...deletedStudentIds] } } });
        if (!others) lock.add(r.data.parentUserId);
      }
    }
    const deletedUserIds = new Set(snap.records.filter((r) => r.model === 'User').map((r) => r.data.id));
    const toLock = (await tx.user.findMany({ where: { id: { in: [...lock].filter((x) => !deletedUserIds.has(x)) }, isActive: true }, select: { id: true } })).map((u) => u.id);
    if (toLock.length) await tx.user.updateMany({ where: { id: { in: toLock } }, data: { isActive: false } });
    snap.lockedUsers = toLock;
    const counts = {};
    if (toLock.length) counts['Login locked'] = toLock.length;
    snap.records.forEach((r) => { counts[r.model] = (counts[r.model] || 0) + 1; });
    const rootModels = creationOrder(roots.map((r) => r.model)).reverse();
    for (const m of rootModels) {
      const ids = roots.filter((r) => r.model === m).flatMap((r) => r.ids);
      for (const part of chunk(ids)) await client(tx, m).deleteMany({ where: { id: { in: part } } });
    }
    const first = snap.records[0];
    return tx.recycleBinEntry.create({
      data: {
        schoolId,
        entityType: entityType || roots[0].model,
        entityId: roots.length === 1 && roots[0].ids.length === 1 ? roots[0].ids[0] : null,
        label: label || (first ? labelFor(first.model, first.data) : entityType),
        summary: JSON.stringify(counts),
        payload: JSON.stringify(snap),
        reason: String(reason).trim(),
        deletedById: req.user.id,
        deletedByName: req.user.name,
        deletedByRole: role,
        deletedByRank: rankOf(role),
        deletedBy: JSON.stringify(details),
        holderRole: role,
        holderUserId: req.user.id,
        history: JSON.stringify([{ action: 'DELETED', by: req.user.name, role, employeeId: details.employeeId, at: new Date(), note: String(reason).trim() }]),
      },
    });
  }, { timeout: 180000, maxWait: 20000 });
}

/** Records a non-snapshot soft delete (e.g. a school marked CANCELLED) so it can be restored from the bin. */
export async function recordStatusDelete(req, { schoolId, entityType, entityId, label, reason, restore }) {
  if (!reason || String(reason).trim().length < 3) throw badRequest('Please enter a reason for deleting (at least 3 characters)');
  const details = await deleterDetails(req.user, schoolId);
  return prisma.recycleBinEntry.create({
    data: {
      schoolId, entityType, entityId, label, summary: '{}', payload: JSON.stringify({ statusRestore: restore }), reason: String(reason).trim(),
      deletedById: req.user.id, deletedByName: req.user.name, deletedByRole: req.user.role, deletedByRank: rankOf(req.user.role),
      deletedBy: JSON.stringify(details), holderRole: req.user.role, holderUserId: req.user.id,
      history: JSON.stringify([{ action: 'DELETED', by: req.user.name, role: req.user.role, at: new Date(), note: String(reason).trim() }]),
    },
  });
}

const reviveDates = (model, data) => {
  const out = { ...data };
  for (const f of MODELS[model].fields) {
    if (f.kind === 'scalar' && f.type === 'DateTime' && out[f.name]) out[f.name] = new Date(out[f.name]);
  }
  return out;
};

// ── Visibility & permissions
/** Deleter + everyone above the deleter's rank (same school); Super Admin sees all. */
export function visibleWhere(req) {
  if (req.user.role === 'SUPER_ADMIN') return req.schoolId ? { schoolId: req.schoolId } : {};
  return { schoolId: req.schoolId, OR: [{ deletedById: req.user.id }, { deletedByRank: { lt: rankOf(req.user.role) } }] };
}
const canSee = (req, e) => req.user.role === 'SUPER_ADMIN' || (e.schoolId === req.schoolId && (e.deletedById === req.user.id || e.deletedByRank < rankOf(req.user.role)));
export const isHolder = (req, e) => e.status === 'IN_BIN' && (e.holderUserId ? e.holderUserId === req.user.id : e.holderRole === req.user.role) && (req.user.role === 'SUPER_ADMIN' || e.schoolId === req.schoolId);

async function getEntry(req, id) {
  const e = await prisma.recycleBinEntry.findUnique({ where: { id } });
  if (!e || !canSee(req, e)) throw notFound('Recycle bin entry not found');
  return e;
}

const pushHistory = (e, item) => JSON.stringify([...parseJSON(e.history, []), { ...item, at: new Date() }]);

export async function restoreEntry(req, id) {
  const e = await getEntry(req, id);
  if (e.status === 'RESTORED') throw badRequest('Already restored');
  const payload = parseJSON(e.payload, {});
  await prisma.$transaction(async (tx) => {
    if (payload.statusRestore) {
      const { model, id: rid, data } = payload.statusRestore;
      await client(tx, model).update({ where: { id: rid }, data });
    } else {
      const byModel = {};
      for (const r of payload.records || []) (byModel[r.model] ||= []).push(r.data);
      for (const m of creationOrder(Object.keys(byModel))) {
        for (const part of chunk(byModel[m], 1000)) {
          try {
            await client(tx, m).createMany({ data: part.map((d) => reviveDates(m, d)) });
          } catch (err) {
            if (err.code === 'P2002') throw new HttpError(409, `Cannot restore: a ${m} with the same ${[].concat(err.meta?.target || 'value').join(', ')} already exists. Rename or remove the newer record first.`);
            if (err.code === 'P2003') throw new HttpError(409, `Cannot restore: a ${m} refers to something that no longer exists (e.g. its class or section was deleted). Restore that first.`);
            throw err;
          }
        }
      }
      for (const l of payload.relinks || []) {
        await client(tx, l.model).updateMany({ where: { id: l.id, [l.field]: null }, data: { [l.field]: l.value } });
      }
      if (payload.lockedUsers?.length) await tx.user.updateMany({ where: { id: { in: payload.lockedUsers } }, data: { isActive: true } });
    }
    await tx.recycleBinEntry.update({
      where: { id: e.id },
      data: { status: 'RESTORED', history: pushHistory(e, { action: 'RESTORED', by: req.user.name, role: req.user.role }) },
    });
  }, { timeout: 180000, maxWait: 20000 });
  return { ok: true };
}

/** "Delete from bin" → next manager's bin (skipping levels with nobody in the school), or ARCHIVED at the top. */
export async function escalate(req, id, note) {
  const e = await getEntry(req, id);
  if (!isHolder(req, e)) throw forbidden('This item is not in your recycle bin');
  if (!note || String(note).trim().length < 3) throw badRequest('Please enter a reason (at least 3 characters)');
  const current = e.holderUserId ? rankOf(e.deletedByRole) : rankOf(e.holderRole);
  let next = null;
  for (const role of LADDER) {
    if (rankOf(role) <= current) continue;
    if (role === 'SUPER_ADMIN') { next = role; break; }
    const someone = await prisma.user.count({ where: { schoolId: e.schoolId, role, isActive: true } });
    if (someone) { next = role; break; }
  }
  const data = next
    ? { holderRole: next, holderUserId: null, history: pushHistory(e, { action: 'MOVED_TO_MANAGER', by: req.user.name, role: req.user.role, to: next, note: String(note).trim() }) }
    : { status: 'ARCHIVED', holderRole: 'ARCHIVE', holderUserId: null, history: pushHistory(e, { action: 'ARCHIVED', by: req.user.name, role: req.user.role, note: String(note).trim() }) };
  return prisma.recycleBinEntry.update({ where: { id: e.id }, data });
}

export async function entryDetail(req, id) {
  const e = await getEntry(req, id);
  const payload = parseJSON(e.payload, {});
  const root = payload.records?.[0];
  return {
    ...e, payload: undefined,
    summary: parseJSON(e.summary, {}), deletedBy: parseJSON(e.deletedBy, {}), history: parseJSON(e.history, []),
    preview: root ? { model: root.model, data: root.data } : payload.statusRestore || null,
    totalRecords: payload.records?.length || 0,
    canRestore: e.status !== 'RESTORED', canEscalate: isHolder(req, e),
  };
}
