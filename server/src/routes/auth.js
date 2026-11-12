import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah, HttpError, badRequest } from '../lib/http.js';
import { signToken, authenticate, publicUser, schoolModules } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import { isDemo } from '../lib/demo.js';

const r = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false });

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(3),
  password: z.string().min(1),
  school: z.string().trim().optional(), // school slug (optional when email is unique)
});

r.post(
  '/login',
  loginLimiter,
  ah(async (req, res) => {
    const { email, password, school } = loginSchema.parse(req.body);
    // Users can log in with email OR registered mobile number (parents usually use mobile)
    let candidates = await prisma.user.findMany({ where: { OR: [{ email }, { phone: email }] }, include: { school: true } });
    if (!candidates.length) {
      // Students can sign in with their admission number
      const st = await prisma.student.findMany({ where: { admissionNo: { in: [email, email.toUpperCase()] }, userId: { not: null } }, select: { userId: true } });
      if (st.length) candidates = await prisma.user.findMany({ where: { id: { in: st.map((x) => x.userId) } }, include: { school: true } });
    }
    if (school) candidates = candidates.filter((u) => !u.school || u.school.slug === school);
    if (candidates.length > 1) throw badRequest('This email is registered with multiple schools. Please select your school.');
    const user = candidates[0];
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Invalid email or password');
    if (!user.isActive) throw new HttpError(403, 'Your account has been disabled. Contact the school office.');
    if (user.school && ['SUSPENDED', 'CANCELLED'].includes(user.school.status)) {
      throw new HttpError(402, 'This school account is suspended. Please contact RnY Groups support.');
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    req.user = user;
    req.schoolId = user.schoolId;
    audit(req, 'LOGIN', 'User', user.id);
    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

r.get(
  '/me',
  authenticate,
  ah(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        staff: true,
        children: { include: { grade: true, section: true } },
        studentSelf: { include: { grade: true, section: true } },
      },
    });
    const school = req.school
      ? { ...req.school, settings: undefined, plan: req.school.plan && { name: req.school.plan.name, code: req.school.plan.code } }
      : null;
    res.json({ user: publicUser(user), school, modules: schoolModules(req.school), demo: isDemo() });
  }),
);

r.put(
  '/profile',
  authenticate,
  ah(async (req, res) => {
    const data = z
      .object({ name: z.string().min(2).optional(), phone: z.string().optional(), avatarUrl: z.string().optional() })
      .parse(req.body);
    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json(publicUser(user));
  }),
);

r.post(
  '/change-password',
  authenticate,
  ah(async (req, res) => {
    const { currentPassword, newPassword } = z
      .object({ currentPassword: z.string(), newPassword: z.string().min(6, 'Password must be at least 6 characters') })
      .parse(req.body);
    if (!(await bcrypt.compare(currentPassword, req.user.passwordHash))) throw badRequest('Current password is incorrect');
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
    audit(req, 'CHANGE_PASSWORD', 'User', req.user.id);
    res.json({ ok: true });
  }),
);

export default r;
