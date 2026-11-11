// Recycle Bin rules test. Run with the API running: node scripts/recycle-test.js
const BASE = process.env.API || 'http://localhost:5000/api';
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✔', msg); } else { fail++; console.log('  ✘', msg); } };
async function call(method, path, token, body) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
  let data; try { data = await r.json(); } catch { data = null; }
  return { status: r.status, data };
}
const login = async (email, password) => (await call('POST', '/auth/login', null, { email, password }));
const tok = async (e, p) => (await login(e, p)).data?.token;

(async () => {
  const admin = await tok('admin@rajschool.in', 'Admin@123');
  const principal = await tok('principal@rajschool.in', 'Principal@123');
  const teacher = await tok('teacher@rajschool.in', 'Teacher@123');
  const superA = await tok('admin@rnygroups.com', 'Admin@123');

  console.log('1. Reason is mandatory');
  const hw = (await call('GET', '/homework?pageSize=1', teacher)).data.items[0];
  ok((await call('DELETE', `/homework/${hw.id}`, teacher)).status === 400, 'delete without reason is rejected');

  console.log('2. Teacher deletes → own bin → escalates up the ladder → archive → restore');
  const del = await call('DELETE', `/homework/${hw.id}`, teacher, { reason: 'Posted to wrong class' });
  ok(del.status === 200 && del.data.recycleBinEntryId, 'teacher moved homework to Recycle Bin');
  ok((await call('GET', `/homework/${hw.id}`, admin)).status === 404, 'homework no longer visible in live lists');
  const id = del.data.recycleBinEntryId;
  let mine = (await call('GET', '/recycle-bin?view=mine', teacher)).data;
  ok(mine.items.some((e) => e.id === id), "entry is in the teacher's own bin");
  ok((await call('GET', `/recycle-bin/${id}`, principal)).data?.deletedBy?.employeeId, 'principal can see it with deleter employee ID');
  ok((await call('POST', `/recycle-bin/${id}/escalate`, principal, { reason: 'x y z' })).status === 403, 'principal cannot remove it from the teacher bin');
  let e = await call('POST', `/recycle-bin/${id}/escalate`, teacher, { reason: 'Not needed any more' });
  ok(e.data?.holderRole === 'PRINCIPAL', 'teacher removes from bin → goes to PRINCIPAL');
  ok(!(await call('GET', '/recycle-bin?view=mine', teacher)).data.items.some((x) => x.id === id), "gone from teacher's bin");
  ok((await call('GET', '/recycle-bin?view=deletedByMe', teacher)).data.items.some((x) => x.id === id), "still listed under teacher's 'Deleted by me'");
  e = await call('POST', `/recycle-bin/${id}/escalate`, principal, { reason: 'Reviewed' });
  ok(e.data?.holderRole === 'SCHOOL_ADMIN', 'principal → SCHOOL_ADMIN');
  e = await call('POST', `/recycle-bin/${id}/escalate`, admin, { reason: 'Reviewed' });
  ok(e.data?.holderRole === 'SUPER_ADMIN', 'school admin → RnY SUPER_ADMIN');
  e = await call('POST', `/platform/recycle-bin/${id}/escalate`, superA, { reason: 'Archive' });
  ok(e.data?.status === 'ARCHIVED', 'super admin → ARCHIVED (never erased)');
  const det = (await call('GET', `/platform/recycle-bin/${id}`, superA)).data;
  ok(det.history.length === 5, `full history kept (${det.history.length} steps)`);
  ok((await call('POST', `/platform/recycle-bin/${id}/restore`, superA)).status === 200, 'restore from archive works');
  ok((await call('GET', `/homework/${hw.id}`, admin)).status === 200, 'homework is back with the same ID');

  console.log('3. Deleting a student moves all linked data and blocks logins; restore unlocks');
  const kids = (await call('GET', '/portal/children', await tok('9876543210', '9876543210'))).data.items;
  const before = (await call('GET', `/students/${kids[0].id}`, admin)).data;
  const d1 = await call('DELETE', `/students/${kids[0].id}`, admin, { reason: 'Test delete 1' });
  ok(d1.status === 200, 'student 1 moved to bin');
  ok((await login('9876543210', '9876543210')).status === 200, 'parent can still log in (one child remains)');
  const d2 = await call('DELETE', `/students/${kids[1].id}`, admin, { reason: 'Test delete 2' });
  ok((await login('9876543210', '9876543210')).status === 403, 'parent login blocked after last child deleted');
  ok((await login('student@rajschool.in', 'Student@123')).status === 403, 'student login blocked');
  const entry = (await call('GET', `/recycle-bin/${d1.data.recycleBinEntryId}`, admin)).data;
  ok(entry.totalRecords > 100, `snapshot holds ${entry.totalRecords} linked records`);
  await call('POST', `/recycle-bin/${d2.data.recycleBinEntryId}/restore`, admin);
  await call('POST', `/recycle-bin/${d1.data.recycleBinEntryId}/restore`, admin);
  const after = (await call('GET', `/students/${kids[0].id}`, admin)).data;
  ok(after.invoices?.length === before.invoices.length && after.attendanceSummary.totalDays === before.attendanceSummary.totalDays && after.marks.length === before.marks.length, 'fees, attendance and marks fully restored');
  ok((await login('9876543210', '9876543210')).status === 200, 'parent login works again after restore');
  ok((await login('student@rajschool.in', 'Student@123')).status === 200, 'student login works again');

  console.log('4. Deleting a user login blocks sign-in');
  const users = (await call('GET', '/users?role=LIBRARIAN', admin)).data.items;
  const ud = await call('DELETE', `/users/${users[0].id}`, admin, { reason: 'Left the job' });
  ok(ud.status === 200 && (await login('library@rajschool.in', 'Library@123')).status === 401, 'deleted login cannot sign in');
  await call('POST', `/recycle-bin/${ud.data.recycleBinEntryId}/restore`, admin);
  ok((await login('library@rajschool.in', 'Library@123')).status === 200, 'restored login can sign in');

  console.log('5. Remove-all-demo-data button → one bin entry → one-click restore');
  const c0 = (await call('GET', '/settings/data-summary', admin)).data;
  const cd = await call('POST', '/settings/clear-demo-data', admin, { confirm: 'DELETE', reason: 'Starting fresh' });
  ok(cd.status === 200, 'demo data moved to Recycle Bin');
  const c1 = (await call('GET', '/settings/data-summary', admin)).data;
  ok(Object.values(c1).every((v) => v === 0), 'school now has no demo data');
  ok((await login('teacher@rajschool.in', 'Teacher@123')).status === 401, 'demo staff logins are gone');
  ok((await login('admin@rajschool.in', 'Admin@123')).status === 200, 'School Admin still logs in');
  ok((await call('GET', '/public/site')).data?.banners?.length === 10, 'website content untouched');
  const rs = await call('POST', `/recycle-bin/${cd.data.recycleBinEntryId}/restore`, admin);
  const c2 = (await call('GET', '/settings/data-summary', admin)).data;
  ok(rs.status === 200 && c2.students === c0.students && c2.invoices === c0.invoices && c2.attendance === c0.attendance, `everything restored (${c2.students} students, ${c2.invoices} invoices)`);

  console.log('6. Deleting a school deactivates it (data kept), restore reactivates');
  const sun = (await call('GET', '/platform/schools?q=sunrise', superA)).data.items[0];
  const sd = await call('DELETE', `/platform/schools/${sun.id}`, superA, { reason: 'Demo tenant', confirm: sun.slug });
  ok(sd.status === 200 && (await login('admin@sunrise.example', 'Admin@123')).status === 402, 'school deactivated, its logins blocked');
  await call('POST', `/platform/recycle-bin/${sd.data.recycleBinEntryId}/restore`, superA);
  ok((await login('admin@sunrise.example', 'Admin@123')).status === 200, 'school restored');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
