import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah, notFound, badRequest, forbidden, parseJSON } from '../lib/http.js';
import { authorize, requireModule, ADMINS, STAFF_ROLES } from '../lib/auth.js';
import { audit } from '../lib/audit.js';

const r = Router();
r.use(requireModule('exams'));

export function gradeFor(percent, scale) {
  if (percent == null) return null;
  const s = (scale && scale.length ? scale : [{ min: 33, grade: 'P' }, { min: 0, grade: 'F' }]).slice().sort((a, b) => b.min - a.min);
  return (s.find((x) => percent >= x.min) || s[s.length - 1]).grade;
}
const scaleOf = (school) => parseJSON(school?.settings, {}).gradeScale;

r.get('/marks', authorize(STAFF_ROLES), ah(async (req, res) => {
  const { examId, sectionId, subjectId } = req.query;
  if (!examId || !sectionId || !subjectId) throw badRequest('examId, sectionId and subjectId are required');
  const section = await prisma.section.findFirst({ where: { id: sectionId, schoolId: req.schoolId } });
  if (!section) throw badRequest('Invalid section');
  const [students, marks, schedule] = await Promise.all([
    prisma.student.findMany({ where: { sectionId, status: 'ACTIVE' }, orderBy: [{ rollNo: 'asc' }], select: { id: true, firstName: true, lastName: true, rollNo: true, admissionNo: true } }),
    prisma.mark.findMany({ where: { examId, subjectId, schoolId: req.schoolId, student: { sectionId } } }),
    prisma.examSchedule.findFirst({ where: { examId, subjectId, gradeId: section.gradeId, schoolId: req.schoolId } }),
  ]);
  const map = Object.fromEntries(marks.map((m) => [m.studentId, m]));
  res.json({
    maxMarks: schedule?.maxMarks ?? 100, passMarks: schedule?.passMarks ?? 33,
    rows: students.map((s) => ({ ...s, marksObtained: map[s.id]?.marksObtained ?? null, isAbsent: map[s.id]?.isAbsent ?? false, remarks: map[s.id]?.remarks ?? '' })),
  });
}));

r.post('/marks', authorize([...ADMINS, 'TEACHER']), ah(async (req, res) => {
  const d = z.object({
    examId: z.string(), subjectId: z.string(), sectionId: z.string(), maxMarks: z.coerce.number().positive().default(100),
    records: z.array(z.object({ studentId: z.string(), marksObtained: z.union([z.number(), z.string(), z.null()]).optional(), isAbsent: z.boolean().optional(), remarks: z.string().optional() })),
  }).parse(req.body);
  const exam = await prisma.exam.findFirst({ where: { id: d.examId, schoolId: req.schoolId } });
  if (!exam) throw badRequest('Invalid exam');
  if (exam.isPublished && !ADMINS.includes(req.user.role) && req.user.role !== 'SUPER_ADMIN') throw forbidden('Results are published. Ask admin to unpublish to edit marks.');
  const valid = new Set((await prisma.student.findMany({ where: { sectionId: d.sectionId, schoolId: req.schoolId }, select: { id: true } })).map((s) => s.id));
  const scale = scaleOf(req.school);
  const ops = [];
  for (const rec of d.records) {
    if (!valid.has(rec.studentId)) continue;
    const raw = rec.marksObtained === '' || rec.marksObtained == null ? null : Number(rec.marksObtained);
    if (raw != null && (Number.isNaN(raw) || raw < 0 || raw > d.maxMarks)) throw badRequest(`Marks must be between 0 and ${d.maxMarks}`);
    const grade = rec.isAbsent ? 'AB' : raw == null ? null : gradeFor((raw / d.maxMarks) * 100, scale);
    const data = { marksObtained: rec.isAbsent ? null : raw, maxMarks: d.maxMarks, isAbsent: !!rec.isAbsent, remarks: rec.remarks, grade };
    ops.push(prisma.mark.upsert({
      where: { examId_studentId_subjectId: { examId: d.examId, studentId: rec.studentId, subjectId: d.subjectId } },
      create: { schoolId: req.schoolId, examId: d.examId, studentId: rec.studentId, subjectId: d.subjectId, ...data },
      update: data,
    }));
  }
  await prisma.$transaction(ops);
  audit(req, 'ENTER_MARKS', 'Exam', d.examId, { subjectId: d.subjectId, sectionId: d.sectionId, count: ops.length });
  res.json({ saved: ops.length });
}));

/** Tabulation sheet for a section: every student × subject, totals and rank. */
export async function tabulate(schoolId, examId, sectionId, scale) {
  const [students, marks] = await Promise.all([
    prisma.student.findMany({ where: { sectionId, schoolId, status: { in: ['ACTIVE', 'TC_ISSUED'] } }, orderBy: [{ rollNo: 'asc' }], select: { id: true, firstName: true, lastName: true, rollNo: true, admissionNo: true } }),
    prisma.mark.findMany({ where: { examId, schoolId, student: { sectionId } }, include: { subject: true } }),
  ]);
  const subjects = [...new Map(marks.map((m) => [m.subjectId, m.subject])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const rows = students.map((s) => {
    const mine = marks.filter((m) => m.studentId === s.id);
    const obtained = mine.reduce((a, m) => a + (m.marksObtained || 0), 0);
    const max = mine.reduce((a, m) => a + m.maxMarks, 0);
    const percent = max ? Math.round((obtained / max) * 1000) / 10 : null;
    const failed = mine.some((m) => m.isAbsent || (m.marksObtained ?? 0) < m.maxMarks * 0.33);
    return { ...s, marks: Object.fromEntries(mine.map((m) => [m.subjectId, m])), obtained, max, percent, grade: gradeFor(percent, scale), result: !mine.length ? '-' : failed ? 'NEEDS IMPROVEMENT' : 'PASS' };
  });
  const ranked = rows.filter((x) => x.percent != null).sort((a, b) => b.percent - a.percent);
  ranked.forEach((x, i) => { x.rank = i > 0 && ranked[i - 1].percent === x.percent ? ranked[i - 1].rank : i + 1; });
  return { subjects, rows };
}

r.get('/results', authorize(STAFF_ROLES), ah(async (req, res) => {
  const { examId, sectionId } = req.query;
  if (!examId || !sectionId) throw badRequest('examId and sectionId are required');
  const data = await tabulate(req.schoolId, examId, sectionId, scaleOf(req.school));
  const n = data.rows.filter((x) => x.percent != null);
  res.json({
    ...data,
    summary: {
      appeared: n.length,
      passed: n.filter((x) => x.result === 'PASS').length,
      average: n.length ? Math.round((n.reduce((a, b) => a + b.percent, 0) / n.length) * 10) / 10 : null,
      topper: n.sort((a, b) => b.percent - a.percent)[0] || null,
    },
  });
}));

/** Report card. Parents/students may only access their own child's published results. */
export async function buildReportCard(req, studentId, examId) {
  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId: req.schoolId }, include: { grade: true, section: true } });
  if (!student) throw notFound('Student not found');
  if (req.user.role === 'PARENT' && student.parentUserId !== req.user.id) throw forbidden();
  if (req.user.role === 'STUDENT' && student.userId !== req.user.id) throw forbidden();
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId }, include: { academicYear: true } });
  if (!exam) throw notFound('Exam not found');
  if (['PARENT', 'STUDENT'].includes(req.user.role) && !exam.isPublished) throw forbidden('Result not yet published');
  const scale = scaleOf(req.school);
  const { rows, subjects } = await tabulate(req.schoolId, examId, student.sectionId, scale);
  const me = rows.find((x) => x.id === student.id);
  const att = await prisma.studentAttendance.groupBy({ by: ['status'], where: { studentId, date: { gte: exam.academicYear.startDate, lte: exam.endDate } }, _count: true });
  const a = Object.fromEntries(att.map((x) => [x.status, x._count]));
  const total = Object.values(a).reduce((x, y) => x + y, 0);
  const { settings, ...school } = req.school;
  return {
    school, exam, student, subjects,
    marks: subjects.map((s) => ({ subject: s.name, ...(me?.marks[s.id] || {}) })),
    obtained: me?.obtained, max: me?.max, percent: me?.percent, grade: me?.grade, rank: me?.rank, result: me?.result, classSize: rows.length,
    attendance: { present: (a.PRESENT || 0) + (a.LATE || 0) + (a.HALF_DAY || 0), total },
    gradeScale: scale,
  };
}

r.get('/report-card', authorize(STAFF_ROLES), ah(async (req, res) => {
  const { examId, studentId } = req.query;
  if (!examId || !studentId) throw badRequest('examId and studentId are required');
  res.json(await buildReportCard(req, studentId, examId));
}));

export default r;
