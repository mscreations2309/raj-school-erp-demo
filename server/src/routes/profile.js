// Student roles & activity tags, houses, and profile photos with approval.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah, notFound, badRequest, forbidden, parseJSON } from '../lib/http.js';
import { authorize, ADMINS, STAFF_ROLES, ALL_SCHOOL_ROLES } from '../lib/auth.js';
import { upload, saveUpload } from '../lib/upload.js';
import { moveToBin } from '../lib/recycle.js';
import { audit } from '../lib/audit.js';

const r = Router();
const isAdmin = (req) => ['SCHOOL_ADMIN', 'PRINCIPAL', 'SUPER_ADMIN'].includes(req.user.role);
const myStaff = (req) => prisma.staff.findFirst({ where: { userId: req.user.id, schoolId: req.schoolId } });
// All tags are returned; the UI shows only active ones (no end date, or end date in the future)
export const tagInclude = { tags: { include: { type: true }, orderBy: { fromDate: 'asc' } } };

/** Can this user assign/remove a tag of this type for this student? */
async function canManageTag(req, type, student) {
  if (isAdmin(req)) return true;
  if (type.assignableBy === 'ADMIN') return false;
  const me = await myStaff(req);
  if (!me) return false;
  if (type.assignableBy === 'INCHARGE') return type.inchargeStaffId === me.id;
  if (type.assignableBy === 'CLASS_TEACHER') {
    const sec = student.sectionId && (await prisma.section.findUnique({ where: { id: student.sectionId }, select: { classTeacherId: true } }));
    return sec?.classTeacherId === me.id;
  }
  return false;
}

const currentSession = async (schoolId) => (await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } }))?.name || null;

// ───────── Tags on a student ─────────
r.get('/students/:id/tags', authorize(STAFF_ROLES), ah(async (req, res) => {
  const st = await prisma.student.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!st) throw notFound();
  const [tags, types] = await Promise.all([
    prisma.studentTag.findMany({ where: { studentId: st.id }, include: { type: true }, orderBy: { fromDate: 'desc' } }),
    prisma.studentTagType.findMany({ where: { schoolId: req.schoolId, isActive: true }, orderBy: [{ kind: 'desc' }, { order: 'asc' }] }),
  ]);
  const assignable = [];
  for (const t of types) if (await canManageTag(req, t, st)) assignable.push(t.id);
  const houses = parseJSON(req.school.settings, {}).houses || [];
  res.json({ tags: tags.map((t) => ({ ...t, canRemove: assignable.includes(t.typeId) })), types: types.filter((t) => assignable.includes(t.id)), houses, house: st.house });
}));

r.post('/students/:id/tags', authorize(STAFF_ROLES), ah(async (req, res) => {
  const d = z.object({ typeId: z.string(), house: z.string().optional().nullable(), fromDate: z.string().optional(), toDate: z.string().optional().nullable(), note: z.string().max(200).optional() }).parse(req.body);
  const st = await prisma.student.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!st) throw notFound();
  const type = await prisma.studentTagType.findFirst({ where: { id: d.typeId, schoolId: req.schoolId, isActive: true } });
  if (!type) throw badRequest('Unknown role / activity');
  if (!(await canManageTag(req, type, st))) throw forbidden(`You are not allowed to assign "${type.name}"`);
  const house = type.needsHouse ? d.house || st.house : null;
  if (type.needsHouse && !house) throw badRequest('Choose the house');
  const dup = await prisma.studentTag.findFirst({ where: { studentId: st.id, typeId: type.id, toDate: null } });
  if (dup) throw badRequest(`${type.name} is already assigned to this student`);
  const tag = await prisma.studentTag.create({
    data: {
      schoolId: req.schoolId, studentId: st.id, typeId: type.id, house, note: d.note, session: await currentSession(req.schoolId),
      fromDate: d.fromDate ? new Date(d.fromDate) : new Date(), toDate: d.toDate ? new Date(d.toDate) : null,
      assignedById: req.user.id, assignedByName: req.user.name,
    },
    include: { type: true },
  });
  audit(req, 'ASSIGN_TAG', 'Student', st.id, { tag: type.name, house });
  res.status(201).json(tag);
}));

// Removing a tag goes to the Recycle Bin (never erased)
r.delete('/student-tags/:id', authorize(STAFF_ROLES), ah(async (req, res) => {
  const tag = await prisma.studentTag.findFirst({ where: { id: req.params.id, schoolId: req.schoolId }, include: { type: true, student: true } });
  if (!tag) throw notFound();
  if (!(await canManageTag(req, tag.type, tag.student))) throw forbidden(`You are not allowed to remove "${tag.type.name}"`);
  await moveToBin(req, { roots: [{ model: 'StudentTag', ids: [tag.id] }], label: `${tag.type.name} — ${tag.student.firstName} ${tag.student.lastName || ''} (${tag.student.admissionNo})`, reason: req.body?.reason });
  audit(req, 'REMOVE_TAG', 'Student', tag.studentId, { tag: tag.type.name });
  res.json({ ok: true });
}));

r.put('/students/:id/house', authorize(STAFF_ROLES), ah(async (req, res) => {
  const { house } = z.object({ house: z.string().nullable() }).parse(req.body);
  const st = await prisma.student.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!st) throw notFound();
  if (!isAdmin(req)) {
    const me = await myStaff(req);
    const sec = st.sectionId && (await prisma.section.findUnique({ where: { id: st.sectionId } }));
    if (!me || sec?.classTeacherId !== me.id) throw forbidden('Only the class teacher or admin can set the house');
  }
  const houses = (parseJSON(req.school.settings, {}).houses || []).map((h) => h.name);
  if (house && !houses.includes(house)) throw badRequest('Unknown house');
  await prisma.student.update({ where: { id: st.id }, data: { house } });
  res.json({ ok: true, house });
}));

// ───────── Profile photo (own account) ─────────
async function photoTarget(req) {
  const role = req.user.role;
  if (role === 'STUDENT') {
    const st = await prisma.student.findFirst({ where: { userId: req.user.id }, include: { section: true } });
    const ct = st?.section?.classTeacherId;
    return { studentId: st?.id, previousUrl: st?.photoUrl || req.user.avatarUrl, approverRole: ct ? 'CLASS_TEACHER' : 'ADMIN', approverSectionIds: ct ? [st.sectionId] : [] };
  }
  if (role === 'PARENT') {
    const kids = await prisma.student.findMany({ where: { parentUserId: req.user.id }, include: { section: true } });
    const secs = kids.filter((k) => k.section?.classTeacherId).map((k) => k.sectionId);
    return { previousUrl: req.user.avatarUrl, approverRole: secs.length ? 'CLASS_TEACHER' : 'ADMIN', approverSectionIds: [...new Set(secs)] };
  }
  const staff = await myStaff(req);
  return { staffId: staff?.id, previousUrl: staff?.photoUrl || req.user.avatarUrl, approverRole: 'ADMIN', approverSectionIds: [] };
}

r.get('/me/photo', authorize(ALL_SCHOOL_ROLES), ah(async (req, res) => {
  const last = await prisma.photoRequest.findFirst({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
  res.json({ current: req.user.avatarUrl, request: last });
}));

r.post('/me/photo', authorize(ALL_SCHOOL_ROLES), upload.single('photo'), ah(async (req, res) => {
  if (!req.file) throw badRequest('Choose a photo');
  if (!/^image\/(png|jpe?g|webp)$/.test(req.file.mimetype)) throw badRequest('Photo must be JPG, PNG or WEBP');
  if (req.file.size > 5 * 1024 * 1024) throw badRequest('Photo must be 5 MB or smaller');
  const t = await photoTarget(req);
  const photoUrl = await saveUpload(req, req.file);
  await prisma.photoRequest.updateMany({ where: { userId: req.user.id, status: 'PENDING' }, data: { status: 'SUPERSEDED' } });
  const pr = await prisma.photoRequest.create({
    data: {
      schoolId: req.schoolId, userId: req.user.id, userName: req.user.name, userRole: req.user.role, studentId: t.studentId, staffId: t.staffId,
      photoUrl, previousUrl: t.previousUrl, approverRole: t.approverRole, approverSectionIds: JSON.stringify(t.approverSectionIds),
    },
  });
  audit(req, 'PHOTO_SUBMITTED', 'User', req.user.id);
  res.status(201).json(pr);
}));

// ───────── Approvals ─────────
async function approvableWhere(req) {
  const base = { schoolId: req.schoolId, status: 'PENDING', userId: { not: req.user.id } }; // nobody approves their own photo
  if (isAdmin(req)) return { where: base, filter: () => true };
  const me = await myStaff(req);
  if (!me) return { where: { id: '__none__' }, filter: () => false };
  const mySecs = (await prisma.section.findMany({ where: { classTeacherId: me.id }, select: { id: true } })).map((s) => s.id);
  return { where: { ...base, approverRole: 'CLASS_TEACHER' }, filter: (p) => parseJSON(p.approverSectionIds, []).some((id) => mySecs.includes(id)) };
}

r.get('/photo-requests', authorize(STAFF_ROLES), ah(async (req, res) => {
  const { where, filter } = await approvableWhere(req);
  const items = (await prisma.photoRequest.findMany({ where, orderBy: { createdAt: 'asc' } })).filter(filter);
  const studentIds = items.map((i) => i.studentId).filter(Boolean);
  const parents = items.filter((i) => i.userRole === 'PARENT').map((i) => i.userId);
  const [students, kids] = await Promise.all([
    prisma.student.findMany({ where: { id: { in: studentIds } }, include: { grade: true, section: true } }),
    prisma.student.findMany({ where: { parentUserId: { in: parents } }, include: { grade: true, section: true } }),
  ]);
  res.json({
    items: items.map((i) => ({
      ...i,
      context: i.studentId
        ? (() => { const s = students.find((x) => x.id === i.studentId); return s ? `Student • ${s.grade?.name}-${s.section?.name} • ${s.admissionNo}` : 'Student'; })()
        : i.userRole === 'PARENT' ? `Parent of ${kids.filter((k) => k.parentUserId === i.userId).map((k) => `${k.firstName} (${k.grade?.name}-${k.section?.name})`).join(', ')}` : `Staff • ${i.userRole.replace('_', ' ').toLowerCase()}`,
    })),
    total: items.length,
  });
}));

async function loadApprovable(req, id) {
  const pr = await prisma.photoRequest.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!pr) throw notFound();
  if (pr.status !== 'PENDING') throw badRequest('This photo has already been reviewed');
  const { filter } = await approvableWhere(req);
  if (pr.userId === req.user.id || (!isAdmin(req) && (pr.approverRole !== 'CLASS_TEACHER' || !filter(pr)))) throw forbidden('You cannot review this photo');
  return pr;
}

r.post('/photo-requests/:id/approve', authorize(STAFF_ROLES), ah(async (req, res) => {
  const pr = await loadApprovable(req, req.params.id);
  await prisma.$transaction([
    prisma.photoRequest.update({ where: { id: pr.id }, data: { status: 'APPROVED', reviewedById: req.user.id, reviewedByName: req.user.name, reviewedAt: new Date() } }),
    prisma.user.update({ where: { id: pr.userId }, data: { avatarUrl: pr.photoUrl } }),
    ...(pr.studentId ? [prisma.student.update({ where: { id: pr.studentId }, data: { photoUrl: pr.photoUrl } })] : []),
    ...(pr.staffId ? [prisma.staff.update({ where: { id: pr.staffId }, data: { photoUrl: pr.photoUrl } })] : []),
    prisma.message.create({ data: { schoolId: req.schoolId, senderId: req.user.id, recipientId: pr.userId, audience: 'INDIVIDUAL', channel: 'APP', subject: 'Profile photo approved', body: `Your new profile photo was approved by ${req.user.name} and is now visible to everyone.` } }),
  ]);
  audit(req, 'PHOTO_APPROVED', 'User', pr.userId);
  res.json({ ok: true });
}));

r.post('/photo-requests/:id/reject', authorize(STAFF_ROLES), ah(async (req, res) => {
  const { reason } = z.object({ reason: z.string().min(3, 'Please give a reason') }).parse(req.body);
  const pr = await loadApprovable(req, req.params.id);
  await prisma.$transaction([
    prisma.photoRequest.update({ where: { id: pr.id }, data: { status: 'REJECTED', reviewedById: req.user.id, reviewedByName: req.user.name, reviewedAt: new Date(), reason } }),
    prisma.message.create({ data: { schoolId: req.schoolId, senderId: req.user.id, recipientId: pr.userId, audience: 'INDIVIDUAL', channel: 'APP', subject: 'Profile photo not approved', body: `Your new profile photo was not approved by ${req.user.name}. Reason: ${reason}\nYour previous photo is still shown. You can upload another one from "My profile".` } }),
  ]);
  audit(req, 'PHOTO_REJECTED', 'User', pr.userId, { reason });
  res.json({ ok: true });
}));

export default r;
