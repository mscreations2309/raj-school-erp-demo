// Startup data preparation.
//  SEED_MODE=demo|clean → on an EMPTY database only, load demo data or the clean school setup.
//                         Existing data is never modified or removed automatically.
//  DEMO_MODE=true       → shows the "demo" banner on website and ERP.
// Removing demo data is done only by the School Admin's button, and goes to the Recycle Bin.
import { spawn } from 'node:child_process';
import { prisma } from './prisma.js';

export const isDemo = () => process.env.DEMO_MODE === 'true';

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', env: process.env });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`))));
  });

export async function prepareDatabase() {
  const plans = await prisma.plan.count();
  if (plans > 0) return; // never modify an existing database
  const clean = process.env.SEED_MODE === 'clean';
  console.log(`⏳ Empty database — loading ${clean ? 'clean school setup' : 'demo data'}…`);
  await run('node', [clean ? 'prisma/seed-clean.js' : 'prisma/seed.js']);
}

/** Which records count as "demo data" for the Remove-demo-data button (moved to the Recycle Bin, restorable). */
export async function demoDataRoots(schoolId, keepUserId) {
  const ids = async (model, where = {}) => (await prisma[model].findMany({ where: { schoolId, ...where }, select: { id: true } })).map((r) => r.id);
  const roots = [
    ['Student', await ids('student')],
    ['Staff', await ids('staff')],
    ['User', await ids('user', { role: { not: 'SCHOOL_ADMIN' }, id: { not: keepUserId } })],
    ['Message', await ids('message')],
    ['Notice', await ids('notice')],
    ['Event', await ids('event')],
    ['Enquiry', await ids('enquiry')],
    ['AdmissionApplication', await ids('admissionApplication')],
    ['Exam', await ids('exam')],
    ['FeeStructure', await ids('feeStructure')],
    ['Expense', await ids('expense')],
    ['Homework', await ids('homework')],
    ['TimetableSlot', await ids('timetableSlot')],
    ['SectionSubject', await ids('sectionSubject')],
    ['Hostel', await ids('hostel')],
    ['TransportRoute', await ids('transportRoute')],
    ['Vehicle', await ids('vehicle')],
    ['Book', await ids('book')],
    ['InventoryItem', await ids('inventoryItem')],
    ['Testimonial', await ids('testimonial')],
    ['TransferCertificate', await ids('transferCertificate')],
  ];
  return roots.filter(([, list]) => list.length).map(([model, list]) => ({ model, ids: list }));
}
