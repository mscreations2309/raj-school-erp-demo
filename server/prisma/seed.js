// Seeds: SaaS plans + super admin, Raj English School tenant with real website content,
// and realistic demo ERP data (students, staff, attendance, fees, exams, transport, hostel, library…).
// Run: npm run db:reset
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { provisionSchool, currentSessionDates } from '../src/lib/provision.js';
import * as C from './seed-content.js';

const prisma = new PrismaClient();
const IMG = C.IMG;

// Deterministic PRNG so every reset produces the same demo data
let seed = 20261111;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (a, b) => Math.floor(a + rand() * (b - a + 1));
const utcDay = (y, m, d) => new Date(Date.UTC(y, m, d));

const BOY = ['Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Ayush', 'Harsh', 'Rudra', 'Ansh', 'Yash', 'Kartik', 'Dev', 'Aryan', 'Pranav', 'Rohan', 'Siddharth', 'Utkarsh', 'Abhinav', 'Divyansh', 'Shivam', 'Satyam', 'Anurag', 'Prince', 'Vedant', 'Om'];
const GIRL = ['Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Pari', 'Anika', 'Navya', 'Myra', 'Riya', 'Shreya', 'Khushi', 'Prachi', 'Aditi', 'Kavya', 'Ishita', 'Tanvi', 'Vaishnavi', 'Sakshi', 'Muskan', 'Nandini', 'Srishti', 'Pragya', 'Anushka', 'Janvi', 'Radhika', 'Shruti', 'Palak', 'Mahi', 'Kritika', 'Aastha'];
const SUR = ['Singh', 'Pandey', 'Mishra', 'Yadav', 'Srivastava', 'Tiwari', 'Dubey', 'Upadhyay', 'Gupta', 'Jaiswal', 'Maurya', 'Patel', 'Rai', 'Chaubey', 'Tripathi', 'Shukla', 'Verma', 'Kushwaha', 'Pathak', 'Dwivedi', 'Seth', 'Agrahari', 'Vishwakarma', 'Chaurasia'];
const MALE_ADULT = ['Rajesh', 'Sanjay', 'Manoj', 'Anil', 'Vinod', 'Ashok', 'Pankaj', 'Rakesh', 'Sunil', 'Alok', 'Amit', 'Deepak', 'Ajay', 'Santosh', 'Ravi', 'Umesh', 'Pradeep', 'Dinesh', 'Mukesh', 'Shailendra'];
const FEMALE_ADULT = ['Sunita', 'Neha', 'Pooja', 'Rekha', 'Anita', 'Kiran', 'Seema', 'Priya', 'Mamta', 'Archana', 'Shalini', 'Vandana', 'Ritu', 'Sarita', 'Geeta', 'Nisha', 'Poonam', 'Meena', 'Kavita', 'Renu'];
const OCC = ['Business', 'Government Service', 'Teacher', 'Doctor', 'Engineer', 'Advocate', 'Farmer', 'Shopkeeper', 'Bank Officer', 'Private Job', 'Police', 'Army'];
const LOCALITIES = ['Sarnath', 'Paharia', 'Ashapur', 'Pandeypur', 'Shivpur', 'Lahurabir', 'Sigra', 'Cantt', 'Orderly Bazar', 'Chandua Chhittupur', 'Khajuri', 'Daulatpur', 'Bhojubeer', 'Sikraul', 'Tarna', 'Babatpur', 'Chaukaghat'];

async function main() {
  console.log('⏳ Seeding RnY EduSuite…');
  const session = currentSessionDates(new Date());

  // ───────────────── SaaS platform
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

  // ───────────────── Tenant: Raj English School
  const { school, grades } = await provisionSchool({
    school: { ...C.school, trialEndsAt: null, settingsObj: { registrationFee: 500, receiptPrefix: 'RES', invoicePrefix: 'RESINV', libraryFinePerDay: 2, mapEmbed: 'https://www.google.com/maps?q=Raj+English+School+Paharia+Sarnath+Varanasi&output=embed', social: { youtube: 'https://www.youtube.com/watch?v=tH046FQLvbM' } } },
    admin: { name: 'School Administrator', email: 'admin@rajschool.in', password: 'Admin@123', phone: '9999900001' },
    planCode: 'ENTERPRISE',
    sections: ['A', 'B'],
  });
  const schoolId = school.id;
  const year = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
  await prisma.academicYear.create({ data: { schoolId, name: `${session.startDate.getUTCFullYear() - 1}-${String(session.startDate.getUTCFullYear()).slice(2)}`, startDate: utcDay(session.startDate.getUTCFullYear() - 1, 3, 1), endDate: utcDay(session.startDate.getUTCFullYear(), 2, 31) } });
  await prisma.siteContent.deleteMany({ where: { schoolId } });

  // A second demo tenant to show multi-tenancy in the SaaS console
  await provisionSchool({
    school: { slug: 'sunrise-public-school', name: 'Sunrise Public School', city: 'Prayagraj', state: 'Uttar Pradesh', board: 'CBSE', phone: '9000000000', email: 'info@sunrise.example', status: 'TRIAL' },
    admin: { name: 'Sunrise Admin', email: 'admin@sunrise.example', password: 'Admin@123' },
    planCode: 'GROWTH',
    sections: ['A'],
  });

  // ───────────────── Website CMS
  await prisma.siteContent.createMany({ data: C.siteContent.map(([key, valueEn, valueHi]) => ({ schoolId, key, valueEn, valueHi })) });
  await prisma.banner.createMany({ data: C.banners.map(([n, titleEn, titleHi, subtitleEn, subtitleHi], i) => ({ schoolId, imageUrl: `${IMG}/banner/${n}.jpg`, titleEn, titleHi, subtitleEn, subtitleHi, order: i })) });
  await prisma.leader.createMany({ data: C.leaders.map(({ photo, ...l }, i) => ({ schoolId, ...l, photoUrl: `${IMG}/people/${photo}`, order: i })) });
  await prisma.stat.createMany({ data: C.stats.map(([labelEn, labelHi, value, suffix, icon], i) => ({ schoolId, labelEn, labelHi, value, suffix, icon, order: i })) });
  await prisma.facility.createMany({ data: C.facilities.map(([titleEn, titleHi, descEn, descHi, icon, img], i) => ({ schoolId, titleEn, titleHi, descEn, descHi, icon, imageUrl: `${IMG}/gallery/${img}`, order: i })) });
  await prisma.galleryItem.createMany({ data: C.gallery.map(([file, titleEn, titleHi, category], i) => ({ schoolId, imageUrl: `${IMG}/gallery/${file}`, titleEn, titleHi, category, order: i })) });
  await prisma.testimonial.createMany({ data: C.testimonials.map(([name, relation, textEn, textHi], i) => ({ schoolId, name, relation, textEn, textHi, order: i })) });
  await prisma.contactPerson.createMany({ data: C.contacts.map(([purposeEn, purposeHi, officer, phone], i) => ({ schoolId, purposeEn, purposeHi, officer, phone, order: i })) });
  await prisma.disclosureItem.createMany({ data: C.disclosures.map(([section, label, value], i) => ({ schoolId, section, label, value, order: i })) });
  await prisma.boardResult.createMany({ data: C.boardResults.map(([className, yr, registered, passed, percent]) => ({ schoolId, className, year: yr, registered, passed, percent })) });

  // ───────────────── Staff (real office staff + sample teachers)
  const hash = (p) => bcrypt.hash(p, 8);
  const mkUser = async (name, email, role, password, phone) =>
    prisma.user.create({ data: { schoolId, name, email, role, phone, passwordHash: await hash(password) } });

  const staffDefs = [
    ['Binod Kumar', 'Mishra', 'MALE', 'Principal', 'Administration', 'TEACHING', 'M.A., B.Ed.', 95000, '9956392590', 'principal@rajschool.in', 'PRINCIPAL', 'Principal@123'],
    ['Shahana', 'Chhaterji', 'FEMALE', 'Admission Officer', 'Front Office', 'NON_TEACHING', 'MBA', 32000, '8574476806', 'reception@rajschool.in', 'RECEPTIONIST', 'Reception@123'],
    ['Reena', 'Singh', 'FEMALE', 'Accountant', 'Accounts', 'NON_TEACHING', 'M.Com', 38000, '7703004334', 'accounts@rajschool.in', 'ACCOUNTANT', 'Accounts@123'],
    ['S.N.', 'Yadav', 'MALE', 'Office Superintendent', 'Administration', 'NON_TEACHING', 'B.A.', 30000, '8400244821', null, null, null],
    ['Ritesh', 'Singh', 'MALE', 'Transport In-charge', 'Transport', 'NON_TEACHING', 'B.Com', 28000, '9935409515', null, null, null],
    ['Ashish', 'Kumar', 'MALE', 'Estate Supervisor', 'Maintenance', 'NON_TEACHING', 'Diploma', 24000, '7703004335', null, null, null],
    ['S.P.', 'Singh', 'MALE', 'Hostel Warden (Boys)', 'Hostel', 'NON_TEACHING', 'B.A.', 26000, '9450317729', null, null, null],
    ['Babita', 'Tripathi', 'FEMALE', 'Counsellor & Hostel Warden (Girls)', 'Wellness', 'TEACHING', 'M.A. Psychology', 34000, '8924833325', null, null, null],
    ['Mukta', 'Srivastava', 'FEMALE', 'Counsellor', 'Wellness', 'TEACHING', 'M.A. Psychology', 34000, '9000011001', null, null, null],
    ['Shagun', 'Pandey', 'FEMALE', 'Wellness Teacher', 'Wellness', 'TEACHING', 'M.Sc. Yoga', 30000, '9000011002', null, null, null],
    ['Purnima', 'Singh', 'FEMALE', 'Counsellor', 'Wellness', 'TEACHING', 'M.A. Psychology', 32000, '9000011003', null, null, null],
    ['Ankit', 'Yadav', 'MALE', 'Special Educator', 'Wellness', 'TEACHING', 'B.Ed. (Special Education)', 33000, '9000011004', null, null, null],
    ['Kavita', 'Dubey', 'FEMALE', 'Librarian', 'Library', 'NON_TEACHING', 'M.Lib.', 30000, '9000011005', 'library@rajschool.in', 'LIBRARIAN', 'Library@123'],
  ];
  const teacherSubjects = [
    ['English', 'PGT'], ['English', 'TGT'], ['English', 'PRT'], ['Hindi', 'PGT'], ['Hindi', 'TGT'], ['Hindi', 'PRT'],
    ['Mathematics', 'PGT'], ['Mathematics', 'TGT'], ['Mathematics', 'TGT'], ['Mathematics', 'PRT'], ['Science', 'TGT'], ['Science', 'TGT'],
    ['Physics', 'PGT'], ['Chemistry', 'PGT'], ['Biology', 'PGT'], ['Social Science', 'TGT'], ['Social Science', 'TGT'], ['Sanskrit', 'TGT'],
    ['Computer Science', 'PGT'], ['Computer Science', 'TGT'], ['Environmental Studies', 'PRT'], ['Environmental Studies', 'PRT'], ['General Knowledge', 'PRT'],
    ['Physical Education', 'PGT'], ['Art & Craft', 'PRT'], ['Music', 'PRT'], ['English', 'NTT'], ['Mathematics', 'NTT'], ['Hindi', 'PRT'], ['Science', 'PRT'],
  ];
  const staff = [];
  let emp = 0;
  for (const d of staffDefs) {
    const [firstName, lastName, gender, designation, department, staffType, qualification, basicSalary, phone, email, role, pwd] = d;
    emp++;
    const user = role ? await mkUser(`${firstName} ${lastName}`, email, role, pwd, phone) : null;
    staff.push(await prisma.staff.create({
      data: { schoolId, employeeId: `EMP${String(emp).padStart(4, '0')}`, firstName, lastName, gender, designation, department, staffType, qualification, basicSalary, allowances: Math.round(basicSalary * 0.2), deductions: Math.round(basicSalary * 0.12), phone, email, joiningDate: utcDay(between(2000, 2022), between(0, 11), between(1, 28)), experience: between(3, 25), userId: user?.id, address: `${pick(LOCALITIES)}, Varanasi`, bankAccount: `3${between(100000000, 999999999)}`, ifsc: 'SBIN0001234' },
    }));
  }
  const teachers = [];
  for (const [i, [subj, level]] of teacherSubjects.entries()) {
    emp++;
    const female = rand() < 0.6;
    const firstName = female ? pick(FEMALE_ADULT) : pick(MALE_ADULT);
    const lastName = pick(SUR);
    const basic = { PGT: 52000, TGT: 42000, PRT: 34000, NTT: 26000 }[level];
    const isDemo = i === 0;
    const user = isDemo ? await mkUser(`${firstName} ${lastName}`, 'teacher@rajschool.in', 'TEACHER', 'Teacher@123', '9000022000') : null;
    const t = await prisma.staff.create({
      data: { schoolId, employeeId: `EMP${String(emp).padStart(4, '0')}`, firstName, lastName, gender: female ? 'FEMALE' : 'MALE', designation: `${level} — ${subj}`, department: subj, staffType: 'TEACHING', qualification: level === 'PGT' ? `M.A./M.Sc. ${subj}, B.Ed.` : `B.A./B.Sc., B.Ed.`, basicSalary: basic, allowances: Math.round(basic * 0.2), deductions: Math.round(basic * 0.12), phone: `9${between(100000000, 999999999)}`, email: isDemo ? 'teacher@rajschool.in' : null, joiningDate: utcDay(between(2005, 2024), between(0, 11), between(1, 28)), experience: between(2, 22), userId: user?.id, address: `${pick(LOCALITIES)}, Varanasi`, bankAccount: `3${between(100000000, 999999999)}`, ifsc: 'SBIN0001234' },
    });
    teachers.push({ ...t, subj, level });
  }

  // ───────────────── Academics: subject mapping, class teachers
  const subjects = Object.fromEntries((await prisma.subject.findMany({ where: { schoolId } })).map((s) => [s.name, s]));
  const sections = await prisma.section.findMany({ where: { schoolId }, include: { grade: true }, orderBy: [{ grade: { order: 'asc' } }, { name: 'asc' }] });
  const subjectsFor = (g, secName) => {
    const o = g.order;
    if (o <= 3) return ['English', 'Hindi', 'Mathematics', 'Art & Craft', 'Music'];
    if (o <= 8) return ['English', 'Hindi', 'Mathematics', 'Environmental Studies', 'Computer Science', 'General Knowledge'];
    if (o <= 11) return ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Sanskrit', 'Computer Science'];
    if (o <= 13) return ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Computer Science'];
    return secName === 'A' ? ['English', 'Physics', 'Chemistry', 'Mathematics', 'Physical Education'] : ['English', 'Physics', 'Chemistry', 'Biology', 'Physical Education'];
  };
  const levelFor = (o) => (o <= 3 ? ['NTT', 'PRT'] : o <= 8 ? ['PRT', 'TGT'] : o <= 13 ? ['TGT', 'PGT'] : ['PGT']);
  const load = new Map();
  const teacherFor = (subj, o) => {
    const pool = teachers.filter((t) => t.subj === subj && levelFor(o).includes(t.level));
    const any = pool.length ? pool : teachers.filter((t) => t.subj === subj);
    if (!any.length) return null;
    any.sort((a, b) => (load.get(a.id) || 0) - (load.get(b.id) || 0));
    load.set(any[0].id, (load.get(any[0].id) || 0) + 1);
    return any[0];
  };
  const sectionSubjects = {};
  const ctPool = [...teachers];
  for (const s of sections) {
    const list = subjectsFor(s.grade, s.name);
    sectionSubjects[s.id] = [];
    for (const name of list) {
      const t = teacherFor(name, s.grade.order);
      await prisma.sectionSubject.create({ data: { schoolId, sectionId: s.id, subjectId: subjects[name].id, teacherId: t?.id } });
      sectionSubjects[s.id].push({ subject: subjects[name], teacher: t });
    }
    const ct = ctPool.length ? ctPool.shift() : null;
    if (ct) await prisma.section.update({ where: { id: s.id }, data: { classTeacherId: ct.id } });
  }

  // ───────────────── Timetable (6 days × 7 periods, clash-free teachers)
  const PERIODS = [['08:00', '08:40'], ['08:40', '09:20'], ['09:20', '10:00'], ['10:20', '11:00'], ['11:00', '11:40'], ['11:40', '12:20'], ['12:50', '13:30']];
  const busy = new Set();
  const slots = [];
  for (const [si, s] of sections.entries()) {
    const list = sectionSubjects[s.id];
    for (let day = 1; day <= 6; day++) {
      for (let p = 1; p <= PERIODS.length; p++) {
        const ss = list[(day + p + si) % list.length];
        let teacherId = ss.teacher?.id || null;
        if (teacherId && busy.has(`${teacherId}-${day}-${p}`)) teacherId = null;
        if (teacherId) busy.add(`${teacherId}-${day}-${p}`);
        slots.push({ schoolId, sectionId: s.id, day, period: p, startTime: PERIODS[p - 1][0], endTime: PERIODS[p - 1][1], subjectId: ss.subject.id, teacherId });
      }
    }
  }
  await prisma.timetableSlot.createMany({ data: slots });

  // ───────────────── Transport
  const routesDef = [
    ['Route 1 — Sarnath / Ashapur / Pandeypur', 'UP65 AT 4501', ['Sarnath Museum', 'Ashapur Crossing', 'Pandeypur Flyover', 'Paharia Mandi'], 1400],
    ['Route 2 — Cantt / Lahurabir / Maldahiya', 'UP65 AT 4502', ['Cantt Station', 'Lahurabir', 'Maldahiya', 'Chaukaghat'], 1600],
    ['Route 3 — Shivpur / Tarna / Bhojubeer', 'UP65 AT 4503', ['Tarna', 'Shivpur', 'Bhojubeer', 'Sikraul'], 1500],
    ['Route 4 — Sigra / Mahmoorganj / Rathyatra', 'UP65 AT 4504', ['Rathyatra', 'Mahmoorganj', 'Sigra Chauraha', 'Nadesar'], 1700],
    ['Route 5 — Babatpur / Chaubeypur', 'UP65 AT 4505', ['Babatpur', 'Phoolpur Road', 'Chaubeypur', 'Khajuri'], 1900],
  ];
  const stops = [];
  for (const [i, [name, number, stopNames, fee]] of routesDef.entries()) {
    const v = await prisma.vehicle.create({ data: { schoolId, number, model: pick(['Tata Starbus 40', 'Ashok Leyland Lynx', 'Eicher Skyline 52']), capacity: pick([40, 42, 52]), driverName: `${pick(MALE_ADULT)} ${pick(SUR)}`, driverPhone: `9${between(100000000, 999999999)}`, helperName: `${pick(MALE_ADULT)} ${pick(SUR)}`, insuranceExp: utcDay(2027, between(0, 11), 15), fitnessExp: utcDay(2027, between(0, 11), 20) } });
    const route = await prisma.transportRoute.create({ data: { schoolId, name, vehicleId: v.id, monthlyFee: fee } });
    for (const [j, sn] of stopNames.entries()) {
      stops.push(await prisma.routeStop.create({ data: { routeId: route.id, name: sn, order: j, pickupTime: `0${6 + Math.floor((40 + j * 10) / 60)}:${String((40 + j * 10) % 60).padStart(2, '0')}`, dropTime: `14:${String(j * 12).padStart(2, '0')}` } }));
    }
  }

  // ───────────────── Hostel
  const boysHostel = await prisma.hostel.create({ data: { schoolId, name: 'Raj Boys Hostel', type: 'BOYS', wardenName: 'S.P. Singh', wardenPhone: '9450317729', address: 'Campus Block-D' } });
  const girlsHostel = await prisma.hostel.create({ data: { schoolId, name: 'Raj Girls Hostel', type: 'GIRLS', wardenName: 'Babita Tripathi', wardenPhone: '8924833325', address: 'Campus Block-E' } });
  const rooms = { BOYS: [], GIRLS: [] };
  for (const [h, key] of [[boysHostel, 'BOYS'], [girlsHostel, 'GIRLS']]) {
    for (let f = 1; f <= 2; f++) for (let n = 1; n <= 6; n++) {
      rooms[key].push(await prisma.hostelRoom.create({ data: { hostelId: h.id, roomNo: `${key[0]}${f}0${n}`, floor: f, capacity: 4, monthlyFee: n <= 2 ? 9500 : 8000 } }));
    }
  }

  // ───────────────── Students & parents
  const demoParentPwd = await hash('9876543210');
  const demoParent = await prisma.user.create({ data: { schoolId, role: 'PARENT', name: 'Rajesh Kumar Pandey', phone: '9876543210', email: 'parent@rajschool.in', passwordHash: demoParentPwd } });
  const students = [];
  let admNo = 0;
  const roomFill = new Map();
  const parentPwd = await hash('parent123');
  for (const s of sections) {
    const count = s.grade.order <= 3 ? between(10, 13) : s.grade.order >= 14 ? between(12, 15) : between(13, 17);
    for (let i = 0; i < count; i++) {
      admNo++;
      const female = rand() < 0.47;
      const sur = pick(SUR);
      const age = 3 + s.grade.order;
      const fatherFirst = pick(MALE_ADULT);
      const fatherPhone = `9${between(100000000, 999999999)}`;
      const data = {
        schoolId, admissionNo: `RES${String(10000 + admNo)}`,
        firstName: female ? pick(GIRL) : pick(BOY), lastName: sur, gender: female ? 'FEMALE' : 'MALE',
        dob: utcDay(session.startDate.getUTCFullYear() - age, between(0, 11), between(1, 28)),
        bloodGroup: pick(['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-']), category: pick(['GEN', 'GEN', 'OBC', 'OBC', 'SC', 'EWS']), religion: pick(['Hindu', 'Hindu', 'Hindu', 'Hindu', 'Muslim', 'Sikh', 'Buddhist']),
        gradeId: s.gradeId, sectionId: s.id, rollNo: i + 1, admissionDate: utcDay(session.startDate.getUTCFullYear() - between(0, Math.min(10, s.grade.order)), 3, between(1, 20)),
        address: `${between(1, 300)}, ${pick(LOCALITIES)}, Varanasi`, city: 'Varanasi',
        fatherName: `${fatherFirst} ${sur}`, fatherPhone, fatherOccupation: pick(OCC), fatherEmail: rand() < 0.4 ? `${fatherFirst.toLowerCase()}.${sur.toLowerCase()}${between(1, 99)}@gmail.com` : null,
        motherName: `${pick(FEMALE_ADULT)} ${sur}`, motherPhone: rand() < 0.6 ? `8${between(100000000, 999999999)}` : null, motherOccupation: pick(['Homemaker', 'Homemaker', 'Teacher', 'Business', 'Doctor', 'Government Service']),
      };
      // Demo parent gets two children (Class VIII-A and Class III-A)
      const isDemoChild = (s.grade.name === 'VIII' && s.name === 'A' && i === 0) || (s.grade.name === 'III' && s.name === 'A' && i === 0);
      if (isDemoChild) Object.assign(data, { fatherName: 'Rajesh Kumar Pandey', fatherPhone: '9876543210', lastName: 'Pandey', motherName: 'Sunita Pandey', fatherEmail: 'parent@rajschool.in', fatherOccupation: 'Business', parentUserId: demoParent.id });
      else if (rand() < 0.35) {
        const p = await prisma.user.create({ data: { schoolId, role: 'PARENT', name: data.fatherName, phone: fatherPhone, email: `${fatherPhone}@parent.local`, passwordHash: parentPwd } });
        data.parentUserId = p.id;
      }
      if (rand() < 0.32) data.transportStopId = pick(stops).id;
      if (s.grade.order >= 9 && !data.transportStopId && rand() < 0.15) data.isHosteller = true;
      const st = await prisma.student.create({ data });
      students.push({ ...st, grade: s.grade, section: s });
      if (st.isHosteller) {
        const list = rooms[female ? 'GIRLS' : 'BOYS'];
        const room = list.find((r) => (roomFill.get(r.id) || 0) < r.capacity);
        if (room) {
          roomFill.set(room.id, (roomFill.get(room.id) || 0) + 1);
          await prisma.hostelAllocation.create({ data: { schoolId, roomId: room.id, studentId: st.id, fromDate: session.startDate } });
        } else await prisma.student.update({ where: { id: st.id }, data: { isHosteller: false } });
      }
    }
  }
  await prisma.counter.upsert({ where: { schoolId_key: { schoolId, key: 'admission-no' } }, create: { schoolId, key: 'admission-no', value: admNo }, update: { value: admNo } });
  const studentLoginUser = await prisma.user.create({ data: { schoolId, role: 'STUDENT', name: 'Student Demo', email: 'student@rajschool.in', passwordHash: await hash('Student@123') } });
  const demoKid = students.find((s) => s.parentUserId === demoParent.id && s.grade.name === 'VIII');
  await prisma.student.update({ where: { id: demoKid.id }, data: { userId: studentLoginUser.id } });
  await prisma.user.update({ where: { id: studentLoginUser.id }, data: { name: `${demoKid.firstName} ${demoKid.lastName}` } });
  console.log(`  ✔ ${students.length} students, ${staff.length + teachers.length} staff`);

  // ───────────────── Events / holidays / calendar
  const Y = session.startDate.getUTCFullYear();
  const events = [
    ['Summer Vacation', 'ग्रीष्मावकाश', 'HOLIDAY', utcDay(Y, 4, 20), utcDay(Y, 5, 30)],
    ['Independence Day Celebration', 'स्वतंत्रता दिवस समारोह', 'EVENT', utcDay(Y, 7, 15), null],
    ['Unit Test 1', 'इकाई परीक्षा 1', 'EXAM', utcDay(Y, 6, 20), utcDay(Y, 6, 25)],
    ['Half Yearly Examination', 'अर्धवार्षिक परीक्षा', 'EXAM', utcDay(Y, 8, 21), utcDay(Y, 9, 3)],
    ['Dussehra Holidays', 'दशहरा अवकाश', 'HOLIDAY', utcDay(Y, 9, 19), utcDay(Y, 9, 21)],
    ['Diwali Holidays', 'दीपावली अवकाश', 'HOLIDAY', utcDay(Y, 10, 7), utcDay(Y, 10, 10)],
    ["Children's Day Celebration", 'बाल दिवस समारोह', 'EVENT', utcDay(Y, 10, 14), null],
    ['Parent-Teacher Meeting (Half Yearly Results)', 'अभिभावक-शिक्षक बैठक', 'PTM', utcDay(Y, 10, 21), null],
    ['Dev Deepawali & Guru Nanak Jayanti', 'देव दीपावली एवं गुरु नानक जयंती', 'HOLIDAY', utcDay(Y, 10, 24), null],
    ['Annual Sports Meet', 'वार्षिक खेल-कूद प्रतियोगिता', 'ACTIVITY', utcDay(Y, 11, 5), utcDay(Y, 11, 6)],
    ['Unit Test 2', 'इकाई परीक्षा 2', 'EXAM', utcDay(Y, 11, 14), utcDay(Y, 11, 19)],
    ['Abhivyakti — Annual Function', 'अभिव्यक्ति — वार्षिक समारोह', 'EVENT', utcDay(Y, 11, 22), null],
    ['Winter Break', 'शीतकालीन अवकाश', 'HOLIDAY', utcDay(Y, 11, 25), utcDay(Y + 1, 0, 5)],
    ['Republic Day Celebration', 'गणतंत्र दिवस समारोह', 'EVENT', utcDay(Y + 1, 0, 26), null],
    ['Pre-Board Examination (X & XII)', 'प्री-बोर्ड परीक्षा (X और XII)', 'EXAM', utcDay(Y + 1, 0, 12), utcDay(Y + 1, 0, 24)],
    ['Annual Examination', 'वार्षिक परीक्षा', 'EXAM', utcDay(Y + 1, 1, 26), utcDay(Y + 1, 2, 12)],
  ];
  await prisma.event.createMany({ data: events.map(([title, titleHi, type, startDate, endDate]) => ({ schoolId, title, titleHi, type, startDate, endDate })) });
  const holidays = events.filter((e) => e[2] === 'HOLIDAY').map((e) => [e[3], e[4] || e[3]]);
  const isHoliday = (d) => d.getUTCDay() === 0 || holidays.some(([a, b]) => d >= a && d <= b);

  // ───────────────── Notices (fresh, bilingual)
  const today = new Date();
  const ago = (n) => new Date(today.getTime() - n * 864e5);
  const notices = [
    ['Admissions Open for Session 2027-28', 'सत्र 2027-28 के लिए प्रवेश प्रारंभ', 'Online registration for Play Group to Class IX & XI is now open. Apply through the school website. Limited seats available.', 'प्ले ग्रुप से कक्षा IX व XI तक ऑनलाइन पंजीकरण प्रारंभ हो गया है। विद्यालय की वेबसाइट से आवेदन करें। सीटें सीमित हैं।', 'NEWS', 'ALL', true, 1],
    ["Children's Day Celebration — 14 November", 'बाल दिवस समारोह — 14 नवंबर', "Children's Day will be celebrated on Saturday, 14th November with cultural programmes and games. Students may come in colourful dress.", 'बाल दिवस शनिवार, 14 नवंबर को सांस्कृतिक कार्यक्रमों और खेलों के साथ मनाया जाएगा। विद्यार्थी रंगीन पोशाक में आ सकते हैं।', 'CIRCULAR', 'ALL', true, 2],
    ['Winter Uniform from 16 November', '16 नवंबर से शीतकालीन गणवेश', 'All students must wear the prescribed winter uniform (navy blue blazer and sweater) from Monday, 16th November.', 'सभी विद्यार्थी सोमवार, 16 नवंबर से निर्धारित शीतकालीन गणवेश (नेवी ब्लू ब्लेज़र और स्वेटर) पहनें।', 'CIRCULAR', 'PARENTS', false, 3],
    ['Dev Deepawali Holiday', 'देव दीपावली अवकाश', 'The school will remain closed on 24th November on account of Dev Deepawali and Guru Nanak Jayanti.', 'देव दीपावली एवं गुरु नानक जयंती के उपलक्ष्य में 24 नवंबर को विद्यालय बंद रहेगा।', 'NOTICE', 'ALL', false, 4],
    ['Parent-Teacher Meeting — Half Yearly Results', 'अभिभावक-शिक्षक बैठक — अर्धवार्षिक परिणाम', 'PTM for discussing Half Yearly results will be held on Saturday, 21st November from 9:00 AM to 12:30 PM. Parents are requested to attend.', 'अर्धवार्षिक परिणामों पर चर्चा हेतु अभिभावक-शिक्षक बैठक शनिवार, 21 नवंबर को प्रातः 9:00 से 12:30 बजे तक होगी। अभिभावकों से उपस्थित होने का अनुरोध है।', 'NOTICE', 'PARENTS', false, 5],
    ['Fee Reminder — November 2026', 'शुल्क अनुस्मारक — नवंबर 2026', 'Parents are requested to deposit the fee for November by the 10th. Pay online from the parent portal or at the corporate office counter.', 'अभिभावकों से अनुरोध है कि नवंबर माह का शुल्क 10 तारीख तक जमा करें। अभिभावक पोर्टल से ऑनलाइन या कॉर्पोरेट कार्यालय काउंटर पर भुगतान करें।', 'NOTICE', 'PARENTS', false, 9],
    ['Students meet the President of India', 'विद्यार्थियों ने राष्ट्रपति से भेंट की', "Our students met Hon'ble President Smt. Droupadi Murmu at Rashtrapati Bhavan on Children's Day — a proud moment for the Raj family.", "हमारे विद्यार्थियों ने बाल दिवस पर राष्ट्रपति भवन में माननीय राष्ट्रपति श्रीमती द्रौपदी मुर्मु से भेंट की — राज परिवार के लिए गौरव का क्षण।", 'ACHIEVEMENT', 'ALL', true, 12],
    ['Annual Sports Meet Registrations', 'वार्षिक खेल प्रतियोगिता पंजीकरण', 'Students interested in athletics, kabaddi, kho-kho and basketball may register with their PE teacher by 25th November.', 'एथलेटिक्स, कबड्डी, खो-खो और बास्केटबॉल में रुचि रखने वाले विद्यार्थी 25 नवंबर तक अपने शारीरिक शिक्षा शिक्षक के पास पंजीकरण कराएँ।', 'CIRCULAR', 'STUDENTS', false, 6],
    ['Half Yearly Results Declared', 'अर्धवार्षिक परिणाम घोषित', 'Half Yearly examination results are now available in the parent portal. Report cards can be downloaded online.', 'अर्धवार्षिक परीक्षा के परिणाम अब अभिभावक पोर्टल पर उपलब्ध हैं। रिपोर्ट कार्ड ऑनलाइन डाउनलोड किए जा सकते हैं।', 'NEWS', 'ALL', false, 15],
    ['CBSE Class X Result 2025 — 95.7%', 'सीबीएसई कक्षा X परिणाम 2025 — 95.7%', 'Congratulations to all students! Our Class X pass percentage rose to 95.7% and Class XII to 84.5% in the 2025 board examinations.', 'सभी विद्यार्थियों को बधाई! 2025 की बोर्ड परीक्षा में हमारा कक्षा X का उत्तीर्ण प्रतिशत 95.7% और कक्षा XII का 84.5% रहा।', 'ACHIEVEMENT', 'ALL', false, 120],
  ];
  await prisma.notice.createMany({ data: notices.map(([title, titleHi, body, bodyHi, category, audience, isPinned, daysAgo]) => ({ schoolId, title, titleHi, body, bodyHi, category, audience, isPinned, publishDate: ago(daysAgo) })) });

  // ───────────────── Attendance: every school day of the session up to today
  const todayKey = utcDay(today.getFullYear(), today.getMonth(), today.getDate());
  const att = [];
  const studentRate = new Map(students.map((s) => [s.id, 0.86 + rand() * 0.13]));
  for (let d = new Date(session.startDate); d <= todayKey; d = new Date(d.getTime() + 864e5)) {
    if (isHoliday(d)) continue;
    const isToday = d.getTime() === todayKey.getTime();
    for (const s of students) {
      if (isToday && s.section.name === 'B') continue; // leave some sections unmarked today for the demo
      const r = rand();
      const rate = studentRate.get(s.id);
      const status = r < rate ? (rand() < 0.04 ? 'LATE' : 'PRESENT') : rand() < 0.3 ? 'LEAVE' : 'ABSENT';
      att.push({ schoolId, studentId: s.id, sectionId: s.sectionId, date: new Date(d), status, markedBy: 'Class Teacher' });
    }
  }
  for (let i = 0; i < att.length; i += 2000) await prisma.studentAttendance.createMany({ data: att.slice(i, i + 2000) });
  const allStaff = [...staff, ...teachers];
  const satt = [];
  for (let d = new Date(session.startDate); d <= todayKey; d = new Date(d.getTime() + 864e5)) {
    if (isHoliday(d)) continue;
    for (const s of allStaff) {
      const r = rand();
      satt.push({ schoolId, staffId: s.id, date: new Date(d), status: r < 0.95 ? 'PRESENT' : r < 0.98 ? 'LEAVE' : 'ABSENT', inTime: `07:${between(30, 55)}`, outTime: `14:${between(10, 50)}` });
    }
  }
  for (let i = 0; i < satt.length; i += 2000) await prisma.staffAttendance.createMany({ data: satt.slice(i, i + 2000) });
  console.log(`  ✔ ${att.length} student + ${satt.length} staff attendance records`);

  // ───────────────── Fees: structure, invoices, payments
  const heads = Object.fromEntries((await prisma.feeHead.findMany({ where: { schoolId } })).map((h) => [h.name, h]));
  const tuitionFor = (o) => (o <= 3 ? 2200 : o <= 8 ? 2600 : o <= 11 ? 3000 : o <= 13 ? 3400 : 3900);
  const structure = [];
  for (const g of grades) {
    structure.push({ feeHeadId: heads['Tuition Fee'].id, amount: tuitionFor(g.order) });
    if (g.order >= 4) structure.push({ feeHeadId: heads['Computer Fee'].id, amount: g.order >= 12 ? 500 : 300 });
    structure.push({ feeHeadId: heads['Development Fee'].id, amount: g.order <= 3 ? 4500 : 6000 });
    if (g.order >= 4) structure.push({ feeHeadId: heads['Exam Fee'].id, amount: g.order >= 12 ? 2000 : 1500 });
    for (const x of structure.splice(0)) await prisma.feeStructure.create({ data: { schoolId, academicYearId: year.id, gradeId: g.id, ...x } });
  }
  // Concessions: sibling (10% tuition) and staff ward (50% tuition)
  const concessionFor = new Map();
  for (const s of students) {
    if (s.parentUserId === demoParent.id && s.grade.name === 'III') concessionFor.set(s.id, ['PERCENT', 10, 'Sibling concession']);
    else if (rand() < 0.04) concessionFor.set(s.id, ['PERCENT', 50, 'Staff ward']);
    else if (rand() < 0.04) concessionFor.set(s.id, ['FLAT', 500, 'Merit scholarship']);
  }
  for (const [studentId, [type, value, reason]] of concessionFor) await prisma.concession.create({ data: { schoolId, studentId, feeHeadId: heads['Tuition Fee'].id, type, value, reason } });

  const routeFee = Object.fromEntries((await prisma.routeStop.findMany({ include: { route: true } })).map((s) => [s.id, s.route.monthlyFee]));
  const allocs = Object.fromEntries((await prisma.hostelAllocation.findMany({ where: { schoolId }, include: { room: true } })).map((a) => [a.studentId, a.room.monthlyFee]));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const periods = [];
  for (let d = new Date(session.startDate); d <= today; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) periods.push([d.getUTCFullYear(), d.getUTCMonth() + 1]);
  let invNo = 0, rcptNo = 0;
  const methods = ['CASH', 'CASH', 'UPI', 'UPI', 'UPI', 'ONLINE', 'CARD', 'CHEQUE', 'BANK_TRANSFER'];
  const collectors = ['Reena Singh', 'Shahana Chhaterji', 'Online'];
  for (const s of students) {
    const payer = rand(); // payment behaviour profile
    for (const [y, m] of periods) {
      const items = [{ feeHeadId: heads['Tuition Fee'].id, name: 'Tuition Fee', amount: tuitionFor(s.grade.order) }];
      if (s.grade.order >= 4) items.push({ feeHeadId: heads['Computer Fee'].id, name: 'Computer Fee', amount: s.grade.order >= 12 ? 500 : 300 });
      if (m === 4) {
        items.push({ feeHeadId: heads['Development Fee'].id, name: 'Development Fee', amount: s.grade.order <= 3 ? 4500 : 6000 });
        if (s.grade.order >= 4) items.push({ feeHeadId: heads['Exam Fee'].id, name: 'Exam Fee', amount: s.grade.order >= 12 ? 2000 : 1500 });
      }
      if (s.transportStopId) items.push({ feeHeadId: null, name: 'Transport Fee', amount: routeFee[s.transportStopId] });
      if (allocs[s.id]) items.push({ feeHeadId: null, name: 'Hostel Fee', amount: allocs[s.id] });
      const subtotal = items.reduce((a, b) => a + b.amount, 0);
      const c = concessionFor.get(s.id);
      const discount = c ? Math.round(c[0] === 'PERCENT' ? (items[0].amount * c[1]) / 100 : c[1]) : 0;
      const total = subtotal - discount;
      invNo++;
      const dueDate = utcDay(y, m - 1, 10);
      const monthsAgo = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m);
      // Older months mostly paid; recent months partially
      const payProb = monthsAgo >= 3 ? 0.97 : monthsAgo === 2 ? 0.9 : monthsAgo === 1 ? 0.78 : 0.42;
      const isDemo = s.parentUserId === demoParent.id;
      let paid = 0;
      const pays = [];
      if ((isDemo ? monthsAgo >= 1 : payer < payProb + 0.02 && rand() < payProb)) {
        const partial = !isDemo && rand() < 0.06;
        const amt = partial ? Math.round(total / 2) : total;
        rcptNo++;
        const payDay = Math.min(28, between(1, 15));
        let paidAt = new Date(y, m - 1, payDay, between(9, 14), between(0, 59));
        if (paidAt > today) paidAt = new Date(today.getTime() - between(1, 8) * 36e5);
        const method = pick(methods);
        pays.push({ schoolId, studentId: s.id, receiptNo: `RES-${y}-${String(rcptNo).padStart(5, '0')}`, amount: amt, method, reference: method === 'CASH' ? null : `TXN${between(10000000, 99999999)}`, paidAt, collectedBy: method === 'ONLINE' ? 'Online' : pick(collectors.slice(0, 2)) });
        paid = amt;
      }
      const inv = await prisma.feeInvoice.create({
        data: { schoolId, studentId: s.id, invoiceNo: `RESINV-${y}-${String(invNo).padStart(5, '0')}`, period: `${y}-${String(m).padStart(2, '0')}`, title: `Fee for ${MON[m - 1]} ${y}`, dueDate, items: JSON.stringify(items), subtotal, discount, total, paid, status: paid === 0 ? 'UNPAID' : paid >= total ? 'PAID' : 'PARTIAL', issueDate: utcDay(y, m - 1, 1) },
      });
      if (pays.length) await prisma.feePayment.createMany({ data: pays.map((p) => ({ ...p, invoiceId: inv.id })) });
    }
  }
  await prisma.counter.createMany({ data: [{ schoolId, key: 'invoice', value: invNo }, { schoolId, key: 'receipt', value: rcptNo }] });
  console.log(`  ✔ ${invNo} fee invoices, ${rcptNo} receipts`);

  // ───────────────── Expenses (last 7 months)
  const expCats = [['Electricity', 45000, 85000], ['Maintenance & Repairs', 15000, 60000], ['Stationery & Printing', 8000, 25000], ['Transport Fuel', 60000, 95000], ['Events & Functions', 10000, 120000], ['Internet & Software', 6000, 12000], ['Housekeeping', 20000, 35000], ['Hostel Mess', 90000, 140000], ['Sports Equipment', 5000, 30000]];
  for (const [y, m] of periods) for (const [cat, a, b] of expCats) {
    if (rand() < 0.15) continue;
    await prisma.expense.create({ data: { schoolId, category: cat, amount: between(a, b), date: new Date(y, m - 1, between(3, 26)), paidTo: pick(['PVVNL', 'Sharma Traders', 'Kashi Stationers', 'HP Petrol Pump', 'Jio Fiber', 'Varanasi Caterers', 'Local Vendor']), method: pick(['BANK_TRANSFER', 'CHEQUE', 'UPI', 'CASH']), description: `${cat} — ${MON[m - 1]} ${y}` } });
  }

  // ───────────────── Payroll: all completed months paid
  for (const [y, m] of periods.slice(0, -1)) {
    const month = `${y}-${String(m).padStart(2, '0')}`;
    await prisma.payslip.createMany({ data: allStaff.map((s) => ({ schoolId, staffId: s.id, month, basic: s.basicSalary, allowances: s.allowances, deductions: s.deductions, leaveDeduction: 0, net: s.basicSalary + s.allowances - s.deductions, status: 'PAID', paidAt: new Date(y, m, 1) })) });
  }

  // ───────────────── Exams, schedules, marks
  const examDefs = [
    ['Unit Test 1', 'UNIT_TEST', utcDay(Y, 6, 20), utcDay(Y, 6, 25), 25, true],
    ['Half Yearly Examination', 'HALF_YEARLY', utcDay(Y, 8, 21), utcDay(Y, 9, 3), 80, true],
    ['Unit Test 2', 'UNIT_TEST', utcDay(Y, 11, 14), utcDay(Y, 11, 19), 25, false],
    ['Annual Examination', 'ANNUAL', utcDay(Y + 1, 1, 26), utcDay(Y + 1, 2, 12), 80, false],
  ];
  const ability = new Map(students.map((s) => [s.id, 0.45 + rand() * 0.5]));
  for (const [name, type, startDate, endDate, max, done] of examDefs) {
    const exam = await prisma.exam.create({ data: { schoolId, academicYearId: year.id, name, type, startDate, endDate, isPublished: done } });
    const gradeSubjects = new Map();
    for (const s of sections) {
      if (s.grade.order < 4) continue;
      for (const ss of sectionSubjects[s.id]) gradeSubjects.set(`${s.gradeId}|${ss.subject.id}`, [s.gradeId, ss.subject.id]);
    }
    let dayOffset = 0;
    const sched = [];
    for (const [, [gradeId, subjectId]] of gradeSubjects) {
      sched.push({ schoolId, examId: exam.id, gradeId, subjectId, date: new Date(startDate.getTime() + (dayOffset++ % 6) * 864e5), startTime: '09:00', maxMarks: max, passMarks: Math.round(max * 0.33) });
    }
    await prisma.examSchedule.createMany({ data: sched });
    if (!done) continue;
    const marks = [];
    for (const st of students) {
      if (st.grade.order < 4) continue;
      for (const ss of sectionSubjects[st.sectionId]) {
        const absent = rand() < 0.01;
        const pct = Math.min(1, Math.max(0.18, ability.get(st.id) + (rand() - 0.5) * 0.25));
        const mo = absent ? null : Math.round(pct * max * 2) / 2;
        const p = mo == null ? null : (mo / max) * 100;
        const g = absent ? 'AB' : p >= 91 ? 'A1' : p >= 81 ? 'A2' : p >= 71 ? 'B1' : p >= 61 ? 'B2' : p >= 51 ? 'C1' : p >= 41 ? 'C2' : p >= 33 ? 'D' : 'E';
        marks.push({ schoolId, examId: exam.id, studentId: st.id, subjectId: ss.subject.id, marksObtained: mo, maxMarks: max, grade: g, isAbsent: absent });
      }
    }
    for (let i = 0; i < marks.length; i += 2000) await prisma.mark.createMany({ data: marks.slice(i, i + 2000) });
  }

  // ───────────────── Homework (recent)
  const hwTitles = { English: 'Write an essay on "My Favourite Festival"', Hindi: 'पाठ 5 के प्रश्न-उत्तर लिखें', Mathematics: 'Solve Exercise 6.2 (Q1–Q10)', Science: 'Draw and label the human digestive system', 'Social Science': 'Map work: Rivers of India', Physics: 'Numericals on Laws of Motion (NCERT 5.1–5.10)', Chemistry: 'Balance the given chemical equations', Biology: 'Notes on Cell Division with diagrams', 'Computer Science': 'Write a Python program to find factorial', 'Environmental Studies': 'Collect 5 different leaves and paste them', 'General Knowledge': 'List 10 national symbols of India', Sanskrit: 'शब्द रूप — बालक, लता', 'Physical Education': 'Rules of Kabaddi — write a short note' };
  for (const s of sections) {
    if (s.grade.order < 4) continue;
    for (const ss of sectionSubjects[s.id].slice(0, 3)) {
      await prisma.homework.create({ data: { schoolId, sectionId: s.id, subjectId: ss.subject.id, teacherId: ss.teacher?.id, title: hwTitles[ss.subject.name] || `Revise ${ss.subject.name} chapter`, description: 'Complete in your notebook and submit on the due date.', assignedDate: ago(between(0, 4)), dueDate: new Date(today.getTime() + between(1, 5) * 864e5) } });
    }
  }

  // ───────────────── Library
  const books = [
    ['Wings of Fire', 'A.P.J. Abdul Kalam', 'Biography'], ['The Discovery of India', 'Jawaharlal Nehru', 'History'], ['Godan', 'Munshi Premchand', 'Hindi Literature'], ['Gitanjali', 'Rabindranath Tagore', 'Poetry'],
    ['Malgudi Days', 'R.K. Narayan', 'Fiction'], ['Panchatantra', 'Vishnu Sharma', 'Children'], ['NCERT Physics Part 1 (XI)', 'NCERT', 'Textbook'], ['NCERT Chemistry Part 1 (XII)', 'NCERT', 'Textbook'],
    ['Concepts of Physics Vol 1', 'H.C. Verma', 'Reference'], ['Concepts of Physics Vol 2', 'H.C. Verma', 'Reference'], ['RD Sharma Mathematics X', 'R.D. Sharma', 'Reference'], ['Lucent General Knowledge', 'Lucent', 'General Knowledge'],
    ['Harry Potter and the Philosopher\'s Stone', 'J.K. Rowling', 'Fiction'], ['The Jungle Book', 'Rudyard Kipling', 'Children'], ['Ignited Minds', 'A.P.J. Abdul Kalam', 'Inspiration'], ['Madhushala', 'Harivansh Rai Bachchan', 'Hindi Literature'],
    ['Ramcharitmanas', 'Goswami Tulsidas', 'Hindi Literature'], ['A Brief History of Time', 'Stephen Hawking', 'Science'], ['The Story of My Experiments with Truth', 'M.K. Gandhi', 'Biography'], ['Oxford Advanced Learner\'s Dictionary', 'Oxford', 'Reference'],
    ['India After Gandhi', 'Ramachandra Guha', 'History'], ['Computer Science with Python (XII)', 'Sumita Arora', 'Textbook'], ['Tales from Shakespeare', 'Charles Lamb', 'Fiction'], ['Chandrakanta', 'Devaki Nandan Khatri', 'Hindi Literature'],
    ['Atlas of the World', 'Oxford', 'Reference'], ['Biology for Class XII', 'Trueman', 'Reference'], ['Kashi Ka Assi', 'Kashinath Singh', 'Hindi Literature'], ['The Alchemist', 'Paulo Coelho', 'Fiction'],
  ];
  const bookRows = [];
  for (const [i, [title, author, category]] of books.entries()) {
    const copies = between(2, 8);
    bookRows.push(await prisma.book.create({ data: { schoolId, title, author, category, isbn: `978${between(1000000000, 9999999999)}`, publisher: pick(['Rupa', 'Penguin', 'NCERT', 'Bharti Bhawan', 'Arihant', 'Rajkamal']), rack: `R${Math.floor(i / 6) + 1}-S${(i % 6) + 1}`, copies, available: copies } }));
  }
  const seniors = students.filter((s) => s.grade.order >= 8);
  for (let i = 0; i < 26; i++) {
    const b = pick(bookRows);
    const fresh = await prisma.book.findUnique({ where: { id: b.id } });
    if (fresh.available < 1) continue;
    const issued = ago(between(2, 30));
    const returned = i < 8;
    await prisma.bookIssue.create({ data: { schoolId, bookId: b.id, studentId: pick(seniors).id, issueDate: issued, dueDate: new Date(issued.getTime() + 14 * 864e5), status: returned ? 'RETURNED' : 'ISSUED', returnDate: returned ? new Date(issued.getTime() + between(5, 16) * 864e5) : null, fine: returned ? between(0, 1) * 4 : 0 } });
    if (!returned) await prisma.book.update({ where: { id: b.id }, data: { available: { decrement: 1 } } });
  }

  // ───────────────── Inventory
  const inv = [
    ['Whiteboard Markers', 'Stationery', 'box', 12, 20, 'Store Room A', 350], ['A4 Paper Rim', 'Stationery', 'rim', 85, 40, 'Store Room A', 260], ['Chalk Box', 'Stationery', 'box', 64, 30, 'Store Room A', 45],
    ['Student Desk (Dual)', 'Furniture', 'pcs', 1240, 50, 'Blocks A–C', 3800], ['Teacher Chair', 'Furniture', 'pcs', 96, 10, 'Blocks A–C', 1600], ['Interactive Panel 75"', 'IT Equipment', 'pcs', 120, 5, 'Classrooms', 145000],
    ['Desktop Computer', 'IT Equipment', 'pcs', 60, 5, 'Computer Lab', 42000], ['Projector', 'IT Equipment', 'pcs', 4, 5, 'AV Room', 38000], ['Basketball', 'Sports', 'pcs', 6, 10, 'Sports Room', 1200],
    ['Football', 'Sports', 'pcs', 14, 8, 'Sports Room', 900], ['Cricket Kit', 'Sports', 'set', 5, 3, 'Sports Room', 6500], ['Beakers 250ml', 'Lab Consumables', 'pcs', 140, 50, 'Chemistry Lab', 90],
    ['Test Tubes', 'Lab Consumables', 'pcs', 35, 100, 'Chemistry Lab', 12], ['First Aid Kit', 'Medical', 'kit', 9, 10, 'Infirmary', 1500], ['Fire Extinguisher', 'Safety', 'pcs', 48, 40, 'All Blocks', 2800],
  ];
  for (const [name, category, unit, quantity, minQuantity, location, unitPrice] of inv) {
    const it = await prisma.inventoryItem.create({ data: { schoolId, name, category, unit, quantity, minQuantity, location, unitPrice } });
    await prisma.inventoryTxn.create({ data: { itemId: it.id, type: 'IN', qty: quantity, date: session.startDate, note: 'Opening stock' } });
  }

  // ───────────────── Admissions: enquiries & applications
  const gradeNames = grades.map((g) => g.name);
  const enqStatus = ['NEW', 'NEW', 'NEW', 'CONTACTED', 'CONTACTED', 'VISITED', 'CONVERTED', 'CLOSED'];
  for (let i = 0; i < 18; i++) {
    const n = `${pick([...MALE_ADULT, ...FEMALE_ADULT])} ${pick(SUR)}`;
    await prisma.enquiry.create({ data: { schoolId, name: n, phone: `9${between(100000000, 999999999)}`, email: rand() < 0.5 ? `${n.split(' ')[0].toLowerCase()}${between(10, 99)}@gmail.com` : null, gradeSought: pick(['Play Group', 'Nursery', 'LKG', 'I', 'VI', 'IX', 'XI']), message: pick(['Want to know fee structure', 'Is hostel available for girls?', 'Transport from Cantt area?', 'Admission test date?', 'Please call back in the evening']), source: pick(['WEBSITE', 'WEBSITE', 'WALK_IN', 'PHONE', 'REFERRAL', 'SOCIAL']), status: pick(enqStatus), followUpDate: new Date(today.getTime() + between(-2, 6) * 864e5), createdAt: ago(between(0, 25)) } });
  }
  const appStatus = ['SUBMITTED', 'SUBMITTED', 'UNDER_REVIEW', 'UNDER_REVIEW', 'TEST_SCHEDULED', 'APPROVED', 'REJECTED'];
  for (let i = 0; i < 14; i++) {
    const female = rand() < 0.5;
    const sur = pick(SUR);
    const st = pick(appStatus);
    await prisma.admissionApplication.create({ data: { schoolId, regNo: `REG${Y + 1}${String(i + 1).padStart(4, '0')}`, studentName: `${female ? pick(GIRL) : pick(BOY)} ${sur}`, gender: female ? 'FEMALE' : 'MALE', dob: utcDay(Y - between(3, 15), between(0, 11), between(1, 28)), gradeSought: pick(['Play Group', 'Nursery', 'LKG', 'I', 'II', 'VI', 'IX', 'XI']), fatherName: `${pick(MALE_ADULT)} ${sur}`, fatherPhone: `9${between(100000000, 999999999)}`, fatherOccupation: pick(OCC), motherName: `${pick(FEMALE_ADULT)} ${sur}`, permanentAddress: `${between(1, 200)}, ${pick(LOCALITIES)}, Varanasi`, previousSchool: rand() < 0.5 ? pick(['St. Mary\'s Convent', 'DPS Varanasi', 'Kendriya Vidyalaya', 'Sunbeam School', 'Local Primary School']) : null, registrationFee: 500, feePaid: st !== 'SUBMITTED', paymentRef: st !== 'SUBMITTED' ? `pay_${between(10000000, 99999999)}` : null, status: st, testDate: st === 'TEST_SCHEDULED' ? new Date(today.getTime() + 5 * 864e5) : null, hostelRequired: rand() < 0.2, transportRequired: rand() < 0.5, createdAt: ago(between(0, 20)) } });
  }
  await prisma.counter.create({ data: { schoolId, key: 'admission-reg', value: 14 } });

  // ───────────────── Leaves, messages, TCs
  const pendingStaff = teachers.slice(2, 5);
  for (const t of pendingStaff) await prisma.leaveRequest.create({ data: { schoolId, staffId: t.id, type: pick(['CASUAL', 'SICK']), fromDate: new Date(today.getTime() + between(1, 6) * 864e5), toDate: new Date(today.getTime() + between(7, 9) * 864e5), reason: pick(['Family function', 'Medical appointment', 'Personal work']) } });
  await prisma.leaveRequest.create({ data: { schoolId, studentId: demoKid.id, type: 'OTHER', fromDate: new Date(today.getTime() + 3 * 864e5), toDate: new Date(today.getTime() + 4 * 864e5), reason: 'Attending a family wedding in Prayagraj' } });
  const adminUser = await prisma.user.findFirst({ where: { schoolId, role: 'SCHOOL_ADMIN' } });
  await prisma.message.createMany({ data: [
    { schoolId, senderId: adminUser.id, audience: 'ALL_PARENTS', channel: 'APP', subject: 'Welcome to the new Parent Portal', body: 'Dear Parents, you can now view attendance, homework, results and pay fees online from the Raj English School parent portal.', createdAt: ago(5) },
    { schoolId, senderId: adminUser.id, audience: 'ALL_STAFF', channel: 'APP', subject: 'Staff meeting on Saturday', body: 'All teaching staff are requested to attend a meeting in the conference hall at 1:45 PM on Saturday regarding Unit Test 2 preparation.', createdAt: ago(2) },
    { schoolId, senderId: adminUser.id, audience: 'INDIVIDUAL', recipientId: demoParent.id, channel: 'APP', subject: 'Appreciation for your ward', body: `Dear Parent, we are happy to share that ${demoKid.firstName} has shown excellent improvement in Mathematics this term. Keep encouraging!`, createdAt: ago(1) },
  ] });
  for (let i = 1; i <= 3; i++) {
    const n = `${pick(BOY)} ${pick(SUR)}`;
    await prisma.transferCertificate.create({ data: { schoolId, tcNo: `TC/${Y}/${String(i).padStart(4, '0')}`, studentName: n, fatherName: `${pick(MALE_ADULT)} ${n.split(' ')[1]}`, admissionNo: `RES2018${String(900 + i).padStart(4, '0')}`, className: pick(['X', 'XII', 'VIII']), dob: utcDay(2009, between(0, 11), between(1, 28)), leavingDate: utcDay(Y, 3, between(1, 28)), issueDate: utcDay(Y, 4, between(1, 28)), reason: pick(['Passed Class XII', 'Parents transferred', 'Higher studies']), conduct: 'Good' } });
  }
  await prisma.counter.create({ data: { schoolId, key: 'tc', value: 3 } });
  await prisma.counter.create({ data: { schoolId, key: 'employee', value: emp } });

  console.log('\n✅ Seed complete.\n');
  console.log('  Website ............ http://localhost:5174');
  console.log('  Super Admin (SaaS) . admin@rnygroups.com / Admin@123');
  console.log('  School Admin ....... admin@rajschool.in / Admin@123');
  console.log('  Principal .......... principal@rajschool.in / Principal@123');
  console.log('  Teacher ............ teacher@rajschool.in / Teacher@123');
  console.log('  Accountant ......... accounts@rajschool.in / Accounts@123');
  console.log('  Reception .......... reception@rajschool.in / Reception@123');
  console.log('  Librarian .......... library@rajschool.in / Library@123');
  console.log('  Parent ............. 9876543210 / 9876543210');
  console.log('  Student ............ student@rajschool.in / Student@123\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
