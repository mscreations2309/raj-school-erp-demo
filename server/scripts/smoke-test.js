// End-to-end API smoke test. Run with the server running: node scripts/smoke-test.js
const BASE = process.env.API || 'http://localhost:5000/api';
let pass = 0, fail = 0;
const failures = [];

async function call(method, path, { token, body, expect = 200, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  const ok = Array.isArray(expect) ? expect.includes(res.status) : res.status === expect;
  if (ok) pass++; else { fail++; failures.push(`${method} ${path} → ${res.status} (expected ${expect}) ${typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : ''}`); }
  return data;
}
const login = async (email, password) => (await call('POST', '/auth/login', { body: { email, password } })).token;

(async () => {
  // Public website
  const site = await call('GET', '/public/site');
  console.log(`site: ${site.school?.name}, banners=${site.banners?.length}, gallery=${site.gallery?.length}, notices=${site.notices?.length}`);
  await call('GET', '/public/disclosure');
  await call('GET', '/public/tc?q=TC/2026/0001');
  await call('GET', '/public/tc?q=nope', { expect: 404 });
  await call('POST', '/public/enquiry', { body: { name: 'Test Parent', phone: '9876500000', gradeSought: 'I', message: 'Smoke test' }, expect: 201 });
  await call('POST', '/public/enquiry', { body: { name: 'X', phone: '123' }, expect: 400 });

  // Auth
  const admin = await login('admin@rajschool.in', 'Admin@123');
  await call('POST', '/auth/login', { body: { email: 'admin@rajschool.in', password: 'wrong' }, expect: 401 });
  const me = await call('GET', '/auth/me', { token: admin });
  console.log(`me: ${me.user?.role} @ ${me.school?.name}, modules=${me.modules?.length}`);
  await call('GET', '/dashboard', { expect: 401 });

  // Admin modules
  const dash = await call('GET', '/dashboard', { token: admin });
  console.log(`dashboard: students=${dash.students}, staff=${dash.staff}, feeMonth=${dash.feeThisMonth}, outstanding=${dash.outstanding}`);
  const grades = await call('GET', '/grades?all=1', { token: admin });
  const sections = await call('GET', '/sections?all=1', { token: admin });
  const sec = sections.items.find((s) => s.grade.name === 'VIII' && s.name === 'A');
  const students = await call('GET', `/students?sectionId=${sec.id}`, { token: admin });
  const st = students.items[0];
  await call('GET', `/students/${st.id}`, { token: admin });
  const created = await call('POST', '/students', { token: admin, body: { firstName: 'Smoke', lastName: 'Test', gender: 'MALE', sectionId: sec.id, fatherName: 'Father Test', fatherPhone: '9123456780', dob: '2013-05-05' }, expect: 201 });
  await call('PUT', `/students/${created.student.id}`, { token: admin, body: { bloodGroup: 'O+' } });
  await call('POST', `/students/${created.student.id}/parent-login`, { token: admin });
  await call('GET', '/students/export', { token: admin });
  await call('GET', '/staff?all=1', { token: admin });
  await call('GET', '/subjects?all=1', { token: admin });
  await call('GET', `/timetable?sectionId=${sec.id}`, { token: admin });
  const att = await call('GET', `/attendance/students?sectionId=${sec.id}`, { token: admin });
  await call('POST', '/attendance/students', { token: admin, body: { sectionId: sec.id, date: new Date().toISOString().slice(0, 10), records: att.students.map((s) => ({ studentId: s.id, status: 'PRESENT' })) } });
  await call('GET', `/attendance/students/report?sectionId=${sec.id}&month=${new Date().toISOString().slice(0, 7)}`, { token: admin });
  await call('GET', '/attendance/summary', { token: admin });
  await call('GET', '/attendance/staff', { token: admin });
  const exams = await call('GET', '/exams?all=1', { token: admin });
  const hy = exams.items.find((e) => e.name.startsWith('Half'));
  const res = await call('GET', `/assessment/results?examId=${hy.id}&sectionId=${sec.id}`, { token: admin });
  console.log(`results: subjects=${res.subjects?.length}, avg=${res.summary?.average}`);
  await call('GET', `/assessment/report-card?examId=${hy.id}&studentId=${st.id}`, { token: admin });
  const subj = res.subjects[0];
  await call('GET', `/assessment/marks?examId=${hy.id}&sectionId=${sec.id}&subjectId=${subj.id}`, { token: admin });
  await call('GET', '/fees/summary', { token: admin });
  await call('GET', '/fees/dues', { token: admin });
  const inv = await call('GET', '/fees/invoices?status=UNPAID&pageSize=1', { token: admin });
  if (inv.items?.[0]) {
    const pay = await call('POST', '/fees/collect', { token: admin, body: { invoiceId: inv.items[0].id, amount: inv.items[0].total - inv.items[0].paid, method: 'CASH' }, expect: 201 });
    await call('GET', `/fees/receipt/${pay.id}`, { token: admin });
  }
  await call('GET', '/fees/payments', { token: admin });
  await call('GET', '/fees/accounts', { token: admin });
  await call('GET', `/fees/student/${st.id}`, { token: admin });
  await call('GET', '/applications', { token: admin });
  await call('GET', '/enquiries', { token: admin });
  await call('GET', '/notices', { token: admin });
  await call('GET', '/events?all=1', { token: admin });
  await call('GET', '/messages', { token: admin });
  await call('GET', '/homework', { token: admin });
  await call('GET', '/routes?all=1', { token: admin });
  await call('GET', '/vehicles', { token: admin });
  await call('GET', '/hostels?all=1', { token: admin });
  await call('GET', '/books', { token: admin });
  await call('GET', '/library/issues', { token: admin });
  await call('GET', '/library/stats', { token: admin });
  await call('GET', '/inventory-items', { token: admin });
  await call('GET', '/expenses', { token: admin });
  await call('GET', `/payroll?month=${new Date(Date.now() - 31 * 864e5).toISOString().slice(0, 7)}`, { token: admin });
  await call('GET', '/leaves', { token: admin });
  await call('GET', '/users', { token: admin });
  await call('GET', '/settings', { token: admin });
  await call('GET', '/audit', { token: admin });
  await call('GET', '/search?q=Pandey', { token: admin });
  for (const p of ['banners', 'leaders', 'gallery', 'stats', 'facilities', 'testimonials', 'contact-persons', 'disclosures', 'board-results', 'site-content', 'tcs']) await call('GET', `/${p}`, { token: admin });
  const ev = await call('POST', '/events', { token: admin, body: { title: 'Smoke Event', type: 'EVENT', startDate: '2026-12-01' }, expect: 201 });
  await call('DELETE', `/events/${ev.id}`, { token: admin });

  // Security: tenant isolation
  const sunrise = await login('admin@sunrise.example', 'Admin@123');
  await call('GET', `/students/${st.id}`, { token: sunrise, expect: 404 });
  await call('POST', '/students', { token: sunrise, body: { firstName: 'Hack', gender: 'MALE', sectionId: sec.id }, expect: 400 });

  // Teacher
  const teacher = await login('teacher@rajschool.in', 'Teacher@123');
  await call('GET', '/portal/teacher', { token: teacher });
  await call('GET', '/fees/summary', { token: teacher, expect: 403 });
  await call('GET', '/payroll', { token: teacher, expect: 403 });

  // Parent
  const parent = await login('9876543210', '9876543210');
  const kids = await call('GET', '/portal/children', { token: parent });
  console.log(`parent children: ${kids.items?.map((k) => `${k.firstName} (${k.grade.name}-${k.section.name})`).join(', ')}`);
  const ov = await call('GET', `/portal/student/${kids.items[0].id}`, { token: parent });
  await call('GET', `/portal/student/${kids.items[0].id}/attendance`, { token: parent });
  await call('GET', `/portal/student/${st.id === kids.items[0].id ? students.items[1].id : st.id}`, { token: parent, expect: 403 });
  await call('GET', '/students', { token: parent, expect: 403 });
  if (ov.exams?.[0]) await call('GET', `/portal/student/${kids.items[0].id}/report-card?examId=${ov.exams[0].id}`, { token: parent });
  const unpaid = ov.fees.invoices.find((i) => i.status !== 'PAID');
  if (unpaid) await call('POST', `/portal/pay/${unpaid.id}`, { token: parent, body: { method: 'UPI' } });
  await call('GET', '/messages', { token: parent });

  // Super admin
  const sa = await login('admin@rnygroups.com', 'Admin@123');
  await call('GET', '/platform/stats', { token: sa });
  await call('GET', '/platform/schools', { token: sa });
  await call('GET', '/platform/plans', { token: sa });
  await call('GET', '/platform/invoices', { token: sa });
  await call('GET', '/platform/stats', { token: admin, expect: 403 });
  await call('GET', '/dashboard', { token: sa, headers: { 'x-school-id': me.school.id } });

  // Cleanup the smoke student
  await call('DELETE', `/students/${created.student.id}?hard=1`, { token: admin });

  console.log(`\n${pass} passed, ${fail} failed`);
  if (failures.length) console.log(failures.join('\n'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
