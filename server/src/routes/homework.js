// Homework workflow: student submits → teacher evaluates (marks / grade / feedback / checked copy)
// → teacher publishes to student & parent → parent acknowledges.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah, notFound, badRequest, forbidden, parseJSON } from '../lib/http.js';
import { authorize, requireModule, ADMINS } from '../lib/auth.js';
import { upload, saveUpload } from '../lib/upload.js';
import { audit } from '../lib/audit.js';
import { evaluateSubmission, aiEnabled } from '../lib/ai.js';

const TEACH = [...ADMINS, 'TEACHER'];
const FAMILY = ['PARENT', 'STUDENT'];
const hist = (s, item) => JSON.stringify([...parseJSON(s?.history, []), { ...item, at: new Date() }]);

/** Teachers may only work on homework of classes/subjects they handle. */
async function loadHomework(req, id) {
  const hw = await prisma.homework.findFirst({ where: { id, schoolId: req.schoolId }, include: { subject: true, section: { include: { grade: true } } } });
  if (!hw) throw notFound('Homework not found');
  if (req.user.role === 'TEACHER') {
    const me = await prisma.staff.findFirst({ where: { userId: req.user.id } });
    const allowed = me && (hw.teacherId === me.id || hw.section.classTeacherId === me.id
      || (await prisma.sectionSubject.count({ where: { sectionId: hw.sectionId, subjectId: hw.subjectId, teacherId: me.id } })) > 0);
    if (!allowed) throw forbidden('This homework belongs to another teacher');
  }
  return hw;
}

const view = (s) => s && ({ ...s, files: parseJSON(s.files, []), checkedFiles: parseJSON(s.checkedFiles, []), history: parseJSON(s.history, []), annotations: parseJSON(s.annotations, {}), aiEvaluation: parseJSON(s.aiEvaluation, null) });
/** What students/parents may see: never the AI draft, private annotations data or the answer key. */
const familyView = (s) => { if (!s) return s; const v = view(s); delete v.aiEvaluation; delete v.annotations; delete v.aiAssisted; return v; };

// ───────── Teacher side ─────────
export const teacherRoutes = Router();

teacherRoutes.get('/homework/:id/submissions', requireModule('homework'), authorize(TEACH), ah(async (req, res) => {
  const hw = await loadHomework(req, req.params.id);
  const [students, subs] = await Promise.all([
    prisma.student.findMany({ where: { sectionId: hw.sectionId, status: 'ACTIVE' }, orderBy: [{ rollNo: 'asc' }], select: { id: true, firstName: true, lastName: true, rollNo: true, admissionNo: true, photoUrl: true } }),
    prisma.homeworkSubmission.findMany({ where: { homeworkId: hw.id } }),
  ]);
  const map = Object.fromEntries(subs.map((s) => [s.studentId, view(s)]));
  const rows = students.map((st) => ({ student: st, submission: map[st.id] || null }));
  const count = (f) => rows.filter(f).length;
  res.json({
    homework: hw, rows,
    stats: {
      total: rows.length, submitted: count((r) => r.submission), notSubmitted: count((r) => !r.submission), late: count((r) => r.submission?.isLate),
      evaluated: count((r) => ['EVALUATED', 'PUBLISHED'].includes(r.submission?.status)), published: count((r) => r.submission?.status === 'PUBLISHED'),
      acknowledged: count((r) => r.submission?.parentAckAt),
    },
  });
}));

const evalSchema = z.object({
  marks: z.union([z.coerce.number().min(0), z.literal(''), z.null()]).optional(),
  grade: z.string().max(10).optional().nullable(),
  feedback: z.string().max(4000).optional().nullable(),
  checkedFiles: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
  publish: z.boolean().optional(),
  aiAssisted: z.boolean().optional(),
});

async function loadSubmission(req, id) {
  const s = await prisma.homeworkSubmission.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!s) throw notFound('Submission not found');
  const hw = await loadHomework(req, s.homeworkId);
  return { s, hw };
}

teacherRoutes.put('/homework-submissions/:id/evaluate', requireModule('homework'), authorize(TEACH), ah(async (req, res) => {
  const { s, hw } = await loadSubmission(req, req.params.id);
  const d = evalSchema.parse(req.body);
  const marks = d.marks === '' || d.marks == null ? null : Number(d.marks);
  if (marks != null && hw.maxMarks != null && marks > hw.maxMarks) throw badRequest(`Marks cannot exceed ${hw.maxMarks}`);
  const publishing = d.publish === true;
  const updated = await prisma.homeworkSubmission.update({
    where: { id: s.id },
    data: {
      marks, grade: d.grade || null, feedback: d.feedback || null,
      ...(d.checkedFiles && { checkedFiles: JSON.stringify(d.checkedFiles) }),
      ...(d.aiAssisted && { aiAssisted: true }),
      status: publishing || s.status === 'PUBLISHED' ? 'PUBLISHED' : 'EVALUATED',
      evaluatedById: req.user.id, evaluatedByName: req.user.name, evaluatedAt: new Date(),
      ...(publishing && !s.publishedAt && { publishedAt: new Date() }),
      history: hist(s, { action: publishing ? 'EVALUATED_AND_PUBLISHED' : 'EVALUATED', by: req.user.name, marks, grade: d.grade }),
    },
  });
  if (publishing && s.status !== 'PUBLISHED') await notifyPublished(req, [updated], hw);
  audit(req, 'EVALUATE_HOMEWORK', 'HomeworkSubmission', s.id, { marks, grade: d.grade, publish: publishing });
  res.json(view(updated));
}));

/** Autosave of the teacher's annotations (pen, highlight, ticks…) — "saved to cloud". */
teacherRoutes.put('/homework-submissions/:id/annotations', requireModule('homework'), authorize(TEACH), ah(async (req, res) => {
  const { s } = await loadSubmission(req, req.params.id);
  const annotations = req.body?.annotations;
  if (!annotations || typeof annotations !== 'object') throw badRequest('annotations object required');
  const json = JSON.stringify(annotations);
  if (json.length > 2_000_000) throw badRequest('Too many annotations on this submission');
  await prisma.homeworkSubmission.update({ where: { id: s.id }, data: { annotations: json } });
  res.json({ ok: true, savedAt: new Date() });
}));

teacherRoutes.get('/ai/status', authorize(TEACH), (_req, res) => res.json({ enabled: aiEnabled(), model: 'Claude' }));

/** Claude AI evaluation → saved as a suggestion; the teacher reviews before publishing. */
teacherRoutes.post('/homework-submissions/:id/ai-evaluate', requireModule('homework'), authorize(TEACH), ah(async (req, res) => {
  const { s, hw } = await loadSubmission(req, req.params.id);
  const st = await prisma.student.findUnique({ where: { id: s.studentId }, include: { grade: true, section: true } });
  const result = await evaluateSubmission({ homework: hw, submission: s, student: { className: `${st.grade?.name || ''}-${st.section?.name || ''}` } });
  const updated = await prisma.homeworkSubmission.update({
    where: { id: s.id },
    data: { aiEvaluation: JSON.stringify(result), aiEvaluatedAt: new Date(), history: hist(s, { action: 'AI_EVALUATED', by: `Claude AI (requested by ${req.user.name})`, marks: result.suggestedMarks, grade: result.suggestedGrade }) },
  });
  audit(req, 'AI_EVALUATE_HOMEWORK', 'HomeworkSubmission', s.id, { marks: result.suggestedMarks, grade: result.suggestedGrade, model: result.model });
  res.json(view(updated));
}));

teacherRoutes.post('/homework-submissions/:id/resubmit', requireModule('homework'), authorize(TEACH), ah(async (req, res) => {
  const { s } = await loadSubmission(req, req.params.id);
  const { feedback } = z.object({ feedback: z.string().min(3, 'Tell the student what to correct') }).parse(req.body);
  const updated = await prisma.homeworkSubmission.update({
    where: { id: s.id },
    data: { status: 'RESUBMIT', feedback, evaluatedById: req.user.id, evaluatedByName: req.user.name, evaluatedAt: new Date(), history: hist(s, { action: 'RESUBMISSION_REQUESTED', by: req.user.name, note: feedback }) },
  });
  res.json(view(updated));
}));

/** Publish all evaluated submissions of a homework (or a given list) to students & parents. */
teacherRoutes.post('/homework/:id/publish', requireModule('homework'), authorize(TEACH), ah(async (req, res) => {
  const hw = await loadHomework(req, req.params.id);
  const ids = Array.isArray(req.body?.submissionIds) ? req.body.submissionIds : null;
  const subs = await prisma.homeworkSubmission.findMany({ where: { homeworkId: hw.id, status: 'EVALUATED', ...(ids && { id: { in: ids } }) } });
  if (!subs.length) throw badRequest('Nothing to publish — evaluate some submissions first');
  const now = new Date();
  for (const s of subs) {
    await prisma.homeworkSubmission.update({ where: { id: s.id }, data: { status: 'PUBLISHED', publishedAt: now, history: hist(s, { action: 'PUBLISHED', by: req.user.name }) } });
  }
  await notifyPublished(req, subs, hw);
  audit(req, 'PUBLISH_HOMEWORK_RESULTS', 'Homework', hw.id, { count: subs.length });
  res.json({ published: subs.length });
}));

/** In-app message to the student and parent when an evaluation is published. */
async function notifyPublished(req, subs, hw) {
  const students = await prisma.student.findMany({ where: { id: { in: subs.map((s) => s.studentId) } }, select: { id: true, firstName: true, userId: true, parentUserId: true } });
  const data = [];
  for (const st of students) {
    const s = subs.find((x) => x.studentId === st.id);
    const score = [s.marks != null ? `${s.marks}${hw.maxMarks ? `/${hw.maxMarks}` : ''} marks` : null, s.grade ? `grade ${s.grade}` : null].filter(Boolean).join(', ');
    const body = `${hw.subject?.name || 'Homework'} — "${hw.title}" has been checked${score ? `: ${score}` : ''}.${s.feedback ? `\nTeacher's feedback: ${s.feedback}` : ''}\nPlease open Homework in the portal${st.parentUserId ? ' — parents, kindly acknowledge.' : '.'}`;
    for (const uid of [st.userId, st.parentUserId].filter(Boolean)) {
      data.push({ schoolId: req.schoolId, senderId: req.user.id, recipientId: uid, audience: 'INDIVIDUAL', channel: 'APP', subject: `Homework checked: ${st.firstName} — ${hw.title}`, body });
    }
  }
  if (data.length) await prisma.message.createMany({ data });
}

// ───────── Student / parent side (mounted under /portal) ─────────
export const familyRoutes = Router();

async function ownStudent(req, studentId) {
  const s = await prisma.student.findFirst({ where: { id: studentId, schoolId: req.schoolId } });
  if (!s) throw notFound('Student not found');
  const ok = req.user.role === 'SUPER_ADMIN' || (req.user.role === 'PARENT' && s.parentUserId === req.user.id) || (req.user.role === 'STUDENT' && s.userId === req.user.id);
  if (!ok) throw forbidden();
  return s;
}

familyRoutes.get('/student/:id/homework', authorize(FAMILY), ah(async (req, res) => {
  const st = await ownStudent(req, req.params.id);
  if (!st.sectionId) return res.json({ items: [] });
  const list = await prisma.homework.findMany({
    where: { sectionId: st.sectionId }, orderBy: { dueDate: 'desc' }, take: 60,
    include: { subject: true, teacher: { select: { firstName: true, lastName: true } }, submissions: { where: { studentId: st.id } } },
  });
  res.json({
    items: list.map(({ submissions, answerKey, ...hw }) => {
      const s = familyView(submissions[0]);
      // Marks / grade / feedback stay hidden until the teacher publishes (except resubmission requests)
      if (s && !['PUBLISHED', 'RESUBMIT'].includes(s.status)) { s.marks = null; s.grade = null; s.feedback = null; s.checkedFiles = []; }
      return { ...hw, submission: s || null, overdue: !s && hw.allowSubmission && new Date(hw.dueDate) < new Date() };
    }),
  });
}));

familyRoutes.post('/homework/:hwId/submit', authorize(FAMILY), upload.array('files', 6), ah(async (req, res) => {
  const { studentId, text } = req.body;
  const st = await ownStudent(req, studentId);
  const hw = await prisma.homework.findFirst({ where: { id: req.params.hwId, schoolId: req.schoolId, sectionId: st.sectionId } });
  if (!hw) throw notFound('Homework not found');
  if (!hw.allowSubmission) throw badRequest('Online submission is not enabled for this homework');
  const existing = await prisma.homeworkSubmission.findUnique({ where: { homeworkId_studentId: { homeworkId: hw.id, studentId: st.id } } });
  if (existing && ['EVALUATED', 'PUBLISHED'].includes(existing.status)) throw badRequest('Already checked by the teacher — submission is closed');
  const files = [];
  for (const f of req.files || []) files.push({ name: f.originalname, url: await saveUpload(req, f) });
  if (!files.length && !String(text || '').trim()) throw badRequest('Write your answer or attach at least one file');
  const now = new Date();
  const isLate = now > new Date(new Date(hw.dueDate).getTime() + 864e5 - 1);
  const data = { text: text || null, files: JSON.stringify(files), submittedAt: now, submittedBy: req.user.name, submittedByRole: req.user.role, isLate, status: 'SUBMITTED' };
  const sub = existing
    ? await prisma.homeworkSubmission.update({ where: { id: existing.id }, data: { ...data, attempts: existing.attempts + 1, history: hist(existing, { action: 'RESUBMITTED', by: req.user.name, role: req.user.role, late: isLate }) } })
    : await prisma.homeworkSubmission.create({ data: { ...data, schoolId: req.schoolId, homeworkId: hw.id, studentId: st.id, history: hist(null, { action: 'SUBMITTED', by: req.user.name, role: req.user.role, late: isLate }) } });
  res.status(201).json(familyView(sub));
}));

familyRoutes.post('/submissions/:id/acknowledge', authorize('PARENT'), ah(async (req, res) => {
  const s = await prisma.homeworkSubmission.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!s) throw notFound();
  await ownStudent(req, s.studentId);
  if (s.status !== 'PUBLISHED') throw badRequest('The teacher has not published this evaluation yet');
  if (s.parentAckAt) return res.json(familyView(s));
  const note = String(req.body?.note || '').slice(0, 1000) || null;
  const updated = await prisma.homeworkSubmission.update({
    where: { id: s.id },
    data: { parentAckAt: new Date(), parentAckById: req.user.id, parentAckByName: req.user.name, parentAckNote: note, history: hist(s, { action: 'PARENT_ACKNOWLEDGED', by: req.user.name, note }) },
  });
  res.json(familyView(updated));
}));
