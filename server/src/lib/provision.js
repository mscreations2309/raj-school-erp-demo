// Creates a ready-to-use tenant: school + admin login + academic year + classes + subjects + fee heads + website basics.
import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

export const DEFAULT_GRADES = ['Play Group', 'Nursery', 'LKG', 'UKG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export const DEFAULT_SUBJECTS = [
  ['English', 'ENG'], ['Hindi', 'HIN'], ['Mathematics', 'MAT'], ['Science', 'SCI'], ['Social Science', 'SST'],
  ['Sanskrit', 'SKT'], ['Computer Science', 'CS'], ['Environmental Studies', 'EVS'], ['General Knowledge', 'GK'],
  ['Physics', 'PHY'], ['Chemistry', 'CHE'], ['Biology', 'BIO'], ['Accountancy', 'ACC'], ['Business Studies', 'BST'],
  ['Economics', 'ECO'], ['Physical Education', 'PE'], ['Art & Craft', 'ART'], ['Music', 'MUS'],
];

export const DEFAULT_FEE_HEADS = [
  ['Tuition Fee', 'MONTHLY'], ['Development Fee', 'ANNUAL'], ['Computer Fee', 'MONTHLY'],
  ['Exam Fee', 'ANNUAL'], ['Admission Fee', 'ONE_TIME'], ['Transport Fee', 'MONTHLY'], ['Hostel Fee', 'MONTHLY'],
];

export function currentSessionDates(now = new Date()) {
  // Indian academic session: 1 April → 31 March
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { name: `${y}-${String(y + 1).slice(2)}`, startDate: new Date(Date.UTC(y, 3, 1)), endDate: new Date(Date.UTC(y + 1, 2, 31)) };
}

export async function provisionSchool({ school: schoolInput, admin, planCode = 'GROWTH', sections = ['A', 'B'] }) {
  const { settingsObj, ...school } = schoolInput;
  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  const created = await prisma.school.create({
    data: {
      ...school,
      planId: plan?.id,
      status: school.status || 'TRIAL',
      trialEndsAt: school.trialEndsAt || new Date(Date.now() + 30 * 864e5),
      settings: JSON.stringify({
        registrationFee: 500,
        receiptPrefix: 'RCPT',
        invoicePrefix: 'INV',
        lateFinePerDay: 10,
        feeDueDay: 10,
        gradeScale: [
          { min: 91, grade: 'A1', point: 10 }, { min: 81, grade: 'A2', point: 9 }, { min: 71, grade: 'B1', point: 8 },
          { min: 61, grade: 'B2', point: 7 }, { min: 51, grade: 'C1', point: 6 }, { min: 41, grade: 'C2', point: 5 },
          { min: 33, grade: 'D', point: 4 }, { min: 0, grade: 'E', point: 0 },
        ],
        workingDays: [1, 2, 3, 4, 5, 6],
        ...(settingsObj || {}),
      }),
    },
  });
  const schoolId = created.id;

  if (plan) {
    await prisma.subscription.create({
      data: { schoolId, planId: plan.id, billingCycle: 'YEARLY', amount: plan.priceYearly, endDate: new Date(Date.now() + 365 * 864e5) },
    });
  }

  const adminUser = await prisma.user.create({
    data: {
      schoolId,
      name: admin.name,
      email: admin.email.toLowerCase(),
      phone: admin.phone,
      role: 'SCHOOL_ADMIN',
      passwordHash: await bcrypt.hash(admin.password, 10),
    },
  });

  const session = currentSessionDates();
  const year = await prisma.academicYear.create({ data: { schoolId, ...session, isCurrent: true } });

  const grades = [];
  for (const [i, name] of DEFAULT_GRADES.entries()) {
    const g = await prisma.grade.create({ data: { schoolId, name, order: i } });
    grades.push(g);
    for (const s of sections) {
      await prisma.section.create({ data: { schoolId, gradeId: g.id, name: s, room: `${i + 1}${s}` } });
    }
  }
  await prisma.subject.createMany({ data: DEFAULT_SUBJECTS.map(([name, code]) => ({ schoolId, name, code })) });
  await prisma.feeHead.createMany({ data: DEFAULT_FEE_HEADS.map(([name, frequency]) => ({ schoolId, name, frequency, isOptional: /Transport|Hostel/.test(name) })) });

  await prisma.siteContent.createMany({
    data: [
      { schoolId, key: 'hero.title', valueEn: `Welcome to ${created.name}`, valueHi: created.nameHi ? `${created.nameHi} में आपका स्वागत है` : null },
      { schoolId, key: 'hero.subtitle', valueEn: created.tagline || 'Excellence in Education', valueHi: created.taglineHi },
      { schoolId, key: 'about.short', valueEn: `${created.name} is committed to holistic, value-based education.`, valueHi: null },
    ],
  });

  return { school: created, adminUser, academicYear: year, grades };
}
