// Adds demo houses / roles / activity groups to an EXISTING school through the API (safe to re-run: skips what exists).
// Usage: node demo-profile-data.mjs https://raj-school-erp-demo.onrender.com
import { planProfileData } from '../server/prisma/seed-profile-plan.js';

const BASE = (process.argv[2] || 'http://localhost:5000') + '/api';
const call = async (method, path, token, body) => {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    if (r && r.status < 500) return { status: r.status, data: await r.json().catch(() => null) };
    await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
  }
  throw new Error(`${method} ${path} failed`);
};
const pool = async (items, n, fn) => { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); })); };

const { token } = (await call('POST', '/auth/login', null, { email: 'admin@rajschool.in', password: 'Admin@123' })).data;
const students = (await call('GET', '/students?all=1', token)).data.items;
const staff = (await call('GET', '/staff?all=1', token)).data.items;
const types = Object.fromEntries((await call('GET', '/student-tag-types?all=1', token)).data.items.map((t) => [t.name, t]));
const kids = (await call('GET', '/portal/children', (await call('POST', '/auth/login', null, { email: '9876543210', password: '9876543210' })).data.token)).data.items;
const keep = kids.find((k) => k.grade?.name === 'VIII')?.id;
const plan = planProfileData(students, staff, { keepStudentId: keep });
console.log(`${students.length} students → ${plan.tags.length} tags planned`);

// 1) in-charge teachers
for (const [name, staffId] of Object.entries(plan.incharge)) {
  if (staffId && types[name] && !types[name].inchargeStaffId) await call('PUT', `/student-tag-types/${types[name].id}`, token, { inchargeStaffId: staffId });
}
// 2) houses
let h = 0;
await pool(students.filter((s) => !s.house), 6, async (s) => { if ((await call('PUT', `/students/${s.id}/house`, token, { house: plan.houses[s.id] })).status === 200) h++; });
console.log(`houses set: ${h}`);
// 3) tags (skips duplicates — the API refuses a role already held)
const res = { ok: 0, skipped: 0 };
await pool(plan.tags, 6, async (t) => {
  const r = await call('POST', `/students/${t.studentId}/tags`, token, { typeId: types[t.typeName].id, house: t.house });
  r.status === 201 ? res.ok++ : res.skipped++;
});
console.log(`tags added: ${res.ok}, skipped (already there): ${res.skipped}`);
const count = {};
plan.tags.forEach((t) => (count[t.typeName] = (count[t.typeName] || 0) + 1));
console.log(Object.entries(count).map(([k, v]) => `${k}: ${v}`).join(' • '));
