// Teacher scoping test: a teacher only sees/edits homework, marks, attendance and results of their own classes/subjects.
// Run with the API running: node scripts/teacher-scope-test.js
const BASE = process.env.API || 'http://localhost:5000/api';
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? '✔' : '✘'} ${m}`); };
async function call(method, path, token, body) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
  let data; try { data = await r.json(); } catch { data = null; }
  return { status: r.status, data };
}
const tok = async (email, password) => (await call('POST', '/auth/login', null, { email, password })).data?.token;

(async () => {
  const admin = await tok('admin@rajschool.in', 'Admin@123');
  // Two teachers who teach different things: give both a login
  const ss = (await call('GET', '/section-subjects?all=1', admin)).data.items.filter((x) => x.teacherId);
  const byTeacher = {};
  ss.forEach((x) => (byTeacher[x.teacherId] ||= []).push(x));
  const [tA, tB] = Object.keys(byTeacher).filter((id) => byTeacher[id].length >= 2).slice(0, 2);
  const lA = (await call('POST', `/staff/${tA}/login`, admin, { role: 'TEACHER', password: 'Scope@123' })).data;
  const lB = (await call('POST', `/staff/${tB}/login`, admin, { role: 'TEACHER', password: 'Scope@123' })).data;
  const A = await tok(lA.email, 'Scope@123');
  const B = await tok(lB.email, 'Scope@123');
  const pairA = byTeacher[tA][0];
  const pairB = byTeacher[tB].find((p) => !byTeacher[tA].some((q) => q.sectionId === p.sectionId && q.subjectId === p.subjectId));
  console.log(`Teacher A: ${pairA.teacher.firstName} (${byTeacher[tA].length} class-subjects) • Teacher B: ${pairB.teacher.firstName}`);

  console.log('1. Homework list');
  const allCount = (await call('GET', '/homework?pageSize=500', admin)).data.total;
  const listA = (await call('GET', '/homework?pageSize=500', A)).data.items;
  const ownA = listA.every((h) => h.teacherId === tA || byTeacher[tA].some((p) => p.sectionId === h.sectionId && p.subjectId === h.subjectId));
  ok(listA.length < allCount && ownA, `teacher A sees ${listA.length} of ${allCount} homework — all their own subjects`);
  const ssA = (await call('GET', '/section-subjects?all=1', A)).data.items;
  ok(ssA.length === byTeacher[tA].length && ssA.every((x) => x.teacherId === tA), 'teacher A sees only their class-subject assignments');

  console.log('2. Create');
  const due = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
  const own = await call('POST', '/homework', A, { sectionId: pairA.sectionId, subjectId: pairA.subjectId, title: 'Scope test own', dueDate: due, teacherId: tB });
  ok(own.status === 201 && own.data.teacherId === tA, 'A creates homework for own class/subject (teacher forced to A)');
  const other = await call('POST', '/homework', A, { sectionId: pairB.sectionId, subjectId: pairB.subjectId, title: 'Scope test other', dueDate: due });
  ok(other.status === 403, 'A cannot create homework for B\'s class/subject');

  console.log('3. Another teacher\'s homework');
  ok((await call('GET', `/homework/${own.data.id}`, B)).status === 404, 'B cannot open A\'s homework');
  ok((await call('PUT', `/homework/${own.data.id}`, B, { title: 'hack' })).status === 404, 'B cannot edit it');
  ok((await call('DELETE', `/homework/${own.data.id}`, B, { reason: 'hack attempt' })).status === 404, 'B cannot delete it');
  ok((await call('GET', `/homework/${own.data.id}/submissions`, B)).status === 403, 'B cannot open Check work');
  ok((await call('GET', `/homework/${own.data.id}/submissions`, A)).status === 200, 'A can open Check work');
  ok((await call('PUT', `/homework/${own.data.id}`, A, { title: 'Scope test edited' })).data?.title === 'Scope test edited', 'A can edit own homework');

  console.log('4. Marks / results / attendance');
  const exam = (await call('GET', '/exams?all=1', admin)).data.items[0];
  ok((await call('GET', `/assessment/marks?examId=${exam.id}&sectionId=${pairB.sectionId}&subjectId=${pairB.subjectId}`, A)).status === 403, 'A cannot enter marks for B\'s subject');
  ok((await call('GET', `/assessment/marks?examId=${exam.id}&sectionId=${pairA.sectionId}&subjectId=${pairA.subjectId}`, A)).status === 200, 'A can enter marks for own subject');
  const secsA = (await call('GET', '/sections?all=1', A)).data.items.map((s) => s.id);
  const foreign = (await call('GET', '/sections?all=1', admin)).data.items.find((s) => !secsA.includes(s.id));
  ok((await call('GET', `/attendance/students?sectionId=${foreign.id}`, A)).status === 403, 'A cannot mark attendance in a class not assigned to them');
  ok((await call('GET', `/attendance/students?sectionId=${pairA.sectionId}`, A)).status === 200, 'A can mark attendance in own class');
  ok((await call('GET', `/assessment/results?examId=${exam.id}&sectionId=${foreign.id}`, A)).status === 403, 'A cannot view results of an unassigned class');

  console.log('5. Admin unaffected');
  ok((await call('GET', '/homework?pageSize=500', admin)).data.total === allCount + 1, 'admin still sees all homework');
  const re = await call('PUT', `/homework/${own.data.id}`, admin, { teacherId: tB });
  ok(re.data?.teacherId === tB, 'admin can reassign homework to another teacher');

  await call('DELETE', `/homework/${own.data.id}`, admin, { reason: 'scope test cleanup' });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
