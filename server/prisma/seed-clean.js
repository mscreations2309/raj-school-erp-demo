// Clean start: SaaS plans + super admin + Raj English School with its real website content and
// basic academic setup (session, classes, sections, subjects, fee heads). NO dummy students/staff/fees.
// Run: node prisma/seed-clean.js
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { provisionSchool } from '../src/lib/provision.js';
import * as C from './seed-content.js';

const prisma = new PrismaClient();
const IMG = C.IMG;

async function main() {
  console.log('⏳ Clean seed (no dummy data)…');
  const plans = [
    { code: 'STARTER', name: 'Starter', description: 'Essentials for small schools', priceMonthly: 2999, priceYearly: 29999, maxStudents: 300, maxStaff: 30, modules: ['students', 'staff', 'academics', 'attendance', 'fees', 'communication', 'website'] },
    { code: 'GROWTH', name: 'Growth', description: 'Complete academics & admissions', priceMonthly: 5999, priceYearly: 59999, maxStudents: 1500, maxStaff: 120, modules: ['students', 'staff', 'academics', 'attendance', 'exams', 'fees', 'accounts', 'admissions', 'communication', 'homework', 'transport', 'library', 'website', 'reports'] },
    { code: 'ENTERPRISE', name: 'Enterprise', description: 'Everything incl. hostel, payroll & inventory', priceMonthly: 11999, priceYearly: 119999, maxStudents: 10000, maxStaff: 1000, modules: ['students', 'staff', 'academics', 'attendance', 'exams', 'fees', 'accounts', 'payroll', 'admissions', 'communication', 'homework', 'transport', 'hostel', 'library', 'inventory', 'website', 'reports'] },
  ];
  for (const p of plans) await prisma.plan.create({ data: { ...p, modules: JSON.stringify(p.modules) } });

  await prisma.user.create({
    data: {
      name: 'RnY Groups Admin', email: (process.env.SUPER_ADMIN_EMAIL || 'admin@rnygroups.com').toLowerCase(), role: 'SUPER_ADMIN',
      passwordHash: await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || 'Admin@123', 10),
    },
  });

  const { school } = await provisionSchool({
    school: { ...C.school, trialEndsAt: null, settingsObj: { registrationFee: 500, receiptPrefix: 'RES', invoicePrefix: 'RESINV', libraryFinePerDay: 2, mapEmbed: 'https://www.google.com/maps?q=Raj+English+School+Paharia+Sarnath+Varanasi&output=embed', social: { youtube: 'https://www.youtube.com/watch?v=tH046FQLvbM' } } },
    admin: { name: 'School Administrator', email: 'admin@rajschool.in', password: 'Admin@123', phone: '9999900001' },
    planCode: 'ENTERPRISE',
    sections: ['A', 'B'],
  });
  const schoolId = school.id;

  // Real website content captured from the school's current site
  await prisma.siteContent.deleteMany({ where: { schoolId } });
  await prisma.siteContent.createMany({ data: C.siteContent.map(([key, valueEn, valueHi]) => ({ schoolId, key, valueEn, valueHi })) });
  await prisma.banner.createMany({ data: C.banners.map(([n, titleEn, titleHi, subtitleEn, subtitleHi], i) => ({ schoolId, imageUrl: `${IMG}/banner/${n}.jpg`, titleEn, titleHi, subtitleEn, subtitleHi, order: i })) });
  await prisma.leader.createMany({ data: C.leaders.map(({ photo, ...l }, i) => ({ schoolId, ...l, photoUrl: `${IMG}/people/${photo}`, order: i })) });
  await prisma.stat.createMany({ data: C.stats.map(([labelEn, labelHi, value, suffix, icon], i) => ({ schoolId, labelEn, labelHi, value, suffix, icon, order: i })) });
  await prisma.facility.createMany({ data: C.facilities.map(([titleEn, titleHi, descEn, descHi, icon, img], i) => ({ schoolId, titleEn, titleHi, descEn, descHi, icon, imageUrl: `${IMG}/gallery/${img}`, order: i })) });
  await prisma.galleryItem.createMany({ data: C.gallery.map(([file, titleEn, titleHi, category], i) => ({ schoolId, imageUrl: `${IMG}/gallery/${file}`, titleEn, titleHi, category, order: i })) });
  await prisma.contactPerson.createMany({ data: C.contacts.map(([purposeEn, purposeHi, officer, phone], i) => ({ schoolId, purposeEn, purposeHi, officer, phone, order: i })) });
  await prisma.disclosureItem.createMany({ data: C.disclosures.map(([section, label, value], i) => ({ schoolId, section, label, value, order: i })) });
  await prisma.boardResult.createMany({ data: C.boardResults.map(([className, year, registered, passed, percent]) => ({ schoolId, className, year, registered, passed, percent })) });

  console.log('\n✅ Clean seed complete — no dummy data.');
  console.log('  School Admin ....... admin@rajschool.in / Admin@123');
  console.log('  Super Admin (SaaS) . admin@rnygroups.com / Admin@123\n');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
