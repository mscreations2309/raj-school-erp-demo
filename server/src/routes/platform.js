// SaaS owner (RnY Groups) console: tenants, plans, subscriptions, billing.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma, nextNumber, pad, contains } from '../lib/prisma.js';
import { ah, notFound, badRequest, paging } from '../lib/http.js';
import { authorize, ALL_MODULES, publicUser } from '../lib/auth.js';
import { provisionSchool } from '../lib/provision.js';
import { audit } from '../lib/audit.js';
import { moveToBin, recordStatusDelete } from '../lib/recycle.js';

const r = Router();
r.use(authorize('SUPER_ADMIN'));

r.get(
  '/stats',
  ah(async (_req, res) => {
    const [schools, byStatus, students, staff, users, subs, unpaid, paidAgg, recent] = await Promise.all([
      prisma.school.count(),
      prisma.school.groupBy({ by: ['status'], _count: true }),
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.staff.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count(),
      prisma.subscription.findMany({ where: { status: 'ACTIVE' }, include: { plan: true } }),
      prisma.saasInvoice.aggregate({ where: { status: 'UNPAID' }, _sum: { amount: true }, _count: true }),
      prisma.saasInvoice.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.school.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { plan: true } }),
    ]);
    const arr = subs.reduce((s, x) => s + (x.billingCycle === 'MONTHLY' ? x.amount * 12 : x.amount), 0);
    res.json({
      schools,
      byStatus: Object.fromEntries(byStatus.map((b) => [b.status, b._count])),
      students, staff, users,
      arr, mrr: Math.round(arr / 12),
      outstanding: unpaid._sum.amount || 0, outstandingCount: unpaid._count,
      collected: paidAgg._sum.amount || 0,
      recent,
    });
  }),
);

// ── Schools (tenants)
r.get(
  '/schools',
  ah(async (req, res) => {
    const { skip, take, page, pageSize } = paging(req.query);
    const where = {};
    if (req.query.q) where.OR = [{ name: contains(req.query.q) }, { slug: contains(req.query.q) }, { city: contains(req.query.q) }];
    if (req.query.status) where.status = req.query.status;
    const [items, total] = await Promise.all([
      prisma.school.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: { plan: true, _count: { select: { students: true, staff: true, users: true } } },
      }),
      prisma.school.count({ where }),
    ]);
    res.json({ items, total, page, pageSize });
  }),
);

r.get(
  '/schools/:id',
  ah(async (req, res) => {
    const school = await prisma.school.findUnique({
      where: { id: req.params.id },
      include: {
        plan: true,
        subscriptions: { include: { plan: true }, orderBy: { startDate: 'desc' } },
        saasInvoices: { orderBy: { createdAt: 'desc' } },
        users: { where: { role: { in: ['SCHOOL_ADMIN', 'PRINCIPAL'] } } },
        _count: { select: { students: true, staff: true, users: true, feePayments: true } },
      },
    });
    if (!school) throw notFound();
    school.users = school.users.map(publicUser);
    res.json(school);
  }),
);

const onboardSchema = z.object({
  name: z.string().min(3),
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/, 'Slug: 3-40 lowercase letters, numbers, hyphens'),
  board: z.string().default('CBSE'),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  affiliationNo: z.string().optional(),
  planCode: z.string().default('GROWTH'),
  status: z.enum(['TRIAL', 'ACTIVE']).default('TRIAL'),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
  adminPhone: z.string().optional(),
});

r.post(
  '/schools',
  ah(async (req, res) => {
    const d = onboardSchema.parse(req.body);
    if (await prisma.school.findUnique({ where: { slug: d.slug } })) throw badRequest('This slug is already taken');
    const { school, adminUser } = await provisionSchool({
      school: {
        name: d.name, slug: d.slug, board: d.board, city: d.city, state: d.state, phone: d.phone,
        email: d.email || null, address: d.address, affiliationNo: d.affiliationNo, status: d.status,
      },
      admin: { name: d.adminName, email: d.adminEmail, password: d.adminPassword, phone: d.adminPhone },
      planCode: d.planCode,
    });
    audit(req, 'ONBOARD_SCHOOL', 'School', school.id, { slug: d.slug });
    res.status(201).json({ school, admin: publicUser(adminUser) });
  }),
);

r.put(
  '/schools/:id',
  ah(async (req, res) => {
    const d = z
      .object({
        name: z.string().optional(), status: z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED']).optional(),
        planId: z.string().optional(), customDomain: z.string().nullable().optional(), trialEndsAt: z.string().nullable().optional(),
        city: z.string().optional(), phone: z.string().optional(), email: z.string().optional(),
      })
      .parse(req.body);
    const data = { ...d };
    if (d.trialEndsAt !== undefined) data.trialEndsAt = d.trialEndsAt ? new Date(d.trialEndsAt) : null;
    if (d.customDomain === '') data.customDomain = null;
    const s = await prisma.school.update({ where: { id: req.params.id }, data, include: { plan: true } });
    audit(req, 'UPDATE_SCHOOL', 'School', s.id, d);
    res.json(s);
  }),
);

r.delete(
  '/schools/:id',
  ah(async (req, res) => {
    const s = await prisma.school.findUnique({ where: { id: req.params.id } });
    if (!s) throw notFound();
    if ((req.body?.confirm || req.query.confirm) !== s.slug) throw badRequest(`Type the school slug "${s.slug}" to confirm`);
    if (s.status === 'CANCELLED') throw badRequest('School is already deleted (see Recycle Bin)');
    // Never hard delete a school: it is deactivated (all data kept, logins blocked) and listed in the Recycle Bin
    await prisma.school.update({ where: { id: s.id }, data: { status: 'CANCELLED' } });
    const entry = await recordStatusDelete(req, { schoolId: s.id, entityType: 'School', entityId: s.id, label: `School: ${s.name} (${s.slug})`, reason: req.body?.reason, restore: { model: 'School', id: s.id, data: { status: s.status } } });
    audit(req, 'MOVE_TO_RECYCLE_BIN', 'School', s.id, { slug: s.slug, entry: entry.id });
    res.json({ ok: true, recycleBinEntryId: entry.id });
  }),
);

r.post(
  '/schools/:id/reset-admin-password',
  ah(async (req, res) => {
    const { password } = z.object({ password: z.string().min(6) }).parse(req.body);
    const admin = await prisma.user.findFirst({ where: { schoolId: req.params.id, role: 'SCHOOL_ADMIN' }, orderBy: { createdAt: 'asc' } });
    if (!admin) throw notFound('No admin user for this school');
    await prisma.user.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(password, 10), isActive: true } });
    audit(req, 'RESET_ADMIN_PASSWORD', 'School', req.params.id);
    res.json({ ok: true, email: admin.email });
  }),
);

// ── Plans
r.get('/modules', (_req, res) => res.json(ALL_MODULES));
r.get('/plans', ah(async (_req, res) => {
  const plans = await prisma.plan.findMany({ orderBy: { priceYearly: 'asc' }, include: { _count: { select: { schools: true } } } });
  res.json({ items: plans, total: plans.length });
}));

const planSchema = z.object({
  code: z.string().min(2).transform((s) => s.toUpperCase()),
  name: z.string().min(2),
  description: z.string().optional(),
  priceMonthly: z.coerce.number().min(0),
  priceYearly: z.coerce.number().min(0),
  maxStudents: z.coerce.number().int().min(1),
  maxStaff: z.coerce.number().int().min(1),
  modules: z.array(z.enum(ALL_MODULES)).or(z.string().transform((s) => JSON.parse(s))),
  isActive: z.coerce.boolean().default(true),
});

r.post('/plans', ah(async (req, res) => {
  const d = planSchema.parse(req.body);
  res.status(201).json(await prisma.plan.create({ data: { ...d, modules: JSON.stringify(d.modules) } }));
}));
r.put('/plans/:id', ah(async (req, res) => {
  const d = planSchema.partial().parse(req.body);
  if (d.modules) d.modules = JSON.stringify(d.modules);
  res.json(await prisma.plan.update({ where: { id: req.params.id }, data: d }));
}));
r.delete('/plans/:id', ah(async (req, res) => {
  const used = await prisma.school.count({ where: { planId: req.params.id } });
  if (used) throw badRequest(`Plan is used by ${used} school(s)`);
  await moveToBin(req, { roots: [{ model: 'Plan', ids: [req.params.id] }], reason: req.body?.reason });
  res.json({ ok: true });
}));

// ── Subscriptions & billing
r.post(
  '/schools/:id/subscribe',
  ah(async (req, res) => {
    const d = z.object({ planId: z.string(), billingCycle: z.enum(['MONTHLY', 'YEARLY']), months: z.coerce.number().int().min(1).max(36).optional() }).parse(req.body);
    const plan = await prisma.plan.findUnique({ where: { id: d.planId } });
    if (!plan) throw notFound('Plan not found');
    const months = d.months || (d.billingCycle === 'YEARLY' ? 12 : 1);
    const amount = d.billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly * months;
    const start = new Date();
    const end = new Date(start); end.setMonth(end.getMonth() + months);
    await prisma.subscription.updateMany({ where: { schoolId: req.params.id, status: 'ACTIVE' }, data: { status: 'EXPIRED' } });
    const sub = await prisma.subscription.create({ data: { schoolId: req.params.id, planId: plan.id, billingCycle: d.billingCycle, amount, startDate: start, endDate: end } });
    await prisma.school.update({ where: { id: req.params.id }, data: { planId: plan.id, status: 'ACTIVE' } });
    const n = await nextNumber('PLATFORM', 'saas-invoice');
    const invoice = await prisma.saasInvoice.create({
      data: { schoolId: req.params.id, invoiceNo: `RNY-${start.getFullYear()}-${pad(n, 4)}`, period: `${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`, amount, dueDate: new Date(Date.now() + 15 * 864e5) },
    });
    audit(req, 'SUBSCRIBE', 'School', req.params.id, { plan: plan.code, amount });
    res.status(201).json({ subscription: sub, invoice });
  }),
);

r.get('/invoices', ah(async (req, res) => {
  const where = req.query.status ? { status: req.query.status } : {};
  const items = await prisma.saasInvoice.findMany({ where, include: { school: { select: { name: true, slug: true } } }, orderBy: { createdAt: 'desc' } });
  res.json({ items, total: items.length });
}));

r.post('/invoices/:id/mark-paid', ah(async (req, res) => {
  const inv = await prisma.saasInvoice.update({ where: { id: req.params.id }, data: { status: 'PAID', paidAt: new Date() } });
  audit(req, 'SAAS_INVOICE_PAID', 'SaasInvoice', inv.id);
  res.json(inv);
}));

r.get('/audit', ah(async (req, res) => {
  const { skip, take, page, pageSize } = paging(req.query);
  const where = req.query.schoolId ? { schoolId: req.query.schoolId } : {};
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { school: { select: { name: true } } } }),
    prisma.auditLog.count({ where }),
  ]);
  res.json({ items, total, page, pageSize });
}));

export default r;
