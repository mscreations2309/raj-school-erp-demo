// Admissions workflow, library circulation, inventory stock, timetable, messaging, dashboard, settings, uploads.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma, nextNumber, pad, contains } from '../lib/prisma.js';
import { ah, notFound, badRequest, paging, parseJSON, dayKey } from '../lib/http.js';
import { authorize, requireModule, ADMINS, STAFF_ROLES, ALL_SCHOOL_ROLES } from '../lib/auth.js';
import { sanitize } from '../lib/crud.js';
import { upload, fileUrl } from '../lib/upload.js';
import { audit } from '../lib/audit.js';

const r = Router();
const FRONT = [...ADMINS, 'RECEPTIONIST'];

// ───────── Admission applications ─────────
const apps = Router();
apps.use(requireModule('admissions'), authorize(FRONT));
apps.get('/', ah(async (req, res) => {
  const where = { schoolId: req.schoolId };
  if (req.query.status) where.status = req.query.status;
  if (req.query.gradeSought) where.gradeSought = req.query.gradeSought;
  if (req.query.q) where.OR = [{ studentName: contains(req.query.q) }, { regNo: contains(req.query.q) }, { fatherPhone: contains(req.query.q) }, { fatherName: contains(req.query.q) }];
  const { skip, take, page, pageSize } = paging(req.query);
  const [items, total, byStatus] = await Promise.all([
    prisma.admissionApplication.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.admissionApplication.count({ where }),
    prisma.admissionApplication.groupBy({ by: ['status'], where: { schoolId: req.schoolId }, _count: true }),
  ]);
  res.json({ items, total, page, pageSize, byStatus: Object.fromEntries(byStatus.map((b) => [b.status, b._count])) });
}));
apps.get('/:id', ah(async (req, res) => {
  const a = await prisma.admissionApplication.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!a) throw notFound();
  res.json({ ...a, documents: parseJSON(a.documents, []) });
}));
apps.put('/:id', ah(async (req, res) => {
  const a = await prisma.admissionApplication.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!a) throw notFound();
  const data = sanitize('AdmissionApplication', req.body, { partial: true, deny: ['regNo', 'studentId', 'documents'] });
  const updated = await prisma.admissionApplication.update({ where: { id: a.id }, data });
  audit(req, 'UPDATE', 'AdmissionApplication', a.id, Object.keys(data));
  res.json(updated);
}));
apps.delete('/:id', authorize(ADMINS), ah(async (req, res) => {
  await prisma.admissionApplication.deleteMany({ where: { id: req.params.id, schoolId: req.schoolId } });
  res.json({ ok: true });
}));
apps.post('/:id/enroll', ah(async (req, res) => {
  const { sectionId } = z.object({ sectionId: z.string() }).parse(req.body);
  const a = await prisma.admissionApplication.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!a) throw notFound();
  if (a.status === 'ENROLLED') throw badRequest('Already enrolled');
  const section = await prisma.section.findFirst({ where: { id: sectionId, schoolId: req.schoolId } });
  if (!section) throw badRequest('Invalid section');
  const [firstName, ...rest] = a.studentName.split(' ');
  const out = await prisma.$transaction(async (tx) => {
    const n = await nextNumber(req.schoolId, 'admission-no', tx);
    const last = await tx.student.findFirst({ where: { sectionId }, orderBy: { rollNo: 'desc' } });
    let parent = await tx.user.findFirst({ where: { schoolId: req.schoolId, role: 'PARENT', phone: a.fatherPhone } });
    let tempPassword = null;
    if (!parent) {
      tempPassword = a.fatherPhone;
      parent = await tx.user.create({ data: { schoolId: req.schoolId, role: 'PARENT', name: a.fatherName, phone: a.fatherPhone, email: (a.fatherEmail || `${a.fatherPhone}@parent.local`).toLowerCase(), passwordHash: await bcrypt.hash(tempPassword, 10) } });
    }
    const student = await tx.student.create({
      data: {
        schoolId: req.schoolId, admissionNo: `RES${new Date().getFullYear()}${pad(n, 4)}`, rollNo: (last?.rollNo || 0) + 1,
        firstName, lastName: rest.join(' ') || null, gender: a.gender, dob: a.dob, bloodGroup: a.bloodGroup, aadhaar: a.aadhaar,
        gradeId: section.gradeId, sectionId, address: a.permanentAddress, previousSchool: a.previousSchool,
        fatherName: a.fatherName, fatherPhone: a.fatherPhone, fatherEmail: a.fatherEmail, fatherOccupation: a.fatherOccupation,
        motherName: a.motherName, motherPhone: a.motherPhone, motherOccupation: a.motherOccupation, parentUserId: parent.id,
      },
    });
    for (const doc of parseJSON(a.documents, [])) await tx.studentDocument.create({ data: { schoolId: req.schoolId, studentId: student.id, name: doc.name, url: doc.url } });
    await tx.admissionApplication.update({ where: { id: a.id }, data: { status: 'ENROLLED', studentId: student.id } });
    return { student, parentLogin: parent.phone, tempPassword };
  });
  audit(req, 'ENROLL', 'AdmissionApplication', a.id, { studentId: out.student.id });
  res.json(out);
}));
r.use('/applications', apps);

// ───────── Library circulation ─────────
const lib = Router();
lib.use(requireModule('library'), authorize([...ADMINS, 'LIBRARIAN']));
lib.get('/issues', ah(async (req, res) => {
  const where = { schoolId: req.schoolId };
  if (req.query.status === 'OVERDUE') { where.status = 'ISSUED'; where.dueDate = { lt: new Date() }; }
  else if (req.query.status) where.status = req.query.status;
  if (req.query.q) where.OR = [{ book: { title: contains(req.query.q) } }, { student: { firstName: contains(req.query.q) } }, { student: { admissionNo: contains(req.query.q) } }];
  const { skip, take, page, pageSize } = paging(req.query);
  const [items, total] = await Promise.all([
    prisma.bookIssue.findMany({ where, skip, take, orderBy: { issueDate: 'desc' }, include: { book: true, student: { include: { grade: true, section: true } }, staff: true } }),
    prisma.bookIssue.count({ where }),
  ]);
  res.json({ items, total, page, pageSize });
}));
lib.post('/issue', ah(async (req, res) => {
  const d = z.object({ bookId: z.string(), studentId: z.string().optional(), staffId: z.string().optional(), days: z.coerce.number().int().min(1).max(90).default(14) }).parse(req.body);
  if (!d.studentId && !d.staffId) throw badRequest('Select a student or staff member');
  const issue = await prisma.$transaction(async (tx) => {
    const book = await tx.book.findFirst({ where: { id: d.bookId, schoolId: req.schoolId } });
    if (!book) throw badRequest('Invalid book');
    if (book.available < 1) throw badRequest('No copies available');
    if (d.studentId && !(await tx.student.findFirst({ where: { id: d.studentId, schoolId: req.schoolId } }))) throw badRequest('Invalid student');
    if (d.staffId && !(await tx.staff.findFirst({ where: { id: d.staffId, schoolId: req.schoolId } }))) throw badRequest('Invalid staff');
    await tx.book.update({ where: { id: book.id }, data: { available: { decrement: 1 } } });
    return tx.bookIssue.create({ data: { schoolId: req.schoolId, bookId: book.id, studentId: d.studentId, staffId: d.staffId, dueDate: new Date(Date.now() + d.days * 864e5) }, include: { book: true } });
  });
  audit(req, 'ISSUE_BOOK', 'BookIssue', issue.id);
  res.status(201).json(issue);
}));
lib.post('/return/:id', ah(async (req, res) => {
  const finePerDay = parseJSON(req.school.settings, {}).libraryFinePerDay ?? 2;
  const out = await prisma.$transaction(async (tx) => {
    const issue = await tx.bookIssue.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
    if (!issue) throw notFound();
    if (issue.status !== 'ISSUED') throw badRequest('Book already returned');
    const lateDays = Math.max(0, Math.floor((Date.now() - issue.dueDate.getTime()) / 864e5));
    const fine = req.body.fine != null ? Number(req.body.fine) : lateDays * finePerDay;
    const lost = req.body.lost === true;
    if (!lost) await tx.book.update({ where: { id: issue.bookId }, data: { available: { increment: 1 } } });
    else await tx.book.update({ where: { id: issue.bookId }, data: { copies: { decrement: 1 } } });
    return tx.bookIssue.update({ where: { id: issue.id }, data: { status: lost ? 'LOST' : 'RETURNED', returnDate: new Date(), fine } });
  });
  audit(req, 'RETURN_BOOK', 'BookIssue', out.id, { fine: out.fine });
  res.json(out);
}));
lib.get('/stats', ah(async (req, res) => {
  const [books, copies, issued, overdue] = await Promise.all([
    prisma.book.count({ where: { schoolId: req.schoolId } }),
    prisma.book.aggregate({ where: { schoolId: req.schoolId }, _sum: { copies: true, available: true } }),
    prisma.bookIssue.count({ where: { schoolId: req.schoolId, status: 'ISSUED' } }),
    prisma.bookIssue.count({ where: { schoolId: req.schoolId, status: 'ISSUED', dueDate: { lt: new Date() } } }),
  ]);
  res.json({ titles: books, copies: copies._sum.copies || 0, available: copies._sum.available || 0, issued, overdue });
}));
r.use('/library', lib);

// ───────── Inventory stock movement ─────────
const inv = Router();
inv.use(requireModule('inventory'), authorize(ADMINS));
inv.get('/:itemId/txns', ah(async (req, res) => {
  const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.itemId, schoolId: req.schoolId } });
  if (!item) throw notFound();
  res.json({ item, items: await prisma.inventoryTxn.findMany({ where: { itemId: item.id }, orderBy: { date: 'desc' }, take: 200 }) });
}));
inv.post('/:itemId/txns', ah(async (req, res) => {
  const d = z.object({ type: z.enum(['IN', 'OUT']), qty: z.coerce.number().int().positive(), note: z.string().optional() }).parse(req.body);
  const out = await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findFirst({ where: { id: req.params.itemId, schoolId: req.schoolId } });
    if (!item) throw notFound();
    if (d.type === 'OUT' && item.quantity < d.qty) throw badRequest(`Only ${item.quantity} ${item.unit} in stock`);
    await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: { [d.type === 'IN' ? 'increment' : 'decrement']: d.qty } } });
    return tx.inventoryTxn.create({ data: { itemId: item.id, ...d } });
  });
  res.status(201).json(out);
}));
r.use('/inventory', inv);

// ───────── Timetable ─────────
const tt = Router();
tt.use(requireModule('academics'));
tt.get('/', authorize(ALL_SCHOOL_ROLES), ah(async (req, res) => {
  const where = { schoolId: req.schoolId };
  if (req.query.sectionId) where.sectionId = req.query.sectionId;
  else if (req.query.teacherId) where.teacherId = req.query.teacherId;
  else throw badRequest('sectionId or teacherId is required');
  const items = await prisma.timetableSlot.findMany({ where, orderBy: [{ day: 'asc' }, { period: 'asc' }], include: { subject: true, teacher: { select: { id: true, firstName: true, lastName: true } }, section: { include: { grade: true } } } });
  res.json({ items });
}));
tt.put('/', authorize(ADMINS), ah(async (req, res) => {
  const d = z.object({
    sectionId: z.string(),
    slots: z.array(z.object({ day: z.number().int().min(1).max(7), period: z.number().int().min(1).max(12), startTime: z.string(), endTime: z.string(), subjectId: z.string().nullable().optional(), teacherId: z.string().nullable().optional() })),
  }).parse(req.body);
  const sec = await prisma.section.findFirst({ where: { id: d.sectionId, schoolId: req.schoolId } });
  if (!sec) throw badRequest('Invalid section');
  // Teacher clash detection across other sections
  for (const s of d.slots.filter((x) => x.teacherId)) {
    const clash = await prisma.timetableSlot.findFirst({ where: { schoolId: req.schoolId, teacherId: s.teacherId, day: s.day, period: s.period, sectionId: { not: d.sectionId } }, include: { section: { include: { grade: true } }, teacher: true } });
    if (clash) throw badRequest(`${clash.teacher.firstName} is already teaching ${clash.section.grade.name}-${clash.section.name} on day ${s.day}, period ${s.period}`);
  }
  await prisma.$transaction([
    prisma.timetableSlot.deleteMany({ where: { sectionId: d.sectionId } }),
    ...d.slots.map((s) => prisma.timetableSlot.create({ data: { ...s, subjectId: s.subjectId || null, teacherId: s.teacherId || null, schoolId: req.schoolId, sectionId: d.sectionId } })),
  ]);
  audit(req, 'SAVE_TIMETABLE', 'Section', d.sectionId);
  res.json({ saved: d.slots.length });
}));
r.use('/timetable', tt);

// ───────── Messaging ─────────
const msg = Router();
msg.use(requireModule('communication'));
msg.get('/', authorize(ALL_SCHOOL_ROLES), ah(async (req, res) => {
  const role = req.user.role;
  const audiences = ['INDIVIDUAL'];
  if (role === 'PARENT') audiences.push('ALL_PARENTS');
  if (STAFF_ROLES.includes(role)) audiences.push('ALL_STAFF');
  let sectionIds = [];
  if (role === 'PARENT') sectionIds = (await prisma.student.findMany({ where: { parentUserId: req.user.id }, select: { sectionId: true } })).map((s) => s.sectionId).filter(Boolean);
  const where = req.query.box === 'sent'
    ? { schoolId: req.schoolId, senderId: req.user.id }
    : { schoolId: req.schoolId, OR: [{ recipientId: req.user.id }, { audience: { in: audiences.filter((a) => a !== 'INDIVIDUAL') } }, ...(sectionIds.length ? [{ audience: 'SECTION', sectionId: { in: sectionIds } }] : [])] };
  const items = await prisma.message.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, include: { sender: { select: { name: true, role: true } } } });
  res.json({ items, total: items.length });
}));
msg.post('/', authorize(STAFF_ROLES), ah(async (req, res) => {
  const d = z.object({
    audience: z.enum(['INDIVIDUAL', 'ALL_PARENTS', 'ALL_STAFF', 'SECTION']), recipientId: z.string().optional(), sectionId: z.string().optional(),
    channel: z.enum(['APP', 'SMS', 'EMAIL', 'WHATSAPP']).default('APP'), subject: z.string().min(2), body: z.string().min(2),
  }).parse(req.body);
  if (d.audience === 'INDIVIDUAL' && !(d.recipientId && (await prisma.user.findFirst({ where: { id: d.recipientId, schoolId: req.schoolId } })))) throw badRequest('Select a valid recipient');
  if (d.audience === 'SECTION' && !(d.sectionId && (await prisma.section.findFirst({ where: { id: d.sectionId, schoolId: req.schoolId } })))) throw badRequest('Select a valid section');
  if (['ALL_PARENTS', 'ALL_STAFF'].includes(d.audience) && !ADMINS.includes(req.user.role) && req.user.role !== 'SUPER_ADMIN') throw badRequest('Only admins can broadcast');
  const m = await prisma.message.create({ data: { ...d, schoolId: req.schoolId, senderId: req.user.id } });
  // SMS / WhatsApp / Email delivery hooks plug in here (provider keys in School.settings)
  audit(req, 'SEND_MESSAGE', 'Message', m.id, { audience: d.audience, channel: d.channel });
  res.status(201).json(m);
}));
msg.post('/:id/read', authorize(ALL_SCHOOL_ROLES), ah(async (req, res) => {
  await prisma.message.updateMany({ where: { id: req.params.id, schoolId: req.schoolId, recipientId: req.user.id }, data: { isRead: true } });
  res.json({ ok: true });
}));
msg.get('/recipients', authorize(STAFF_ROLES), ah(async (req, res) => {
  const where = { schoolId: req.schoolId, isActive: true };
  if (req.query.q) where.OR = [{ name: contains(req.query.q) }, { phone: contains(req.query.q) }];
  res.json({ items: await prisma.user.findMany({ where, take: 20, select: { id: true, name: true, role: true, phone: true } }) });
}));
r.use('/messages', msg);

// ───────── Dashboard ─────────
r.get('/dashboard', authorize(STAFF_ROLES), ah(async (req, res) => {
  const schoolId = req.schoolId;
  const today = dayKey(new Date());
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [
    students, staff, boys, girls, att, staffAtt, monthFee, outstanding, enquiries, applications,
    gradeCounts, recentPayments, upcomingEvents, notices, pendingLeaves, todayFee, attTrend, lowStock, overdueBooks,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }),
    prisma.staff.count({ where: { schoolId, status: 'ACTIVE' } }),
    prisma.student.count({ where: { schoolId, status: 'ACTIVE', gender: 'MALE' } }),
    prisma.student.count({ where: { schoolId, status: 'ACTIVE', gender: 'FEMALE' } }),
    prisma.studentAttendance.groupBy({ by: ['status'], where: { schoolId, date: today }, _count: true }),
    prisma.staffAttendance.groupBy({ by: ['status'], where: { schoolId, date: today }, _count: true }),
    prisma.feePayment.aggregate({ where: { schoolId, paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.feeInvoice.aggregate({ where: { schoolId, status: { in: ['UNPAID', 'PARTIAL'] } }, _sum: { total: true, paid: true } }),
    prisma.enquiry.count({ where: { schoolId, status: 'NEW' } }),
    prisma.admissionApplication.count({ where: { schoolId, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'TEST_SCHEDULED'] } } }),
    prisma.grade.findMany({ where: { schoolId }, orderBy: { order: 'asc' }, select: { name: true, _count: { select: { students: { where: { status: 'ACTIVE' } } } } } }),
    prisma.feePayment.findMany({ where: { schoolId }, orderBy: { paidAt: 'desc' }, take: 6, include: { student: { include: { grade: true, section: true } } } }),
    prisma.event.findMany({ where: { schoolId, startDate: { gte: today } }, orderBy: { startDate: 'asc' }, take: 5 }),
    prisma.notice.findMany({ where: { schoolId }, orderBy: { publishDate: 'desc' }, take: 5 }),
    prisma.leaveRequest.count({ where: { schoolId, status: 'PENDING' } }),
    prisma.feePayment.aggregate({ where: { schoolId, paidAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } }, _sum: { amount: true } }),
    prisma.studentAttendance.groupBy({ by: ['date', 'status'], where: { schoolId, date: { gte: new Date(today.getTime() - 20 * 864e5) } }, _count: true }),
    prisma.inventoryItem.findMany({ where: { schoolId }, select: { name: true, quantity: true, minQuantity: true, unit: true } }),
    prisma.bookIssue.count({ where: { schoolId, status: 'ISSUED', dueDate: { lt: now } } }),
  ]);
  const a = Object.fromEntries(att.map((x) => [x.status, x._count]));
  const sa = Object.fromEntries(staffAtt.map((x) => [x.status, x._count]));
  const trend = {};
  for (const x of attTrend) {
    const k = x.date.toISOString().slice(0, 10);
    trend[k] ||= { date: k, present: 0, total: 0 };
    trend[k].total += x._count;
    if (['PRESENT', 'LATE', 'HALF_DAY'].includes(x.status)) trend[k].present += x._count;
  }
  res.json({
    students, staff, boys, girls,
    attendanceToday: { present: (a.PRESENT || 0) + (a.LATE || 0) + (a.HALF_DAY || 0), absent: a.ABSENT || 0, leave: a.LEAVE || 0, marked: Object.values(a).reduce((x, y) => x + y, 0) },
    staffToday: { present: (sa.PRESENT || 0) + (sa.LATE || 0) + (sa.HALF_DAY || 0), absent: sa.ABSENT || 0, leave: sa.LEAVE || 0 },
    feeThisMonth: monthFee._sum.amount || 0, feeToday: todayFee._sum.amount || 0,
    outstanding: (outstanding._sum.total || 0) - (outstanding._sum.paid || 0),
    newEnquiries: enquiries, openApplications: applications, pendingLeaves, overdueBooks,
    lowStock: lowStock.filter((i) => i.quantity <= i.minQuantity),
    classStrength: gradeCounts.map((g) => ({ name: g.name, students: g._count.students })),
    attendanceTrend: Object.values(trend).sort((x, y) => x.date.localeCompare(y.date)).map((t) => ({ ...t, percent: Math.round((t.present / t.total) * 1000) / 10 })),
    recentPayments, upcomingEvents, notices,
  });
}));

// ───────── Settings & school profile ─────────
r.get('/settings', authorize(STAFF_ROLES), ah(async (req, res) => {
  const s = await prisma.school.findUnique({ where: { id: req.schoolId }, include: { plan: true, subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true } } } });
  res.json({ ...s, settings: parseJSON(s.settings, {}) });
}));
r.put('/settings', authorize(ADMINS), ah(async (req, res) => {
  const profile = sanitize('School', req.body, { partial: true, allow: ['name', 'nameHi', 'shortName', 'tagline', 'taglineHi', 'board', 'affiliationNo', 'schoolCode', 'established', 'address', 'city', 'state', 'pincode', 'phone', 'email', 'website', 'logoUrl', 'primaryColor', 'secondaryColor'] });
  const current = parseJSON(req.school.settings, {});
  const incoming = req.body.settings && typeof req.body.settings === 'object' ? req.body.settings : {};
  const s = await prisma.school.update({ where: { id: req.schoolId }, data: { ...profile, settings: JSON.stringify({ ...current, ...incoming }) } });
  audit(req, 'UPDATE_SETTINGS', 'School', s.id);
  res.json({ ...s, settings: parseJSON(s.settings, {}) });
}));
r.get('/audit', authorize(ADMINS), ah(async (req, res) => {
  const { skip, take, page, pageSize } = paging(req.query);
  const where = { schoolId: req.schoolId };
  if (req.query.entity) where.entity = req.query.entity;
  const [items, total] = await Promise.all([prisma.auditLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }), prisma.auditLog.count({ where })]);
  res.json({ items, total, page, pageSize });
}));

// Generic file upload (images / pdf) → returns public URL
r.post('/upload', authorize(STAFF_ROLES), upload.single('file'), ah(async (req, res) => {
  if (!req.file) throw badRequest('No file uploaded');
  res.status(201).json({ url: fileUrl(req.file), name: req.file.originalname, size: req.file.size });
}));

// Global search across students, staff, invoices
r.get('/search', authorize(STAFF_ROLES), ah(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ students: [], staff: [] });
  const [students, staff] = await Promise.all([
    prisma.student.findMany({ where: { schoolId: req.schoolId, OR: [{ firstName: contains(q) }, { lastName: contains(q) }, { admissionNo: contains(q) }, { fatherPhone: contains(q) }] }, take: 8, include: { grade: true, section: true } }),
    prisma.staff.findMany({ where: { schoolId: req.schoolId, OR: [{ firstName: contains(q) }, { lastName: contains(q) }, { employeeId: contains(q) }] }, take: 5 }),
  ]);
  res.json({ students, staff });
}));

export default r;
