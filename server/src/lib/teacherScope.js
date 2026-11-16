// What a teacher is allowed to work on. Admins / principal / other staff are not restricted here.
import { prisma } from './prisma.js';
import { forbidden } from './http.js';

export const isTeacher = (req) => req.user?.role === 'TEACHER';

/** Cached per request: { staff, pairs: [{sectionId, subjectId}], classSectionIds, sectionIds } */
export async function teacherScope(req) {
  if (req._teacherScope) return req._teacherScope;
  const staff = await prisma.staff.findFirst({ where: { userId: req.user.id, schoolId: req.schoolId } });
  const [pairs, classSections] = staff
    ? await Promise.all([
      prisma.sectionSubject.findMany({ where: { teacherId: staff.id, schoolId: req.schoolId }, select: { sectionId: true, subjectId: true } }),
      prisma.section.findMany({ where: { classTeacherId: staff.id, schoolId: req.schoolId }, select: { id: true } }),
    ])
    : [[], []];
  const classSectionIds = classSections.map((s) => s.id);
  const sectionIds = [...new Set([...pairs.map((p) => p.sectionId), ...classSectionIds])];
  return (req._teacherScope = { staff, pairs, classSectionIds, sectionIds });
}

export async function teachesPair(req, sectionId, subjectId) {
  if (!isTeacher(req)) return true;
  const { pairs } = await teacherScope(req);
  return pairs.some((p) => p.sectionId === sectionId && p.subjectId === subjectId);
}

export async function assertPair(req, sectionId, subjectId) {
  if (!(await teachesPair(req, sectionId, subjectId))) throw forbidden('You do not teach this subject in this class');
}

/** Class teacher or subject teacher of the section. */
export async function assertSection(req, sectionId) {
  if (!isTeacher(req)) return;
  const { sectionIds } = await teacherScope(req);
  if (!sectionIds.includes(sectionId)) throw forbidden('This class is not assigned to you');
}

/** Prisma where for homework a teacher may see: their subjects in their classes, or homework they created. */
export async function homeworkWhere(req) {
  if (!isTeacher(req)) return {};
  const { staff, pairs } = await teacherScope(req);
  if (!staff) return { id: '__none__' };
  return { OR: [{ teacherId: staff.id }, ...pairs.map((p) => ({ sectionId: p.sectionId, subjectId: p.subjectId }))] };
}
