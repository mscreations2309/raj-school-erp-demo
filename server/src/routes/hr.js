// Staff, user logins, leave management and payroll.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma, nextNumber, pad, contains } from '../lib/prisma.js';
import { ah, notFound, badRequest, paging } from '../lib/http.js';
import { authorize, requireModule, ADMINS, STAFF_ROLES, publicUser } from '../lib/auth.js';
import { sanitize } from '../lib/crud.js';
import { audit } from '../lib/audit.js';
import { toCSV } from '../lib/csv.js';

const r = Router();

// ───────── Staff ─────────
const staff = Router();
staff.use(requireModule('staff'));
const staffInc = { user: { select: { id: true, email: true, role: true, isActive: true, lastLoginAt: true } } };

staff.get('/', authorize(STAFF_ROLES), ah(async (req, res) => {
  const where = { schoolId: req.schoolId };
  if (req.query.status) where.status = req.query.status; else where.status = { not: 'RESIGNED' };
  if (req.query.staffType) where.staffType = req.query.staffType;
  if (req.query.department) where.department = req.query.department;
  if (req.query.q) where.OR = [{ firstName: contains(req.query.q) }, { lastName: contains(req.query.q) }, { employeeId: contains(req.query.q) }, { designation: contains(req.query.q) }, { phone: contains(req.query.q) }];
  if (req.query.all === '1') {
    const items = await prisma.staff.findMany({ where, include: staffInc, orderBy: { firstName: 'asc' } });
    return res.json({ items, total: items.length });
  }
  const { skip, take, page, pageSize } = paging(req.query);
  const [items, total] = await Promise.all([
    prisma.staff.findMany({ where, include: staffInc, orderBy: { firstName: 'asc' }, skip, take }),
    prisma.staff.count({ where }),
  ]);
  res.json({ items, total, page, pageSize });
}));

staff.get('/export', authorize(ADMINS), ah(async (req, res) => {
  const items = await prisma.staff.findMany({ where: { schoolId: req.schoolId }, orderBy: { firstName: 'asc' } });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="staff.csv"');
  res.send(toCSV(items, [['Emp ID', 'employeeId'], ['First Name', 'firstName'], ['Last Name', 'lastName'], ['Designation', 'designation'], ['Department', 'department'], ['Type', 'staffType'], ['Phone', 'phone'], ['Email', 'email'], ['Qualification', 'qualification'], ['Joining', 'joiningDate'], ['Basic', 'basicSalary'], ['Status', 'status']]));
}));

staff.get('/:id', authorize(STAFF_ROLES), ah(async (req, res) => {
  const s = await prisma.staff.findFirst({
    where: { id: req.params.id, schoolId: req.schoolId },
    include: {
      ...staffInc,
      classSections: { include: { grade: true } },
      subjects: { include: { subject: true, section: { include: { grade: true } } } },
      payslips: { orderBy: { month: 'desc' }, take: 12 },
      leaves: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!s) throw notFound();
  if (!ADMINS.includes(req.user.role) && req.user.role !== 'SUPER_ADMIN' && s.userId !== req.user.id) {
    delete s.basicSalary; delete s.bankAccount; delete s.pan; s.payslips = [];
  }
  res.json(s);
}));

staff.post('/', authorize(ADMINS), ah(async (req, res) => {
  const data = sanitize('Staff', { ...req.body, employeeId: req.body.employeeId || 'AUTO' }, { deny: ['userId'] });
  if (!req.body.employeeId) data.employeeId = `EMP${pad(await nextNumber(req.schoolId, 'employee'), 4)}`;
  const s = await prisma.staff.create({ data: { ...data, schoolId: req.schoolId } });
  let login = null;
  if (req.body.loginRole && (s.email || s.phone)) login = await createLogin(req, s, req.body.loginRole, req.body.loginPassword);
  audit(req, 'CREATE', 'Staff', s.id);
  res.status(201).json({ ...s, login });
}));

staff.put('/:id', authorize(ADMINS), ah(async (req, res) => {
  const existing = await prisma.staff.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!existing) throw notFound();
  const data = sanitize('Staff', req.body, { partial: true, deny: ['userId'] });
  const s = await prisma.staff.update({ where: { id: existing.id }, data, include: staffInc });
  if (data.status === 'RESIGNED' && s.userId) await prisma.user.update({ where: { id: s.userId }, data: { isActive: false } });
  audit(req, 'UPDATE', 'Staff', s.id, Object.keys(data));
  res.json(s);
}));

staff.delete('/:id', authorize(ADMINS), ah(async (req, res) => {
  const existing = await prisma.staff.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!existing) throw notFound();
  await prisma.staff.update({ where: { id: existing.id }, data: { status: 'RESIGNED' } });
  if (existing.userId) await prisma.user.update({ where: { id: existing.userId }, data: { isActive: false } });
  audit(req, 'DELETE', 'Staff', existing.id);
  res.json({ ok: true });
}));

async function createLogin(req, s, role, password) {
  const allowed = ['SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN'];
  if (!allowed.includes(role)) throw badRequest('Invalid role');
  const pwd = password || `${s.firstName.replace(/\s/g, '')}@${(s.phone || '1234').slice(-4)}`;
  const email = (s.email || `${s.employeeId}@staff.local`).toLowerCase();
  let user = s.userId ? await prisma.user.findUnique({ where: { id: s.userId } }) : null;
  const passwordHash = await bcrypt.hash(pwd, 10);
  if (user) user = await prisma.user.update({ where: { id: user.id }, data: { role, passwordHash, isActive: true } });
  else {
    user = await prisma.user.create({ data: { schoolId: req.schoolId, name: `${s.firstName} ${s.lastName || ''}`.trim(), email, phone: s.phone, role, passwordHash } });
    await prisma.staff.update({ where: { id: s.id }, data: { userId: user.id } });
  }
  return { email: user.email, phone: user.phone, password: pwd, role };
}

staff.post('/:id/login', authorize(ADMINS), ah(async (req, res) => {
  const s = await prisma.staff.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!s) throw notFound();
  const { role, password } = z.object({ role: z.string(), password: z.string().min(6).optional() }).parse(req.body);
  const login = await createLogin(req, s, role, password);
  audit(req, 'STAFF_LOGIN', 'Staff', s.id, { role });
  res.json(login);
}));

r.use('/staff', staff);

// ───────── Users (all logins of the school) ─────────
const users = Router();
users.use(authorize(ADMINS));
users.get('/', ah(async (req, res) => {
  const where = { schoolId: req.schoolId };
  if (req.query.role) where.role = req.query.role;
  if (req.query.q) where.OR = [{ name: contains(req.query.q) }, { email: contains(req.query.q) }, { phone: contains(req.query.q) }];
  const { skip, take, page, pageSize } = paging(req.query);
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);
  res.json({ items: items.map(publicUser), total, page, pageSize });
}));
users.post('/', ah(async (req, res) => {
  const d = z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().optional(), role: z.enum(['SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN']), password: z.string().min(6) }).parse(req.body);
  const u = await prisma.user.create({ data: { schoolId: req.schoolId, name: d.name, email: d.email.toLowerCase(), phone: d.phone, role: d.role, passwordHash: await bcrypt.hash(d.password, 10) } });
  audit(req, 'CREATE', 'User', u.id);
  res.status(201).json(publicUser(u));
}));
users.put('/:id', ah(async (req, res) => {
  const u = await prisma.user.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!u) throw notFound();
  const body = { ...req.body, password: req.body.password || undefined, phone: req.body.phone || undefined };
  const d = z.object({ name: z.string().optional(), phone: z.string().optional(), role: z.enum(['SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN', 'PARENT', 'STUDENT']).optional(), isActive: z.boolean().optional(), password: z.string().min(6).optional() }).parse(body);
  if (u.id === req.user.id && d.isActive === false) throw badRequest('You cannot disable your own account');
  const data = { name: d.name, phone: d.phone, role: d.role, isActive: d.isActive };
  if (d.password) data.passwordHash = await bcrypt.hash(d.password, 10);
  const updated = await prisma.user.update({ where: { id: u.id }, data });
  audit(req, 'UPDATE', 'User', u.id, Object.keys(d));
  res.json(publicUser(updated));
}));
r.use('/users', users);

// ───────── Leave ─────────
const leaves = Router();
leaves.get('/', authorize(STAFF_ROLES), ah(async (req, res) => {
  const where = { schoolId: req.schoolId };
  if (!ADMINS.includes(req.user.role) && req.user.role !== 'SUPER_ADMIN') {
    const me = await prisma.staff.findFirst({ where: { userId: req.user.id } });
    where.staffId = me?.id || '__none__';
  }
  if (req.query.status) where.status = req.query.status;
  const items = await prisma.leaveRequest.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 300,
    include: { staff: { select: { firstName: true, lastName: true, designation: true } }, student: { select: { firstName: true, lastName: true, admissionNo: true } } },
  });
  res.json({ items, total: items.length });
}));
leaves.post('/', authorize(STAFF_ROLES), ah(async (req, res) => {
  const d = z.object({ staffId: z.string().optional(), type: z.string().default('CASUAL'), fromDate: z.string(), toDate: z.string(), reason: z.string().min(3) }).parse(req.body);
  let staffId = d.staffId;
  if (!ADMINS.includes(req.user.role) || !staffId) {
    const me = await prisma.staff.findFirst({ where: { userId: req.user.id, schoolId: req.schoolId } });
    if (!me) throw badRequest('Your login is not linked to a staff profile');
    staffId = me.id;
  } else if (!(await prisma.staff.findFirst({ where: { id: staffId, schoolId: req.schoolId } }))) throw badRequest('Invalid staff');
  if (new Date(d.toDate) < new Date(d.fromDate)) throw badRequest('To date must be after from date');
  const l = await prisma.leaveRequest.create({ data: { schoolId: req.schoolId, staffId, type: d.type, fromDate: new Date(d.fromDate), toDate: new Date(d.toDate), reason: d.reason } });
  res.status(201).json(l);
}));
leaves.put('/:id/review', authorize(ADMINS), ah(async (req, res) => {
  const { status } = z.object({ status: z.enum(['APPROVED', 'REJECTED']) }).parse(req.body);
  const l = await prisma.leaveRequest.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!l) throw notFound();
  const updated = await prisma.leaveRequest.update({ where: { id: l.id }, data: { status, reviewedBy: req.user.name } });
  // Approved staff leave → mark staff attendance as LEAVE for each day
  if (status === 'APPROVED' && l.staffId) {
    const ops = [];
    for (let d = new Date(l.fromDate); d <= l.toDate; d = new Date(d.getTime() + 864e5)) {
      const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      ops.push(prisma.staffAttendance.upsert({
        where: { staffId_date: { staffId: l.staffId, date: day } },
        create: { schoolId: req.schoolId, staffId: l.staffId, date: day, status: 'LEAVE' },
        update: { status: 'LEAVE' },
      }));
    }
    await prisma.$transaction(ops);
  }
  audit(req, `LEAVE_${status}`, 'LeaveRequest', l.id);
  res.json(updated);
}));
r.use('/leaves', leaves);

// ───────── Payroll ─────────
const payroll = Router();
payroll.use(requireModule('payroll'), authorize([...ADMINS, 'ACCOUNTANT']));
payroll.get('/', ah(async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const items = await prisma.payslip.findMany({
    where: { schoolId: req.schoolId, month }, orderBy: { staff: { firstName: 'asc' } },
    include: { staff: { select: { firstName: true, lastName: true, employeeId: true, designation: true, bankAccount: true, ifsc: true } } },
  });
  const totals = items.reduce((t, p) => ({ gross: t.gross + p.basic + p.allowances, deductions: t.deductions + p.deductions + p.leaveDeduction, net: t.net + p.net, paid: t.paid + (p.status === 'PAID' ? p.net : 0) }), { gross: 0, deductions: 0, net: 0, paid: 0 });
  res.json({ month, items, totals });
}));
payroll.post('/generate', ah(async (req, res) => {
  const { month } = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(req.body);
  const [y, m] = month.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1)), to = new Date(Date.UTC(y, m, 0));
  const daysInMonth = to.getUTCDate();
  const staffList = await prisma.staff.findMany({ where: { schoolId: req.schoolId, status: { not: 'RESIGNED' } } });
  const absences = await prisma.staffAttendance.groupBy({ by: ['staffId'], where: { schoolId: req.schoolId, date: { gte: from, lte: to }, status: 'ABSENT' }, _count: true });
  const absMap = Object.fromEntries(absences.map((a) => [a.staffId, a._count]));
  let created = 0;
  for (const s of staffList) {
    const exists = await prisma.payslip.findUnique({ where: { staffId_month: { staffId: s.id, month } } });
    if (exists?.status === 'PAID') continue;
    const leaveDeduction = Math.round(((s.basicSalary + s.allowances) / daysInMonth) * (absMap[s.id] || 0));
    const net = Math.max(0, s.basicSalary + s.allowances - s.deductions - leaveDeduction);
    await prisma.payslip.upsert({
      where: { staffId_month: { staffId: s.id, month } },
      create: { schoolId: req.schoolId, staffId: s.id, month, basic: s.basicSalary, allowances: s.allowances, deductions: s.deductions, leaveDeduction, net },
      update: { basic: s.basicSalary, allowances: s.allowances, deductions: s.deductions, leaveDeduction, net },
    });
    created++;
  }
  audit(req, 'GENERATE_PAYROLL', 'Payslip', null, { month, created });
  res.json({ generated: created });
}));
payroll.post('/:id/pay', ah(async (req, res) => {
  const p = await prisma.payslip.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!p) throw notFound();
  const updated = await prisma.payslip.update({ where: { id: p.id }, data: { status: 'PAID', paidAt: new Date() } });
  audit(req, 'PAY_SALARY', 'Payslip', p.id);
  res.json(updated);
}));
payroll.post('/pay-all', ah(async (req, res) => {
  const { month } = z.object({ month: z.string() }).parse(req.body);
  const { count } = await prisma.payslip.updateMany({ where: { schoolId: req.schoolId, month, status: 'GENERATED' }, data: { status: 'PAID', paidAt: new Date() } });
  res.json({ paid: count });
}));
payroll.get('/:id', ah(async (req, res) => {
  const p = await prisma.payslip.findFirst({ where: { id: req.params.id, schoolId: req.schoolId }, include: { staff: true, school: true } });
  if (!p) throw notFound();
  res.json(p);
}));
r.use('/payroll', payroll);

export default r;
