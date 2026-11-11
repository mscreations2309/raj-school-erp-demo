import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah, badRequest, dayKey } from '../lib/http.js';
import { authorize, requireModule, ADMINS, STAFF_ROLES } from '../lib/auth.js';
import { audit } from '../lib/audit.js';

const r = Router();
r.use(requireModule('attendance'));
const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'];
const MARKERS = [...ADMINS, 'TEACHER'];

function monthRange(month) {
  const [y, m] = String(month).split('-').map(Number);
  if (!y || !m) throw badRequest('month must be YYYY-MM');
  return { from: new Date(Date.UTC(y, m - 1, 1)), to: new Date(Date.UTC(y, m, 0)), days: new Date(Date.UTC(y, m, 0)).getUTCDate() };
}

// ── Students
r.get('/students', authorize(STAFF_ROLES), ah(async (req, res) => {
  const { sectionId } = req.query;
  if (!sectionId) throw badRequest('sectionId is required');
  const date = dayKey(req.query.date || new Date());
  const section = await prisma.section.findFirst({ where: { id: sectionId, schoolId: req.schoolId }, include: { grade: true } });
  if (!section) throw badRequest('Invalid section');
  const students = await prisma.student.findMany({
    where: { sectionId, status: 'ACTIVE' }, orderBy: [{ rollNo: 'asc' }, { firstName: 'asc' }],
    select: { id: true, firstName: true, lastName: true, rollNo: true, admissionNo: true, gender: true, photoUrl: true },
  });
  const records = await prisma.studentAttendance.findMany({ where: { sectionId, date } });
  const map = Object.fromEntries(records.map((x) => [x.studentId, x]));
  const holiday = await prisma.event.findFirst({ where: { schoolId: req.schoolId, type: 'HOLIDAY', startDate: { lte: date }, OR: [{ endDate: { gte: date } }, { endDate: null, startDate: date }] } });
  res.json({
    section, date, holiday, marked: records.length > 0,
    students: students.map((s) => ({ ...s, status: map[s.id]?.status || null, remarks: map[s.id]?.remarks || '' })),
  });
}));

r.post('/students', authorize(MARKERS), ah(async (req, res) => {
  const { sectionId, date, records } = z
    .object({
      sectionId: z.string(),
      date: z.string(),
      records: z.array(z.object({ studentId: z.string(), status: z.enum(STATUSES), remarks: z.string().optional() })).min(1),
    })
    .parse(req.body);
  const day = dayKey(date);
  if (day > dayKey(new Date())) throw badRequest('Cannot mark attendance for a future date');
  const section = await prisma.section.findFirst({ where: { id: sectionId, schoolId: req.schoolId } });
  if (!section) throw badRequest('Invalid section');
  const valid = new Set((await prisma.student.findMany({ where: { sectionId }, select: { id: true } })).map((s) => s.id));
  const ops = records
    .filter((x) => valid.has(x.studentId))
    .map((x) =>
      prisma.studentAttendance.upsert({
        where: { studentId_date: { studentId: x.studentId, date: day } },
        create: { schoolId: req.schoolId, sectionId, studentId: x.studentId, date: day, status: x.status, remarks: x.remarks, markedBy: req.user.name },
        update: { status: x.status, remarks: x.remarks, markedBy: req.user.name },
      }),
    );
  await prisma.$transaction(ops);
  audit(req, 'MARK_ATTENDANCE', 'Section', sectionId, { date, count: ops.length });
  res.json({ saved: ops.length });
}));

r.get('/students/report', authorize(STAFF_ROLES), ah(async (req, res) => {
  const { sectionId, month } = req.query;
  if (!sectionId) throw badRequest('sectionId is required');
  const { from, to, days } = monthRange(month);
  const [students, records] = await Promise.all([
    prisma.student.findMany({ where: { sectionId, schoolId: req.schoolId, status: 'ACTIVE' }, orderBy: [{ rollNo: 'asc' }], select: { id: true, firstName: true, lastName: true, rollNo: true } }),
    prisma.studentAttendance.findMany({ where: { sectionId, schoolId: req.schoolId, date: { gte: from, lte: to } } }),
  ]);
  const grid = {};
  for (const rec of records) (grid[rec.studentId] ||= {})[rec.date.getUTCDate()] = rec.status;
  res.json({
    days,
    rows: students.map((s) => {
      const d = grid[s.id] || {};
      const vals = Object.values(d);
      const present = vals.filter((v) => v === 'PRESENT' || v === 'LATE').length + vals.filter((v) => v === 'HALF_DAY').length * 0.5;
      return { ...s, days: d, present, total: vals.length, percent: vals.length ? Math.round((present / vals.length) * 1000) / 10 : null };
    }),
  });
}));

r.get('/summary', authorize(STAFF_ROLES), ah(async (req, res) => {
  const date = dayKey(req.query.date || new Date());
  const [sections, records, totalStudents] = await Promise.all([
    prisma.section.findMany({ where: { schoolId: req.schoolId }, include: { grade: true, _count: { select: { students: { where: { status: 'ACTIVE' } } } } }, orderBy: [{ grade: { order: 'asc' } }, { name: 'asc' }] }),
    prisma.studentAttendance.groupBy({ by: ['sectionId', 'status'], where: { schoolId: req.schoolId, date }, _count: true }),
    prisma.student.count({ where: { schoolId: req.schoolId, status: 'ACTIVE' } }),
  ]);
  const bySec = {};
  for (const x of records) (bySec[x.sectionId] ||= {})[x.status] = x._count;
  const rows = sections
    .filter((s) => s._count.students > 0)
    .map((s) => ({ sectionId: s.id, name: `${s.grade.name}-${s.name}`, strength: s._count.students, ...(bySec[s.id] || {}), marked: !!bySec[s.id] }));
  const present = records.filter((x) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(x.status)).reduce((a, b) => a + b._count, 0);
  const absent = records.filter((x) => x.status === 'ABSENT').reduce((a, b) => a + b._count, 0);
  res.json({ date, totalStudents, present, absent, markedSections: rows.filter((x) => x.marked).length, totalSections: rows.length, rows });
}));

// ── Staff
r.get('/staff', authorize(ADMINS), ah(async (req, res) => {
  const date = dayKey(req.query.date || new Date());
  const [staff, records] = await Promise.all([
    prisma.staff.findMany({ where: { schoolId: req.schoolId, status: { not: 'RESIGNED' } }, orderBy: { firstName: 'asc' }, select: { id: true, firstName: true, lastName: true, employeeId: true, designation: true, photoUrl: true } }),
    prisma.staffAttendance.findMany({ where: { schoolId: req.schoolId, date } }),
  ]);
  const map = Object.fromEntries(records.map((x) => [x.staffId, x]));
  res.json({ date, staff: staff.map((s) => ({ ...s, status: map[s.id]?.status || null, inTime: map[s.id]?.inTime || '', outTime: map[s.id]?.outTime || '' })) });
}));

r.post('/staff', authorize(ADMINS), ah(async (req, res) => {
  const { date, records } = z
    .object({ date: z.string(), records: z.array(z.object({ staffId: z.string(), status: z.enum(STATUSES), inTime: z.string().optional(), outTime: z.string().optional() })) })
    .parse(req.body);
  const day = dayKey(date);
  const valid = new Set((await prisma.staff.findMany({ where: { schoolId: req.schoolId }, select: { id: true } })).map((s) => s.id));
  const ops = records.filter((x) => valid.has(x.staffId)).map((x) =>
    prisma.staffAttendance.upsert({
      where: { staffId_date: { staffId: x.staffId, date: day } },
      create: { schoolId: req.schoolId, staffId: x.staffId, date: day, status: x.status, inTime: x.inTime, outTime: x.outTime },
      update: { status: x.status, inTime: x.inTime, outTime: x.outTime },
    }),
  );
  await prisma.$transaction(ops);
  res.json({ saved: ops.length });
}));

r.get('/staff/report', authorize(ADMINS), ah(async (req, res) => {
  const { from, to, days } = monthRange(req.query.month);
  const [staff, records] = await Promise.all([
    prisma.staff.findMany({ where: { schoolId: req.schoolId, status: { not: 'RESIGNED' } }, orderBy: { firstName: 'asc' }, select: { id: true, firstName: true, lastName: true, employeeId: true, designation: true } }),
    prisma.staffAttendance.findMany({ where: { schoolId: req.schoolId, date: { gte: from, lte: to } } }),
  ]);
  const grid = {};
  for (const rec of records) (grid[rec.staffId] ||= {})[rec.date.getUTCDate()] = rec.status;
  res.json({
    days,
    rows: staff.map((s) => {
      const d = grid[s.id] || {};
      const vals = Object.values(d);
      return { ...s, days: d, present: vals.filter((v) => v !== 'ABSENT' && v !== 'LEAVE').length, absent: vals.filter((v) => v === 'ABSENT').length, leave: vals.filter((v) => v === 'LEAVE').length };
    }),
  });
}));

export default r;
