// Roles/activities/houses + profile photo approval test. Run with the API running: node scripts/profile-test.js
const BASE = process.env.API || 'http://localhost:5000/api';
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? '✔' : '✘'} ${m}`); };
async function call(method, path, token, body, form) {
  const r = await fetch(BASE + path, { method, headers: { ...(!form && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) }, body: form || (body ? JSON.stringify(body) : undefined) });
  let data; try { data = await r.json(); } catch { data = null; }
  return { status: r.status, data };
}
const tok = async (email, password) => (await call('POST', '/auth/login', null, { email, password })).data?.token;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const photoForm = () => { const f = new FormData(); f.append('photo', new Blob([PNG], { type: 'image/png' }), 'me.png'); return f; };
const loginFor = async (admin, staffId, pwd = 'Teacher@123') => { const l = (await call('POST', `/staff/${staffId}/login`, admin, { role: 'TEACHER', password: pwd })).data; return tok(l.email, pwd); };

(async () => {
  const admin = await tok('admin@rajschool.in', 'Admin@123');
  const parent = await tok('9876543210', '9876543210');
  const student = await tok('student@rajschool.in', 'Student@123');
  const kid = (await call('GET', '/portal/children', parent)).data.items.find((k) => k.grade.name === 'VIII');
  const sections = (await call('GET', '/sections?all=1', admin)).data.items;
  const kidSec = sections.find((s) => s.id === kid.sectionId);
  const otherSec = sections.find((s) => s.classTeacherId && s.classTeacherId !== kidSec.classTeacherId);
  const ct = await loginFor(admin, kidSec.classTeacherId);
  const otherCt = await loginFor(admin, otherSec.classTeacherId);

  // start from a student with no roles (demo data may already have given some)
  for (const t of (await call('GET', `/students/${kid.id}/tags`, admin)).data.tags) await call('DELETE', `/student-tags/${t.id}`, admin, { reason: 'test reset' });

  console.log('1. Defaults');
  const types = (await call('GET', '/student-tag-types?all=1', admin)).data.items;
  const T = Object.fromEntries(types.map((t) => [t.name, t]));
  ok(['Head Boy', 'Head Girl', 'House Captain', 'Class Monitor', 'NCC', 'Scouts', 'Guides'].every((n) => T[n]), `${types.length} default roles & activities`);
  const tags0 = (await call('GET', `/students/${kid.id}/tags`, admin)).data;
  ok(tags0.houses.map((h) => h.name).join() === 'Red,Blue,Green,Yellow', 'houses Red, Blue, Green, Yellow');

  console.log('2. Who can assign');
  const mon = await call('POST', `/students/${kid.id}/tags`, ct, { typeId: T['Class Monitor'].id });
  ok(mon.status === 201, 'class teacher assigns Class Monitor to own student');
  ok((await call('POST', `/students/${kid.id}/tags`, ct, { typeId: T['Head Boy'].id })).status === 403, 'class teacher cannot assign Head Boy');
  ok((await call('POST', `/students/${kid.id}/tags`, otherCt, { typeId: T['Prefect'].id })).status === 403, "another class's teacher cannot assign roles here");
  ok((await call('POST', `/students/${kid.id}/tags`, admin, { typeId: T['House Captain'].id, house: 'Blue' })).status === 201, 'admin assigns House Captain (Blue)');
  ok((await call('POST', `/students/${kid.id}/tags`, admin, { typeId: T['Head Boy'].id })).status === 201, 'admin assigns Head Boy');
  ok((await call('POST', `/students/${kid.id}/tags`, otherCt, { typeId: T['NCC'].id })).status === 403, 'NCC: no in-charge yet → teacher cannot assign');
  await call('PUT', `/student-tag-types/${T['NCC'].id}`, admin, { inchargeStaffId: otherSec.classTeacherId });
  ok((await call('POST', `/students/${kid.id}/tags`, otherCt, { typeId: T['NCC'].id })).status === 201, 'NCC in-charge teacher assigns NCC');
  const notMine = ['Scouts', 'Guides', 'NSS', 'Eco Club'].find((n) => T[n].inchargeStaffId !== kidSec.classTeacherId);
  ok((await call('POST', `/students/${kid.id}/tags`, ct, { typeId: T[notMine].id })).status === 403, `non-in-charge teacher cannot assign ${notMine}`);
  ok((await call('PUT', `/students/${kid.id}/house`, ct, { house: 'Blue' })).status === 200, 'class teacher sets house');

  console.log('3. Shown everywhere');
  const prof = (await call('GET', `/students/${kid.id}`, admin)).data;
  ok(prof.house === 'Blue' && ['Head Boy', 'House Captain', 'Class Monitor', 'NCC'].every((n) => prof.tags.some((t) => t.type.name === n)), 'student profile has house + 4 tags');
  const pk = (await call('GET', '/portal/children', parent)).data.items.find((k) => k.id === kid.id);
  ok(pk.tags.length === 4, 'parent portal child card has the tags');
  ok((await call('GET', `/portal/student/${kid.id}`, student)).data.student.tags.length === 4, "student's own portal has the tags");

  console.log('4. Remove → Recycle Bin');
  ok((await call('DELETE', `/student-tags/${mon.data.id}`, otherCt, { reason: 'test' })).status === 403, "other teacher cannot remove the monitor");
  const rm = await call('DELETE', `/student-tags/${mon.data.id}`, ct, { reason: 'Term ended' });
  ok(rm.status === 200, 'class teacher removes Class Monitor');
  ok((await call('GET', '/recycle-bin?view=deletedByMe', ct)).data.items.some((e) => e.label.includes('Class Monitor')), 'removed tag is in the Recycle Bin');

  console.log('5. Photo approval');
  const before = (await call('GET', '/auth/me', student)).data.user.avatarUrl;
  ok((await call('POST', '/me/photo', student, null, photoForm())).status === 201, 'student uploads a new photo');
  ok((await call('GET', '/auth/me', student)).data.user.avatarUrl === before, 'not visible before approval');
  ok(!(await call('GET', '/photo-requests', otherCt)).data.items.some((p) => p.userRole === 'STUDENT' && p.studentId === kid.id), "another class's teacher does not see it");
  const reqS = (await call('GET', '/photo-requests', ct)).data.items.find((p) => p.studentId === kid.id);
  ok(!!reqS, 'class teacher sees it for approval');
  ok((await call('POST', `/photo-requests/${reqS.id}/approve`, ct)).status === 200, 'class teacher approves');
  const meS = (await call('GET', '/auth/me', student)).data.user.avatarUrl;
  ok(meS && meS !== before && (await call('GET', `/students/${kid.id}`, admin)).data.photoUrl === meS, 'approved photo now visible on account and student profile');

  ok((await call('POST', '/me/photo', parent, null, photoForm())).status === 201, 'parent uploads a photo');
  const reqP = (await call('GET', '/photo-requests', ct)).data.items.find((p) => p.userRole === 'PARENT');
  ok(!!reqP, "child's class teacher sees the parent photo");
  ok((await call('POST', `/photo-requests/${reqP.id}/reject`, ct, { reason: 'Face not clear' })).status === 200, 'class teacher rejects with reason');
  ok((await call('GET', '/me/photo', parent)).data.request.status === 'REJECTED', 'parent sees it was rejected');

  ok((await call('POST', '/me/photo', ct, null, photoForm())).status === 201, 'teacher uploads a photo');
  ok(!(await call('GET', '/photo-requests', otherCt)).data.items.some((p) => p.userRole === 'TEACHER'), 'teachers cannot approve staff photos');
  const reqT = (await call('GET', '/photo-requests', admin)).data.items.find((p) => p.userRole === 'TEACHER');
  ok((await call('POST', `/photo-requests/${reqT.id}/approve`, admin)).status === 200, 'admin approves teacher photo');
  ok((await call('POST', '/me/photo', admin, null, photoForm())).status === 201, 'admin uploads own photo');
  const own = (await call('GET', '/photo-requests', admin)).data.items.some((p) => p.userRole === 'SCHOOL_ADMIN');
  ok(!own, 'admin cannot approve their own photo');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
