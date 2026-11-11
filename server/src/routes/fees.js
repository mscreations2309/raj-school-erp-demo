import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma, nextNumber, pad, contains } from '../lib/prisma.js';
import { ah, notFound, badRequest, forbidden, paging, parseJSON } from '../lib/http.js';
import { authorize, requireModule, ADMINS } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import { toCSV } from '../lib/csv.js';

const r = Router();
r.use(requireModule('fees'));
const ACC = [...ADMINS, 'ACCOUNTANT'];
const COLLECT = [...ACC, 'RECEPTIONIST'];
const METHODS = ['CASH', 'UPI', 'CARD', 'ONLINE', 'CHEQUE', 'BANK_TRANSFER'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const appliesInMonth = (freq, month) => {
  if (freq === 'MONTHLY') return true;
  if (freq === 'QUARTERLY') return [4, 7, 10, 1].includes(month);
  if (freq === 'ANNUAL') return month === 4;
  return false; // ONE_TIME → added manually / at admission
};

/** Build invoice line items for a student for a period (YYYY-MM). */
export async function buildInvoiceItems(schoolId, student, period, year) {
  const month = Number(period.split('-')[1]);
  const [structures, concessions] = await Promise.all([
    prisma.feeStructure.findMany({ where: { schoolId, academicYearId: year.id, gradeId: student.gradeId }, include: { feeHead: true } }),
    prisma.concession.findMany({ where: { studentId: student.id, isActive: true } }),
  ]);
  const items = [];
  for (const fs of structures) {
    if (!appliesInMonth(fs.feeHead.frequency, month)) continue;
    if (/transport/i.test(fs.feeHead.name) && !student.transportStopId) continue;
    if (/hostel/i.test(fs.feeHead.name) && !student.isHosteller) continue;
    items.push({ feeHeadId: fs.feeHeadId, name: fs.feeHead.name, amount: fs.amount });
  }
  // Transport fee from route when no structure line exists
  if (student.transportStopId && !items.some((i) => /transport/i.test(i.name))) {
    const stop = await prisma.routeStop.findUnique({ where: { id: student.transportStopId }, include: { route: true } });
    if (stop?.route.monthlyFee) items.push({ feeHeadId: null, name: `Transport Fee (${stop.route.name})`, amount: stop.route.monthlyFee });
  }
  if (student.isHosteller && !items.some((i) => /hostel/i.test(i.name))) {
    const alloc = await prisma.hostelAllocation.findFirst({ where: { studentId: student.id, isActive: true }, include: { room: true } });
    if (alloc?.room.monthlyFee) items.push({ feeHeadId: null, name: 'Hostel Fee', amount: alloc.room.monthlyFee });
  }
  const subtotal = items.reduce((a, b) => a + b.amount, 0);
  let discount = 0;
  for (const c of concessions) {
    const base = c.feeHeadId ? items.filter((i) => i.feeHeadId === c.feeHeadId).reduce((a, b) => a + b.amount, 0) : subtotal;
    discount += c.type === 'PERCENT' ? (base * c.value) / 100 : Math.min(base, c.value);
  }
  return { items, subtotal, discount: Math.round(Math.min(discount, subtotal)) };
}

r.post('/generate', authorize(ACC), ah(async (req, res) => {
  const d = z.object({ period: z.string().regex(/^\d{4}-\d{2}$/, 'period must be YYYY-MM'), gradeId: z.string().optional(), dueDate: z.string().optional() }).parse(req.body);
  const year = await prisma.academicYear.findFirst({ where: { schoolId: req.schoolId, isCurrent: true } });
  if (!year) throw badRequest('Set a current academic year first');
  const settings = parseJSON(req.school.settings, {});
  const [y, m] = d.period.split('-').map(Number);
  const dueDate = d.dueDate ? new Date(d.dueDate) : new Date(Date.UTC(y, m - 1, settings.feeDueDay || 10));
  const students = await prisma.student.findMany({ where: { schoolId: req.schoolId, status: 'ACTIVE', ...(d.gradeId ? { gradeId: d.gradeId } : {}), gradeId: d.gradeId || { not: null } } });
  const existing = new Set((await prisma.feeInvoice.findMany({ where: { schoolId: req.schoolId, period: d.period }, select: { studentId: true } })).map((x) => x.studentId));
  let created = 0, skipped = 0;
  for (const s of students) {
    if (existing.has(s.id)) { skipped++; continue; }
    const { items, subtotal, discount } = await buildInvoiceItems(req.schoolId, s, d.period, year);
    if (!items.length) { skipped++; continue; }
    const n = await nextNumber(req.schoolId, 'invoice');
    await prisma.feeInvoice.create({
      data: {
        schoolId: req.schoolId, studentId: s.id, invoiceNo: `${settings.invoicePrefix || 'INV'}-${y}-${pad(n, 5)}`, period: d.period,
        title: `Fee for ${MONTHS[m - 1]} ${y}`, dueDate, items: JSON.stringify(items), subtotal, discount, total: subtotal - discount,
      },
    });
    created++;
  }
  audit(req, 'GENERATE_INVOICES', 'FeeInvoice', null, { period: d.period, created });
  res.json({ created, skipped });
}));

r.post('/invoices', authorize(ACC), ah(async (req, res) => {
  const d = z.object({
    studentId: z.string(), title: z.string().min(2), dueDate: z.string(),
    items: z.array(z.object({ name: z.string(), amount: z.coerce.number().positive(), feeHeadId: z.string().nullable().optional() })).min(1),
    discount: z.coerce.number().min(0).default(0),
  }).parse(req.body);
  const s = await prisma.student.findFirst({ where: { id: d.studentId, schoolId: req.schoolId } });
  if (!s) throw badRequest('Invalid student');
  const settings = parseJSON(req.school.settings, {});
  const subtotal = d.items.reduce((a, b) => a + b.amount, 0);
  const n = await nextNumber(req.schoolId, 'invoice');
  const inv = await prisma.feeInvoice.create({
    data: {
      schoolId: req.schoolId, studentId: s.id, invoiceNo: `${settings.invoicePrefix || 'INV'}-${new Date().getFullYear()}-${pad(n, 5)}`,
      period: `ADHOC-${pad(n, 5)}`, title: d.title, dueDate: new Date(d.dueDate), items: JSON.stringify(d.items),
      subtotal, discount: Math.min(d.discount, subtotal), total: subtotal - Math.min(d.discount, subtotal),
    },
  });
  audit(req, 'CREATE', 'FeeInvoice', inv.id);
  res.status(201).json(inv);
}));

function invoiceWhere(req) {
  const q = req.query;
  const where = { schoolId: req.schoolId };
  if (q.status) where.status = q.status.includes(',') ? { in: q.status.split(',') } : q.status;
  if (q.period) where.period = q.period;
  if (q.studentId) where.studentId = q.studentId;
  const st = {};
  if (q.gradeId) st.gradeId = q.gradeId;
  if (q.sectionId) st.sectionId = q.sectionId;
  if (q.q) st.OR = [{ firstName: contains(q.q) }, { lastName: contains(q.q) }, { admissionNo: contains(q.q) }, { fatherPhone: contains(q.q) }];
  if (Object.keys(st).length) where.student = st;
  return where;
}

r.get('/invoices', authorize(COLLECT), ah(async (req, res) => {
  const where = invoiceWhere(req);
  const { skip, take, page, pageSize } = paging(req.query);
  const [items, total, agg] = await Promise.all([
    prisma.feeInvoice.findMany({ where, skip, take, orderBy: [{ period: 'desc' }, { invoiceNo: 'desc' }], include: { student: { include: { grade: true, section: true } } } }),
    prisma.feeInvoice.count({ where }),
    prisma.feeInvoice.aggregate({ where, _sum: { total: true, paid: true } }),
  ]);
  res.json({ items, total, page, pageSize, sum: { total: agg._sum.total || 0, paid: agg._sum.paid || 0 } });
}));

r.get('/invoices/:id', authorize(COLLECT), ah(async (req, res) => {
  const inv = await prisma.feeInvoice.findFirst({ where: { id: req.params.id, schoolId: req.schoolId }, include: { student: { include: { grade: true, section: true } }, payments: true } });
  if (!inv) throw notFound();
  res.json(inv);
}));

r.post('/invoices/:id/cancel', authorize(ACC), ah(async (req, res) => {
  const inv = await prisma.feeInvoice.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!inv) throw notFound();
  if (inv.paid > 0) throw badRequest('Cannot cancel an invoice that has payments');
  const updated = await prisma.feeInvoice.update({ where: { id: inv.id }, data: { status: 'CANCELLED' } });
  audit(req, 'CANCEL', 'FeeInvoice', inv.id);
  res.json(updated);
}));

/** Record a payment against an invoice. Shared by counter collection and online (parent) payments. */
export async function recordPayment({ schoolId, school, invoiceId, amount, method, reference, remarks, collectedBy, fine = 0 }) {
  return prisma.$transaction(async (tx) => {
    const inv = await tx.feeInvoice.findFirst({ where: { id: invoiceId, schoolId } });
    if (!inv) throw notFound('Invoice not found');
    if (inv.status === 'CANCELLED') throw badRequest('Invoice is cancelled');
    const newTotal = inv.total + (fine || 0);
    const due = newTotal - inv.paid;
    if (due <= 0) throw badRequest('Invoice is already fully paid');
    if (amount <= 0 || amount > due + 0.001) throw badRequest(`Amount must be between 1 and ${due}`);
    const settings = parseJSON(school?.settings, {});
    const n = await nextNumber(schoolId, 'receipt', tx);
    const payment = await tx.feePayment.create({
      data: { schoolId, invoiceId: inv.id, studentId: inv.studentId, receiptNo: `${settings.receiptPrefix || 'RCPT'}-${new Date().getFullYear()}-${pad(n, 5)}`, amount, method, reference, remarks, collectedBy },
    });
    const paid = inv.paid + amount;
    await tx.feeInvoice.update({
      where: { id: inv.id },
      data: { paid, fine: inv.fine + (fine || 0), total: newTotal, status: paid >= newTotal - 0.001 ? 'PAID' : 'PARTIAL' },
    });
    return payment;
  });
}

r.post('/collect', authorize(COLLECT), ah(async (req, res) => {
  const d = z.object({
    invoiceId: z.string(), amount: z.coerce.number().positive(), method: z.enum(METHODS),
    reference: z.string().optional(), remarks: z.string().optional(), fine: z.coerce.number().min(0).default(0),
  }).parse(req.body);
  const payment = await recordPayment({ ...d, schoolId: req.schoolId, school: req.school, collectedBy: req.user.name });
  audit(req, 'COLLECT_FEE', 'FeePayment', payment.id, { amount: d.amount, method: d.method });
  res.status(201).json(payment);
}));

r.get('/payments', authorize(COLLECT), ah(async (req, res) => {
  const where = { schoolId: req.schoolId };
  if (req.query.from || req.query.to) where.paidAt = { ...(req.query.from && { gte: new Date(req.query.from) }), ...(req.query.to && { lte: new Date(`${req.query.to}T23:59:59`) }) };
  if (req.query.method) where.method = req.query.method;
  if (req.query.studentId) where.studentId = req.query.studentId;
  if (req.query.q) where.OR = [{ receiptNo: contains(req.query.q) }, { student: { firstName: contains(req.query.q) } }, { student: { admissionNo: contains(req.query.q) } }];
  if (req.query.format === 'csv') {
    const items = await prisma.feePayment.findMany({ where, orderBy: { paidAt: 'desc' }, include: { student: { include: { grade: true, section: true } }, invoice: true } });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="fee-collection.csv"');
    return res.send(toCSV(items, [['Receipt', 'receiptNo'], ['Date', (p) => p.paidAt.toISOString().slice(0, 10)], ['Adm No', (p) => p.student.admissionNo], ['Student', (p) => `${p.student.firstName} ${p.student.lastName || ''}`], ['Class', (p) => `${p.student.grade?.name || ''}-${p.student.section?.name || ''}`], ['Invoice', (p) => p.invoice.invoiceNo], ['Amount', 'amount'], ['Method', 'method'], ['Reference', 'reference'], ['Collected By', 'collectedBy']]));
  }
  const { skip, take, page, pageSize } = paging(req.query);
  const [items, total, agg] = await Promise.all([
    prisma.feePayment.findMany({ where, skip, take, orderBy: { paidAt: 'desc' }, include: { student: { include: { grade: true, section: true } }, invoice: { select: { invoiceNo: true, title: true } } } }),
    prisma.feePayment.count({ where }),
    prisma.feePayment.aggregate({ where, _sum: { amount: true } }),
  ]);
  res.json({ items, total, page, pageSize, sum: agg._sum.amount || 0 });
}));

export async function receiptData(schoolId, paymentId) {
  const p = await prisma.feePayment.findFirst({
    where: { id: paymentId, schoolId },
    include: { student: { include: { grade: true, section: true } }, invoice: true, school: true },
  });
  if (!p) throw notFound('Receipt not found');
  const { settings, ...school } = p.school;
  return { ...p, school, invoice: { ...p.invoice, items: parseJSON(p.invoice.items, []) } };
}

r.get('/receipt/:id', authorize(COLLECT), ah(async (req, res) => res.json(await receiptData(req.schoolId, req.params.id))));

r.get('/dues', authorize(COLLECT), ah(async (req, res) => {
  const where = invoiceWhere(req);
  where.status = { in: ['UNPAID', 'PARTIAL'] };
  const invoices = await prisma.feeInvoice.findMany({ where, include: { student: { include: { grade: true, section: true } } } });
  const byStudent = new Map();
  const today = new Date();
  for (const i of invoices) {
    const e = byStudent.get(i.studentId) || { student: i.student, invoices: 0, due: 0, overdue: 0, oldestDue: i.dueDate };
    e.invoices++; e.due += i.total - i.paid;
    if (i.dueDate < today) e.overdue += i.total - i.paid;
    if (i.dueDate < e.oldestDue) e.oldestDue = i.dueDate;
    byStudent.set(i.studentId, e);
  }
  const rows = [...byStudent.values()].sort((a, b) => b.due - a.due);
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="fee-dues.csv"');
    return res.send(toCSV(rows, [['Adm No', (x) => x.student.admissionNo], ['Student', (x) => `${x.student.firstName} ${x.student.lastName || ''}`], ['Class', (x) => `${x.student.grade?.name}-${x.student.section?.name}`], ['Father', (x) => x.student.fatherName], ['Phone', (x) => x.student.fatherPhone], ['Pending Invoices', 'invoices'], ['Total Due', 'due'], ['Overdue', 'overdue']]));
  }
  res.json({ rows, totalDue: rows.reduce((a, b) => a + b.due, 0), students: rows.length });
}));

r.get('/summary', authorize(COLLECT), ah(async (req, res) => {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const since = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const [today, month, byMethod, outstanding, payments] = await Promise.all([
    prisma.feePayment.aggregate({ where: { schoolId: req.schoolId, paidAt: { gte: startToday } }, _sum: { amount: true }, _count: true }),
    prisma.feePayment.aggregate({ where: { schoolId: req.schoolId, paidAt: { gte: startMonth } }, _sum: { amount: true }, _count: true }),
    prisma.feePayment.groupBy({ by: ['method'], where: { schoolId: req.schoolId, paidAt: { gte: startMonth } }, _sum: { amount: true } }),
    prisma.feeInvoice.aggregate({ where: { schoolId: req.schoolId, status: { in: ['UNPAID', 'PARTIAL'] } }, _sum: { total: true, paid: true }, _count: true }),
    prisma.feePayment.findMany({ where: { schoolId: req.schoolId, paidAt: { gte: since } }, select: { amount: true, paidAt: true } }),
  ]);
  const monthly = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthly.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, amount: 0 });
  }
  for (const p of payments) {
    const k = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`;
    const row = monthly.find((x) => x.key === k);
    if (row) row.amount += p.amount;
  }
  res.json({
    today: today._sum.amount || 0, todayCount: today._count,
    month: month._sum.amount || 0, monthCount: month._count,
    byMethod: byMethod.map((x) => ({ method: x.method, amount: x._sum.amount || 0 })),
    outstanding: (outstanding._sum.total || 0) - (outstanding._sum.paid || 0), outstandingInvoices: outstanding._count,
    monthly,
  });
}));

r.get('/student/:studentId', authorize(COLLECT), ah(async (req, res) => {
  const s = await prisma.student.findFirst({ where: { id: req.params.studentId, schoolId: req.schoolId }, include: { grade: true, section: true, concessions: { include: { feeHead: true } } } });
  if (!s) throw notFound();
  const invoices = await prisma.feeInvoice.findMany({ where: { studentId: s.id }, orderBy: { period: 'asc' }, include: { payments: { orderBy: { paidAt: 'asc' } } } });
  res.json({ student: s, invoices: invoices.map((i) => ({ ...i, items: parseJSON(i.items, []) })) });
}));

// ── Accounts: income vs expenses
r.get('/accounts', requireModule('accounts'), authorize(ACC), ah(async (req, res) => {
  const now = new Date();
  const from = req.query.from ? new Date(req.query.from) : new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const to = req.query.to ? new Date(`${req.query.to}T23:59:59`) : now;
  const [income, expenses, byCat] = await Promise.all([
    prisma.feePayment.findMany({ where: { schoolId: req.schoolId, paidAt: { gte: from, lte: to } }, select: { amount: true, paidAt: true } }),
    prisma.expense.findMany({ where: { schoolId: req.schoolId, date: { gte: from, lte: to } }, select: { amount: true, date: true } }),
    prisma.expense.groupBy({ by: ['category'], where: { schoolId: req.schoolId, date: { gte: from, lte: to } }, _sum: { amount: true } }),
  ]);
  const months = {};
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  for (const p of income) (months[key(p.paidAt)] ||= { income: 0, expense: 0 }).income += p.amount;
  for (const e of expenses) (months[key(e.date)] ||= { income: 0, expense: 0 }).expense += e.amount;
  const totalIncome = income.reduce((a, b) => a + b.amount, 0);
  const totalExpense = expenses.reduce((a, b) => a + b.amount, 0);
  res.json({
    totalIncome, totalExpense, net: totalIncome - totalExpense,
    monthly: Object.entries(months).sort().map(([k, v]) => ({ month: k, label: `${MONTHS[Number(k.slice(5)) - 1]} ${k.slice(2, 4)}`, ...v })),
    byCategory: byCat.map((c) => ({ category: c.category, amount: c._sum.amount || 0 })).sort((a, b) => b.amount - a.amount),
  });
}));

// Demo online gateway used by the parent portal (see portal.js).
export const demoGatewayRef = () => 'pay_' + crypto.randomBytes(7).toString('hex');

export default r;
