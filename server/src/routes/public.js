// Public (unauthenticated) API used by each school's website.
// Tenant is resolved from: header x-tenant → ?school= → custom domain → subdomain → DEFAULT_TENANT.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma, nextNumber, pad, contains } from '../lib/prisma.js';
import { ah, HttpError, notFound, badRequest, parseJSON } from '../lib/http.js';
import { upload, saveUpload } from '../lib/upload.js';
import { isDemo } from '../lib/demo.js';

const r = Router();
const formLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30 });

async function resolveTenant(req, _res, next) {
  try {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].toLowerCase();
    let slug = req.headers['x-tenant'] || req.query.school;
    let school = null;
    if (slug) school = await prisma.school.findUnique({ where: { slug: String(slug) } });
    if (!school && host) school = await prisma.school.findFirst({ where: { customDomain: host } });
    if (!school && host.split('.').length > 1 && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      school = await prisma.school.findUnique({ where: { slug: host.split('.')[0] } });
    }
    if (!school && process.env.DEFAULT_TENANT) {
      school = await prisma.school.findUnique({ where: { slug: process.env.DEFAULT_TENANT } });
    }
    if (!school) throw notFound('School website not found');
    if (['SUSPENDED', 'CANCELLED'].includes(school.status)) throw new HttpError(402, 'This website is temporarily unavailable');
    req.tenant = school;
    req.school = school; // used by upload storage
    next();
  } catch (e) {
    next(e);
  }
}

r.use(resolveTenant);

/** Everything the website needs in one call. */
r.get(
  '/site',
  ah(async (req, res) => {
    const schoolId = req.tenant.id;
    const now = new Date();
    const [content, banners, leaders, stats, facilities, testimonials, contacts, notices, events, gallery, results, grades] =
      await Promise.all([
        prisma.siteContent.findMany({ where: { schoolId } }),
        prisma.banner.findMany({ where: { schoolId, isActive: true }, orderBy: { order: 'asc' } }),
        prisma.leader.findMany({ where: { schoolId }, orderBy: { order: 'asc' } }),
        prisma.stat.findMany({ where: { schoolId }, orderBy: { order: 'asc' } }),
        prisma.facility.findMany({ where: { schoolId }, orderBy: { order: 'asc' } }),
        prisma.testimonial.findMany({ where: { schoolId }, orderBy: { order: 'asc' } }),
        prisma.contactPerson.findMany({ where: { schoolId }, orderBy: { order: 'asc' } }),
        prisma.notice.findMany({
          where: { schoolId, isPublic: true, publishDate: { lte: now } },
          orderBy: [{ isPinned: 'desc' }, { publishDate: 'desc' }],
          take: 30,
        }),
        prisma.event.findMany({ where: { schoolId, isPublic: true }, orderBy: { startDate: 'asc' } }),
        prisma.galleryItem.findMany({ where: { schoolId }, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] }),
        prisma.boardResult.findMany({ where: { schoolId }, orderBy: [{ className: 'asc' }, { year: 'asc' }] }),
        prisma.grade.findMany({ where: { schoolId }, orderBy: { order: 'asc' }, select: { id: true, name: true } }),
      ]);
    const { settings, ...school } = req.tenant;
    const s = parseJSON(settings, {});
    res.json({
      demo: isDemo(),
      school: { ...school, registrationFee: s.registrationFee ?? 500, mapEmbed: s.mapEmbed, social: s.social || {} },
      content: Object.fromEntries(content.map((c) => [c.key, { en: c.valueEn, hi: c.valueHi || c.valueEn }])),
      banners, leaders, stats, facilities, testimonials, contacts, notices, events, gallery, results, grades,
    });
  }),
);

r.get(
  '/disclosure',
  ah(async (req, res) => {
    const items = await prisma.disclosureItem.findMany({ where: { schoolId: req.tenant.id }, orderBy: { order: 'asc' } });
    const results = await prisma.boardResult.findMany({ where: { schoolId: req.tenant.id }, orderBy: { year: 'asc' } });
    res.json({ items, results });
  }),
);

r.get(
  '/tc',
  ah(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 3) throw badRequest('Enter TC number or admission number');
    const tc = await prisma.transferCertificate.findFirst({
      where: { schoolId: req.tenant.id, OR: [{ tcNo: q }, { admissionNo: q }] },
      select: { tcNo: true, studentName: true, fatherName: true, admissionNo: true, className: true, dob: true, leavingDate: true, issueDate: true, reason: true, conduct: true, fileUrl: true },
    });
    if (!tc) throw notFound('No Transfer Certificate found with this number');
    res.json(tc);
  }),
);

r.post(
  '/enquiry',
  formLimiter,
  ah(async (req, res) => {
    const data = z
      .object({
        name: z.string().trim().min(2, 'Name is required'),
        phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
        email: z.string().trim().email().optional().or(z.literal('')),
        gradeSought: z.string().optional(),
        message: z.string().max(2000).optional(),
      })
      .parse(req.body);
    const e = await prisma.enquiry.create({ data: { ...data, email: data.email || null, schoolId: req.tenant.id, source: 'WEBSITE' } });
    res.status(201).json({ ok: true, id: e.id });
  }),
);

const appSchema = z.object({
  studentName: z.string().trim().min(2),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dob: z.string().min(8),
  gradeSought: z.string().min(1),
  bloodGroup: z.string().optional(),
  aadhaar: z.string().optional(),
  previousSchool: z.string().optional(),
  fatherName: z.string().trim().min(2),
  fatherPhone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  fatherEmail: z.string().email().optional().or(z.literal('')),
  fatherOccupation: z.string().optional(),
  motherName: z.string().optional(),
  motherPhone: z.string().optional(),
  motherOccupation: z.string().optional(),
  permanentAddress: z.string().min(5),
  correspondenceAddress: z.string().optional(),
  siblingInfo: z.string().optional(),
  hostelRequired: z.coerce.boolean().optional(),
  transportRequired: z.coerce.boolean().optional(),
});

r.post(
  '/admission',
  formLimiter,
  upload.array('documents', 6),
  ah(async (req, res) => {
    const body = { ...req.body, hostelRequired: req.body.hostelRequired === 'true', transportRequired: req.body.transportRequired === 'true' };
    const data = appSchema.parse(body);
    const s = parseJSON(req.tenant.settings, {});
    const n = await nextNumber(req.tenant.id, 'admission-reg');
    const regNo = `REG${new Date().getFullYear()}${pad(n, 4)}`;
    const docs = [];
    for (const f of req.files || []) docs.push({ name: f.originalname, url: await saveUpload(req, f) });
    const app = await prisma.admissionApplication.create({
      data: {
        ...data,
        dob: new Date(data.dob),
        fatherEmail: data.fatherEmail || null,
        documents: JSON.stringify(docs),
        registrationFee: s.registrationFee ?? 500,
        schoolId: req.tenant.id,
        regNo,
      },
    });
    res.status(201).json({ regNo: app.regNo, id: app.id, registrationFee: app.registrationFee });
  }),
);

/** Demo payment gateway: marks registration fee as paid and returns a transaction id.
 *  In production replace with Razorpay order + signature verification using keys from School.settings. */
r.post(
  '/admission/:regNo/pay',
  formLimiter,
  ah(async (req, res) => {
    const app = await prisma.admissionApplication.findFirst({ where: { schoolId: req.tenant.id, regNo: req.params.regNo } });
    if (!app) throw notFound('Application not found');
    if (app.feePaid) return res.json({ ok: true, paymentRef: app.paymentRef, alreadyPaid: true });
    const paymentRef = 'pay_' + crypto.randomBytes(7).toString('hex');
    await prisma.admissionApplication.update({ where: { id: app.id }, data: { feePaid: true, paymentRef, status: 'UNDER_REVIEW' } });
    res.json({ ok: true, paymentRef, amount: app.registrationFee });
  }),
);

r.get(
  '/admission/status',
  ah(async (req, res) => {
    const { regNo, phone } = req.query;
    const app = await prisma.admissionApplication.findFirst({
      where: { schoolId: req.tenant.id, regNo: String(regNo || ''), fatherPhone: String(phone || '') },
      select: { regNo: true, studentName: true, gradeSought: true, status: true, testDate: true, feePaid: true, remarks: true, createdAt: true },
    });
    if (!app) throw notFound('No application found. Check registration number and mobile number.');
    res.json(app);
  }),
);

r.get(
  '/search',
  ah(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ notices: [] });
    const notices = await prisma.notice.findMany({
      where: { schoolId: req.tenant.id, isPublic: true, OR: [{ title: contains(q) }, { body: contains(q) }] },
      take: 10,
      orderBy: { publishDate: 'desc' },
    });
    res.json({ notices });
  }),
);

export default r;
