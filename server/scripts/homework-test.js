// Homework workflow test: student login → submit → teacher redo/evaluate/publish → parent acknowledges.
// Run with the API running: node scripts/homework-test.js
const BASE = process.env.API || 'http://localhost:5000/api';
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? '✔' : '✘'} ${m}`); };
async function call(method, path, token, body, form) {
  const r = await fetch(BASE + path, { method, headers: { ...(!form && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) }, body: form || (body ? JSON.stringify(body) : undefined) });
  let data; try { data = await r.json(); } catch { data = null; }
  return { status: r.status, data };
}
const tok = async (email, password) => (await call('POST', '/auth/login', null, { email, password })).data?.token;

(async () => {
  const admin = await tok('admin@rajschool.in', 'Admin@123');
  const teacher = await tok('teacher@rajschool.in', 'Teacher@123');
  const parent = await tok('9876543210', '9876543210');
  const kid = (await call('GET', '/portal/children', parent)).data.items.find((k) => k.grade.name === 'VIII');

  console.log('1. Student logins');
  const bulk = await call('POST', '/students/student-logins', admin, { sectionId: kid.sectionId });
  ok(bulk.status === 200 && bulk.data.items.length > 5, `class logins ready (${bulk.data.created} new, ${bulk.data.items.length} total)`);
  const other = bulk.data.items.find((i) => i.password);
  ok(!!(await tok(other.login, other.password)), `student signs in with admission number ${other.login}`);
  const student = await tok('student@rajschool.in', 'Student@123');
  ok(!!student, 'demo student signs in');

  console.log('2. Teacher assigns homework with online submission');
  const me = (await call('GET', '/portal/teacher', teacher)).data.staff;
  const subj = (await call('GET', `/section-subjects?sectionId=${kid.sectionId}&all=1`, admin)).data.items[0];
  const hw = (await call('POST', '/homework', admin, { sectionId: kid.sectionId, subjectId: subj.subjectId, teacherId: me.id, title: 'Test: Essay on My School', description: 'Write 150 words', dueDate: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10), maxMarks: 10, allowSubmission: true })).data;
  ok(hw?.id && hw.maxMarks === 10, 'homework created (max 10 marks)');

  console.log('3. Student submits');
  const fd = new FormData();
  fd.append('studentId', kid.id); fd.append('text', 'My school is Raj English School…');
  fd.append('files', new Blob([Buffer.from('%PDF-1.4 test')], { type: 'application/pdf' }), 'essay.pdf');
  const sub = await call('POST', `/portal/homework/${hw.id}/submit`, student, null, fd);
  ok(sub.status === 201 && sub.data.files.length === 1 && !sub.data.isLate, 'submitted with a file, on time');
  const subId = sub.data.id;

  console.log('4. Teacher asks to redo → student resubmits');
  ok((await call('POST', `/homework-submissions/${subId}/resubmit`, teacher, { feedback: 'Please add a conclusion' })).data?.status === 'RESUBMIT', 'teacher requested redo');
  let list = (await call('GET', `/portal/student/${kid.id}/homework`, student)).data.items.find((h) => h.id === hw.id);
  ok(list.submission.status === 'RESUBMIT' && list.submission.feedback === 'Please add a conclusion', 'student sees redo request with feedback');
  const fd2 = new FormData(); fd2.append('studentId', kid.id); fd2.append('text', 'Updated essay with conclusion');
  const re = await call('POST', `/portal/homework/${hw.id}/submit`, student, null, fd2);
  ok(re.data?.attempts === 2 && re.data.status === 'SUBMITTED', 'resubmitted (attempt 2)');

  console.log('5. Teacher evaluates → hidden until published');
  ok((await call('PUT', `/homework-submissions/${subId}/evaluate`, teacher, { marks: 12 })).status === 400, 'marks above max rejected');
  await call('PUT', `/homework-submissions/${subId}/evaluate`, teacher, { marks: 8.5, grade: 'A', feedback: 'Very good work' });
  list = (await call('GET', `/portal/student/${kid.id}/homework`, student)).data.items.find((h) => h.id === hw.id);
  ok(list.submission.status === 'EVALUATED' && list.submission.marks === null, 'student cannot see marks before publishing');
  ok((await call('POST', `/portal/submissions/${subId}/acknowledge`, parent, {})).status === 400, 'parent cannot acknowledge before publishing');
  const pub = await call('POST', `/homework/${hw.id}/publish`, teacher, {});
  ok(pub.data?.published === 1, 'teacher published');
  list = (await call('GET', `/portal/student/${kid.id}/homework`, student)).data.items.find((h) => h.id === hw.id);
  ok(list.submission.marks === 8.5 && list.submission.grade === 'A', 'student sees 8.5/10, grade A');
  const msgs = (await call('GET', '/messages', parent)).data.items;
  ok(msgs.some((m) => m.subject.includes('Homework checked')), 'parent got an in-app message');
  ok((await call('GET', '/messages', student)).data.items.some((m) => m.subject.includes('Homework checked')), 'student got an in-app message');

  console.log('6. Parent acknowledges');
  ok((await call('POST', `/portal/submissions/${subId}/acknowledge`, student, {})).status === 403, 'student cannot acknowledge on behalf of parent');
  const ack = await call('POST', `/portal/submissions/${subId}/acknowledge`, parent, { note: 'Thank you!' });
  ok(!!ack.data?.parentAckAt, 'parent acknowledged');
  const review = (await call('GET', `/homework/${hw.id}/submissions`, teacher)).data;
  ok(review.stats.acknowledged === 1 && review.rows.find((r) => r.submission)?.submission.parentAckNote === 'Thank you!', 'teacher sees acknowledgement and note');
  ok((await call('POST', `/portal/homework/${hw.id}/submit`, student, null, (() => { const f = new FormData(); f.append('studentId', kid.id); f.append('text', 'x'); return f; })())).status === 400, 'submission closed after checking');

  console.log('7. Cleanup (to Recycle Bin)');
  ok((await call('DELETE', `/homework/${hw.id}`, admin, { reason: 'homework test cleanup' })).status === 200, 'test homework moved to Recycle Bin');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
