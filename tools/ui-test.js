// Headless browser test: opens every page as each role, reports console/page errors, saves screenshots.
// Usage: node ui-test.js   (needs API on :5000 and web on :5173)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.WEB || 'http://localhost:5174';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = fileURLToPath(new URL('./screenshots/', import.meta.url));
fs.mkdirSync(OUT, { recursive: true });
const SHOTS = new Set(['/', '/about', '/admissions', '/gallery', '/app', '/app/fees', '/app/students', '/app/portal', '/app/teacher', '/platform', '/hi-home']);

const problems = [];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--window-size=1440,900'] });

async function visit(page, path, label = path) {
  const errors = [];
  const onConsole = (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource.*(404|net::ERR_ABORTED)|google\.com\/maps/i.test(m.text())) errors.push(m.text()); };
  const onPageErr = (e) => errors.push(e.message);
  page.on('console', onConsole);
  page.on('pageerror', onPageErr);
  await page.goto(BASE + path, { waitUntil: 'networkidle0', timeout: 45000 }).catch((e) => errors.push(`nav: ${e.message}`));
  await new Promise((r) => setTimeout(r, 900));
  const text = await page.evaluate(() => document.body.innerText.slice(0, 20000));
  if (/Something went wrong|Internal server error|Cannot read properties|is not a function|undefined is not/i.test(text)) errors.push('Error text visible on page');
  if (SHOTS.has(label)) await page.screenshot({ path: `${OUT}${label.replace(/\//g, '_') || 'home'}.png` });
  page.off('console', onConsole);
  page.off('pageerror', onPageErr);
  const ok = !errors.length;
  console.log(`${ok ? '✔' : '✘'} ${label}${ok ? '' : `\n    ${errors.slice(0, 3).join('\n    ')}`}`);
  if (!ok) problems.push([label, errors]);
}

async function login(page, email, password) {
  await page.evaluate(() => { localStorage.clear(); sessionStorage.setItem('rny_loaded', '1'); });
  const res = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const { token } = await res.json();
  await page.evaluate((t) => localStorage.setItem('rny_token', t), token);
}

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

// Public website (English + Hindi)
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { sessionStorage.setItem('rny_loaded', '1'); localStorage.setItem('rny_lang', 'en'); });
for (const p of ['/', '/about', '/academics', '/facilities', '/admissions', '/gallery', '/notices', '/contact', '/disclosure', '/tc', '/login']) await visit(page, p);
await page.evaluate(() => localStorage.setItem('rny_lang', 'hi'));
await visit(page, '/', '/hi-home');
await visit(page, '/admissions', '/hi-admissions');
await page.evaluate(() => localStorage.setItem('rny_lang', 'en'));

// School admin: every ERP page
await login(page, 'admin@rajschool.in', 'Admin@123');
const adminPages = ['/app', '/app/students', '/app/students/new', '/app/students/promote', '/app/tcs', '/app/applications', '/app/enquiries', '/app/classes', '/app/subjects', '/app/section-subjects', '/app/timetable', '/app/events', '/app/academic-years', '/app/attendance', '/app/attendance/report', '/app/attendance/staff', '/app/exams', '/app/exam-schedules', '/app/marks', '/app/results', '/app/fees', '/app/fees/collect', '/app/fees/invoices', '/app/fees/payments', '/app/fees/dues', '/app/fees/structure', '/app/fees/heads', '/app/fees/concessions', '/app/accounts', '/app/expenses', '/app/staff', '/app/leaves', '/app/payroll', '/app/users', '/app/notices', '/app/messages', '/app/homework', '/app/routes', '/app/vehicles', '/app/hostels', '/app/hostel-allocations', '/app/library', '/app/books', '/app/inventory', '/app/cms/banners', '/app/cms/content', '/app/cms/leaders', '/app/cms/gallery', '/app/cms/stats', '/app/cms/facilities', '/app/cms/testimonials', '/app/cms/contacts', '/app/cms/disclosure', '/app/cms/results', '/app/settings', '/app/audit'];
for (const p of adminPages) await visit(page, p);
// Deep pages
const token = await page.evaluate(() => localStorage.getItem('rny_token'));
const api = (u) => fetch(BASE + '/api' + u, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
const st = (await api('/students?pageSize=1')).items[0];
const exam = (await api('/exams?all=1')).items.find((e) => e.isPublished);
const pay = (await api('/fees/payments?pageSize=1')).items[0];
await visit(page, `/app/students/${st.id}`, '/app/students/:id');
await visit(page, `/app/students/${st.id}/edit`, '/app/students/:id/edit');
await visit(page, `/app/fees/collect?studentId=${st.id}`, '/app/fees/collect?student');
await visit(page, `/app/report-card?examId=${exam.id}&studentId=${st.id}`, '/app/report-card');
await visit(page, `/app/fees/receipt/${pay.id}`, '/app/fees/receipt');
// Interactive: attendance section selection
await page.goto(BASE + '/app/attendance', { waitUntil: 'networkidle0' });
const sec = await page.$eval('select', (s) => s.options[5]?.value);
await page.select('select', sec);
await new Promise((r) => setTimeout(r, 1500));
const rows = await page.$$eval('button[title="PRESENT"]', (b) => b.length);
console.log(`  attendance rows rendered: ${rows}`);

// Teacher
await login(page, 'teacher@rajschool.in', 'Teacher@123');
for (const p of ['/app', '/app/teacher', '/app/attendance', '/app/marks', '/app/homework', '/app/leaves', '/app/timetable', '/app/messages']) await visit(page, p);
// Accountant
await login(page, 'accounts@rajschool.in', 'Accounts@123');
for (const p of ['/app', '/app/fees', '/app/fees/collect', '/app/payroll', '/app/accounts']) await visit(page, p, `acc:${p}`);
// Parent
await login(page, '9876543210', '9876543210');
for (const p of ['/app', '/app/portal', '/app/messages']) await visit(page, p);
// Super admin
await login(page, 'admin@rnygroups.com', 'Admin@123');
for (const p of ['/platform', '/platform/schools', '/platform/plans', '/platform/billing', '/platform/audit']) await visit(page, p);
const schools = await fetch(BASE + '/api/platform/schools', { headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('rny_token'))}` } }).then((r) => r.json());
await visit(page, `/platform/schools/${schools.items[0].id}`, '/platform/schools/:id');
// Second tenant public website
await page.evaluate(() => sessionStorage.setItem('rny_site', 'sunrise-public-school'));
await visit(page, '/', 'sunrise:/');

await browser.close();
console.log(`\n${problems.length ? `✘ ${problems.length} page(s) with errors` : '✔ All pages rendered without errors'}`);
process.exit(problems.length ? 1 : 0);
