// Self-service portals: Parent / Student and Teacher.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah, notFound, forbidden, badRequest, parseJSON, dayKey } from '../lib/http.js';
import { authorize } from '../lib/auth.js';
import { buildReportCard } from './exams.js';
import { recordPayment, receiptData, demoGatewayRef } from './fees.js';
import { audit } from '../lib/audit.js';

const r = Router();
const FAMILY = ['PARENT', 'STUDENT'];

async function ownStudent(req, id) {
  const s = await prisma.student.findFirst({
    where: { id, schoolId: req.schoolId },
    include: {
      grade: true,
      section: { include: { classTeacher: { select: { firstName: true, lastName: true, phone: true, email: true } } } },
      transportStop: { include: { route: { include: { vehicle: true } } } },
      hostelAllocations: { where: { isActive: true }, include: { room: { include: { hostel: true } } } },
    },
  });
  if (!s) throw notFound('Student not found');
  const ok = req.user.role === 'SUPER_ADMIN' || (req.user.role === 'PARENT' && s.parentUserId === req.user.id) || (req.user.role === 'STUDENT' && s.userId === req.user.id);
  if (!ok) throw forbidden();
  return s;
}

r.get('/children', authorize(FAMILY), ah(async (req, res) => {
  const where = req.user.role === 'PARENT' ? { parentUserId: req.user.id } : { userId: req.user.id };
  const items = await prisma.student.findMany({ where: { ...where, schoolId: req.schoolId, status: { not: 'LEFT' } }, include: { grade: true, section: true }, orderBy: { dob: 'asc' } });
  res.json({ items });
}));

r.get('/student/:id', authorize(FAMILY), ah(async (req, res) => {
  const s = await ownStudent(req, req.params.id);
  const now = new Date();
  const year = await prisma.academicYear.findFirst({ where: { schoolId: req.schoolId, isCurrent: true } });
  const [att, invoices, exams, homework, timetable, notices, events, books] = await Promise.all([
    prisma.studentAttendance.groupBy({ by: ['status'], where: { studentId: s.id, ...(year && { date: { gte: year.startDate, lte: year.endDate } }) }, _count: true }),
    prisma.feeInvoice.findMany({ where: { studentId: s.id, status: { not: 'CANCELLED' } }, orderBy: { period: 'desc' }, include: { payments: { orderBy: { paidAt: 'desc' } } } }),
    prisma.exam.findMany({ where: { schoolId: req.schoolId, isPublished: true, marks: { some: { studentId: s.id } } }, orderBy: { startDate: 'desc' } }),
    s.sectionId ? prisma.homework.findMany({ where: { sectionId: s.sectionId, dueDate: { gte: new Date(now.getTime() - 14 * 864e5) } }, orderBy: { dueDate: 'asc' }, include: { subject: true, teacher: { select: { firstName: true, lastName: true } } } }) : [],
    s.sectionId ? prisma.timetableSlot.findMany({ where: { sectionId: s.sectionId }, orderBy: [{ day: 'asc' }, { period: 'asc' }], include: { subject: true, teacher: { select: { firstName: true, lastName: true } } } }) : [],
    prisma.notice.findMany({ where: { schoolId: req.schoolId, audience: { in: ['ALL', 'PARENTS', 'STUDENTS'] }, publishDate: { lte: now } }, orderBy: [{ isPinned: 'desc' }, { publishDate: 'desc' }], take: 10 }),
    prisma.event.findMany({ where: { schoolId: req.schoolId, startDate: { gte: dayKey(now) } }, orderBy: { startDate: 'asc' }, take: 8 }),
    prisma.bookIssue.findMany({ where: { studentId: s.id, status: 'ISSUED' }, include: { book: true } }),
  ]);
  const a = Object.fromEntries(att.map((x) => [x.status, x._count]));
  const total = Object.values(a).reduce((x, y) => x + y, 0);
  const present = (a.PRESENT || 0) + (a.LATE || 0) + (a.HALF_DAY || 0) * 0.5;
  const due = invoices.reduce((x, i) => x + (i.total - i.paid), 0);
  res.json({
    student: s,
    attendance: { ...a, total, percent: total ? Math.round((present / total) * 1000) / 10 : null },
    fees: { due, invoices: invoices.map((i) => ({ ...i, items: parseJSON(i.items, []) })) },
    exams, homework, timetable, notices, events, books,
  });
}));

r.get('/student/:id/attendance', authorize(FAMILY), ah(async (req, res) => {
  const s = await ownStudent(req, req.params.id);
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  const [y, m] = month.split('-').map(Number);
  const items = await prisma.studentAttendance.findMany({ where: { studentId: s.id, date: { gte: new Date(Date.UTC(y, m - 1, 1)), lte: new Date(Date.UTC(y, m, 0)) } }, orderBy: { date: 'asc' } });
  res.json({ month, items: items.map((x) => ({ date: x.date.toISOString().slice(0, 10), status: x.status, remarks: x.remarks })) });
}));

r.get('/student/:id/report-card', authorize(FAMILY), ah(async (req, res) => {
  await ownStudent(req, req.params.id);
  if (!req.query.examId) throw badRequest('examId is required');
  res.json(await buildReportCard(req, req.params.id, String(req.query.examId)));
}));

/** Demo online payment (simulates Razorpay/UPI success). */
r.post('/pay/:invoiceId', authorize(FAMILY), ah(async (req, res) => {
  const inv = await prisma.feeInvoice.findFirst({ where: { id: req.params.invoiceId, schoolId: req.schoolId } });
  if (!inv) throw notFound();
  await ownStudent(req, inv.studentId);
  const { method } = z.object({ method: z.enum(['UPI', 'CARD', 'ONLINE']).default('UPI') }).parse(req.body || {});
  const payment = await recordPayment({ schoolId: req.schoolId, school: req.school, invoiceId: inv.id, amount: inv.total - inv.paid, method, reference: demoGatewayRef(), remarks: 'Paid online via parent portal', collectedBy: 'Online' });
  audit(req, 'ONLINE_FEE_PAYMENT', 'FeePayment', payment.id, { amount: payment.amount });
  res.json(payment);
}));

r.get('/receipt/:paymentId', authorize(FAMILY), ah(async (req, res) => {
  const data = await receiptData(req.schoolId, req.params.paymentId);
  await ownStudent(req, data.studentId);
  res.json(data);
}));

r.post('/leave', authorize(FAMILY), ah(async (req, res) => {
  const d = z.object({ studentId: z.string(), fromDate: z.string(), toDate: z.string(), reason: z.string().min(3) }).parse(req.body);
  await ownStudent(req, d.studentId);
  if (new Date(d.toDate) < new Date(d.fromDate)) throw badRequest('To date must be after from date');
  const l = await prisma.leaveRequest.create({ data: { schoolId: req.schoolId, studentId: d.studentId, type: 'OTHER', fromDate: new Date(d.fromDate), toDate: new Date(d.toDate), reason: d.reason } });
  res.status(201).json(l);
}));

r.get('/student/:id/leaves', authorize(FAMILY), ah(async (req, res) => {
  await ownStudent(req, req.params.id);
  res.json({ items: await prisma.leaveRequest.findMany({ where: { studentId: req.params.id }, orderBy: { createdAt: 'desc' } }) });
}));

// ───────── Teacher ─────────
r.get('/teacher', authorize('TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN'), ah(async (req, res) => {
  const me = await prisma.staff.findFirst({ where: { userId: req.user.id, schoolId: req.schoolId } });
  if (!me) return res.json({ staff: null, classSections: [], subjectSections: [], today: [], homework: [] });
  const today = dayKey(new Date());
  const dow = new Date().getDay() || 7;
  const [classSections, subjectSections, todaySlots, homework, leaves] = await Promise.all([
    prisma.section.findMany({ where: { classTeacherId: me.id }, include: { grade: true, _count: { select: { students: { where: { status: 'ACTIVE' } } } } } }),
    prisma.sectionSubject.findMany({ where: { teacherId: me.id }, include: { subject: true, section: { include: { grade: true } } } }),
    prisma.timetableSlot.findMany({ where: { teacherId: me.id, day: dow }, orderBy: { period: 'asc' }, include: { subject: true, section: { include: { grade: true } } } }),
    prisma.homework.findMany({ where: { teacherId: me.id }, orderBy: { assignedDate: 'desc' }, take: 8, include: { subject: true, section: { include: { grade: true } } } }),
    prisma.leaveRequest.findMany({ where: { staffId: me.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);
  const marked = await prisma.studentAttendance.groupBy({ by: ['sectionId'], where: { date: today, sectionId: { in: classSections.map((c) => c.id) } }, _count: true });
  const markedSet = new Set(marked.map((m) => m.sectionId));
  res.json({
    staff: me,
    classSections: classSections.map((c) => ({ ...c, attendanceMarked: markedSet.has(c.id) })),
    subjectSections, today: todaySlots, homework, leaves,
  });
}));

export default r;
