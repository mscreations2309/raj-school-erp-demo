import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma, nextNumber, pad, contains } from '../lib/prisma.js';
import { ah, notFound, badRequest, paging, parseJSON } from '../lib/http.js';
import { authorize, requireModule, ADMINS, STAFF_ROLES } from '../lib/auth.js';
import { sanitize, assertSameTenant } from '../lib/crud.js';
import { upload, saveUpload } from '../lib/upload.js';
import { audit } from '../lib/audit.js';
import { toCSV } from '../lib/csv.js';
import { moveToBin } from '../lib/recycle.js';

const r = Router();
r.use(requireModule('students'));
const WRITE = [...ADMINS, 'RECEPTIONIST'];
const inc = { grade: true, section: true, parentUser: { select: { id: true, name: true, phone: true, email: true } } };

function buildWhere(req) {
  const q = req.query;
  const where = { schoolId: req.schoolId };
  if (q.gradeId) where.gradeId = q.gradeId;
  if (q.sectionId) where.sectionId = q.sectionId;
  if (q.status) where.status = q.status; else where.status = { not: 'LEFT' };
  if (q.gender) where.gender = q.gender;
  if (q.isHosteller) where.isHosteller = q.isHosteller === 'true';
  if (q.q) {
    where.OR = [
      { firstName: contains(q.q) }, { lastName: contains(q.q) }, { admissionNo: contains(q.q) },
      { fatherName: contains(q.q) }, { fatherPhone: contains(q.q) },
    ];
  }
  return where;
}

r.get('/', authorize(STAFF_ROLES), ah(async (req, res) => {
  const where = buildWhere(req);
  const orderBy = [{ grade: { order: 'asc' } }, { section: { name: 'asc' } }, { rollNo: 'asc' }, { firstName: 'asc' }];
  if (req.query.all === '1') {
    const items = await prisma.student.findMany({ where, include: inc, orderBy });
    return res.json({ items, total: items.length });
  }
  const { skip, take, page, pageSize } = paging(req.query);
  const [items, total] = await Promise.all([
    prisma.student.findMany({ where, include: inc, orderBy, skip, take }),
    prisma.student.count({ where }),
  ]);
  res.json({ items, total, page, pageSize });
}));

r.get('/export', authorize(STAFF_ROLES), ah(async (req, res) => {
  const items = await prisma.student.findMany({ where: buildWhere(req), include: inc, orderBy: [{ grade: { order: 'asc' } }, { rollNo: 'asc' }] });
  const csv = toCSV(items, [
    ['Admission No', 'admissionNo'], ['Roll', 'rollNo'], ['First Name', 'firstName'], ['Last Name', 'lastName'],
    ['Class', (s) => s.grade?.name], ['Section', (s) => s.section?.name], ['Gender', 'gender'],
    ['DOB', (s) => s.dob?.toISOString().slice(0, 10)], ['Father', 'fatherName'], ['Father Phone', 'fatherPhone'],
    ['Mother', 'motherName'], ['Address', 'address'], ['Status', 'status'], ['Hosteller', (s) => (s.isHosteller ? 'Yes' : 'No')],
  ]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
  res.send(csv);
}));

r.get('/:id', authorize(STAFF_ROLES), ah(async (req, res) => {
  const student = await prisma.student.findFirst({
    where: { id: req.params.id, schoolId: req.schoolId },
    include: {
      ...inc,
      documents: true,
      transportStop: { include: { route: { include: { vehicle: true } } } },
      hostelAllocations: { where: { isActive: true }, include: { room: { include: { hostel: true } } } },
      invoices: { orderBy: { period: 'desc' }, include: { payments: true } },
      concessions: { include: { feeHead: true } },
      tcs: true,
      bookIssues: { where: { status: 'ISSUED' }, include: { book: true } },
    },
  });
  if (!student) throw notFound('Student not found');
  const year = await prisma.academicYear.findFirst({ where: { schoolId: req.schoolId, isCurrent: true } });
  const attWhere = { studentId: student.id, ...(year ? { date: { gte: year.startDate, lte: year.endDate } } : {}) };
  const [att, marks, siblings] = await Promise.all([
    prisma.studentAttendance.groupBy({ by: ['status'], where: attWhere, _count: true }),
    prisma.mark.findMany({ where: { studentId: student.id }, include: { exam: true, subject: true }, orderBy: { exam: { startDate: 'asc' } } }),
    student.parentUserId
      ? prisma.student.findMany({ where: { parentUserId: student.parentUserId, id: { not: student.id } }, include: { grade: true, section: true } })
      : [],
  ]);
  const attendance = Object.fromEntries(att.map((a) => [a.status, a._count]));
  const totalDays = Object.values(attendance).reduce((a, b) => a + b, 0);
  const presentish = (attendance.PRESENT || 0) + (attendance.LATE || 0) + (attendance.HALF_DAY || 0) * 0.5;
  const fees = student.invoices.reduce((s, i) => ({ total: s.total + i.total, paid: s.paid + i.paid }), { total: 0, paid: 0 });
  res.json({
    ...student,
    siblings,
    attendanceSummary: { ...attendance, totalDays, percent: totalDays ? Math.round((presentish / totalDays) * 1000) / 10 : null },
    feeSummary: { ...fees, due: fees.total - fees.paid },
    marks,
  });
}));

async function ensureParentLogin(tx, schoolId, s) {
  const phone = s.fatherPhone || s.motherPhone;
  if (!phone) return null;
  let parent = await tx.user.findFirst({ where: { schoolId, role: 'PARENT', phone } });
  let tempPassword = null;
  if (!parent) {
    tempPassword = phone; // initial password = registered mobile; parent is asked to change it
    parent = await tx.user.create({
      data: {
        schoolId, role: 'PARENT', name: s.fatherName || s.motherName || 'Parent', phone,
        email: (s.fatherEmail || `${phone}@parent.local`).toLowerCase(),
        passwordHash: await bcrypt.hash(tempPassword, 10),
      },
    });
  }
  return { parent, tempPassword };
}

r.post('/', authorize(WRITE), ah(async (req, res) => {
  const data = sanitize('Student', { ...req.body, admissionNo: req.body.admissionNo || 'AUTO' }, { deny: ['parentUserId', 'userId'] });
  await assertSameTenant('Student', data, req.schoolId);
  if (data.sectionId && !data.gradeId) {
    data.gradeId = (await prisma.section.findUnique({ where: { id: data.sectionId } })).gradeId;
  }
  const result = await prisma.$transaction(async (tx) => {
    if (!req.body.admissionNo) {
      const n = await nextNumber(req.schoolId, 'admission-no', tx);
      data.admissionNo = `RES${new Date().getFullYear()}${pad(n, 4)}`;
    }
    if (data.sectionId && data.rollNo == null) {
      const last = await tx.student.findFirst({ where: { sectionId: data.sectionId }, orderBy: { rollNo: 'desc' } });
      data.rollNo = (last?.rollNo || 0) + 1;
    }
    let login = null;
    if (req.body.createParentLogin !== false) login = await ensureParentLogin(tx, req.schoolId, data);
    const student = await tx.student.create({ data: { ...data, schoolId: req.schoolId, parentUserId: login?.parent.id }, include: inc });
    return { student, tempPassword: login?.tempPassword, parentLogin: login?.parent?.phone };
  });
  audit(req, 'CREATE', 'Student', result.student.id);
  res.status(201).json(result);
}));

r.put('/:id', authorize(WRITE), ah(async (req, res) => {
  const existing = await prisma.student.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!existing) throw notFound();
  const data = sanitize('Student', req.body, { partial: true, deny: ['parentUserId', 'userId'] });
  await assertSameTenant('Student', data, req.schoolId);
  if (data.sectionId && !data.gradeId) data.gradeId = (await prisma.section.findUnique({ where: { id: data.sectionId } })).gradeId;
  const student = await prisma.student.update({ where: { id: existing.id }, data, include: inc });
  audit(req, 'UPDATE', 'Student', student.id, Object.keys(data));
  res.json(student);
}));

r.delete('/:id', authorize(ADMINS), ah(async (req, res) => {
  const existing = await prisma.student.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!existing) throw notFound();
  // Never hard delete: student + fees, attendance, marks, documents go to the Recycle Bin; logins are locked
  const entry = await moveToBin(req, { roots: [{ model: 'Student', ids: [existing.id] }], reason: req.body?.reason });
  audit(req, 'MOVE_TO_RECYCLE_BIN', 'Student', existing.id, { entry: entry.id });
  res.json({ ok: true, recycleBinEntryId: entry.id });
}));

r.post('/:id/parent-login', authorize(WRITE), ah(async (req, res) => {
  const s = await prisma.student.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!s) throw notFound();
  const phone = s.fatherPhone || s.motherPhone;
  if (!phone) throw badRequest('Add father or mother mobile number first');
  let parent = s.parentUserId ? await prisma.user.findUnique({ where: { id: s.parentUserId } }) : null;
  const passwordHash = await bcrypt.hash(phone, 10);
  if (parent) parent = await prisma.user.update({ where: { id: parent.id }, data: { passwordHash, isActive: true } });
  else {
    const out = await ensureParentLogin(prisma, req.schoolId, s);
    parent = out.parent;
    await prisma.user.update({ where: { id: parent.id }, data: { passwordHash } });
    await prisma.student.update({ where: { id: s.id }, data: { parentUserId: parent.id } });
  }
  audit(req, 'RESET_PARENT_LOGIN', 'Student', s.id);
  res.json({ login: parent.phone, password: phone });
}));

r.post('/promote', authorize(ADMINS), ah(async (req, res) => {
  const { studentIds, toSectionId, status } = z
    .object({ studentIds: z.array(z.string()).min(1), toSectionId: z.string().optional(), status: z.enum(['ACTIVE', 'ALUMNI', 'LEFT']).optional() })
    .parse(req.body);
  const data = {};
  if (toSectionId) {
    const sec = await prisma.section.findFirst({ where: { id: toSectionId, schoolId: req.schoolId } });
    if (!sec) throw badRequest('Invalid target section');
    Object.assign(data, { sectionId: sec.id, gradeId: sec.gradeId, rollNo: null });
  }
  if (status) data.status = status;
  const { count } = await prisma.student.updateMany({ where: { id: { in: studentIds }, schoolId: req.schoolId }, data });
  if (toSectionId) {
    const moved = await prisma.student.findMany({ where: { sectionId: toSectionId }, orderBy: [{ rollNo: 'asc' }, { firstName: 'asc' }] });
    await prisma.$transaction(moved.map((s, i) => prisma.student.update({ where: { id: s.id }, data: { rollNo: i + 1 } })));
  }
  audit(req, 'PROMOTE', 'Student', null, { count, toSectionId, status });
  res.json({ updated: count });
}));

r.post('/:id/documents', authorize(WRITE), upload.array('files', 6), ah(async (req, res) => {
  const s = await prisma.student.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!s) throw notFound();
  const docs = [];
  for (const f of req.files || []) {
    docs.push(await prisma.studentDocument.create({ data: { schoolId: req.schoolId, studentId: s.id, name: req.body.name || f.originalname, url: await saveUpload(req, f) } }));
  }
  res.status(201).json(docs);
}));

r.delete('/:id/documents/:docId', authorize(WRITE), ah(async (req, res) => {
  const doc = await prisma.studentDocument.findFirst({ where: { id: req.params.docId, studentId: req.params.id, schoolId: req.schoolId } });
  if (!doc) throw notFound();
  await moveToBin(req, { roots: [{ model: 'StudentDocument', ids: [doc.id] }], reason: req.body?.reason });
  res.json({ ok: true });
}));

r.post('/:id/tc', authorize(WRITE), ah(async (req, res) => {
  const s = await prisma.student.findFirst({ where: { id: req.params.id, schoolId: req.schoolId }, include: { grade: true } });
  if (!s) throw notFound();
  const d = z.object({ reason: z.string().optional(), conduct: z.string().default('Good'), leavingDate: z.string().optional() }).parse(req.body);
  const n = await nextNumber(req.schoolId, 'tc');
  const tc = await prisma.transferCertificate.create({
    data: {
      schoolId: req.schoolId, tcNo: `TC/${new Date().getFullYear()}/${pad(n, 4)}`, studentId: s.id,
      studentName: `${s.firstName} ${s.lastName || ''}`.trim(), fatherName: s.fatherName, admissionNo: s.admissionNo,
      className: s.grade?.name, dob: s.dob, reason: d.reason, conduct: d.conduct,
      leavingDate: d.leavingDate ? new Date(d.leavingDate) : new Date(),
    },
  });
  await prisma.student.update({ where: { id: s.id }, data: { status: 'TC_ISSUED' } });
  audit(req, 'ISSUE_TC', 'Student', s.id, { tcNo: tc.tcNo });
  res.status(201).json(tc);
}));

export default r;
