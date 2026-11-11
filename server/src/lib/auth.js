import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';
import { HttpError, forbidden, parseJSON } from './http.js';

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
  PRINCIPAL: 'PRINCIPAL',
  TEACHER: 'TEACHER',
  ACCOUNTANT: 'ACCOUNTANT',
  RECEPTIONIST: 'RECEPTIONIST',
  LIBRARIAN: 'LIBRARIAN',
  PARENT: 'PARENT',
  STUDENT: 'STUDENT',
};

export const ADMINS = ['SCHOOL_ADMIN', 'PRINCIPAL'];
export const STAFF_ROLES = [...ADMINS, 'TEACHER', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN'];
export const ALL_SCHOOL_ROLES = [...STAFF_ROLES, 'PARENT', 'STUDENT'];

export const ALL_MODULES = [
  'students', 'staff', 'academics', 'attendance', 'exams', 'fees', 'accounts', 'payroll',
  'admissions', 'communication', 'homework', 'transport', 'hostel', 'library', 'inventory',
  'website', 'reports',
];

const SECRET = () => process.env.JWT_SECRET || 'dev-secret';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, schoolId: user.schoolId }, SECRET(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/** Modules enabled for a school = its plan modules (all modules if no plan). */
export function schoolModules(school) {
  if (!school) return ALL_MODULES;
  const mods = parseJSON(school.plan?.modules, null);
  return Array.isArray(mods) && mods.length ? mods : ALL_MODULES;
}

/**
 * Verifies JWT, loads the user and tenant.
 * SUPER_ADMIN may act inside any tenant by sending header `x-school-id`.
 */
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token;
    if (!token) throw new HttpError(401, 'Please log in');
    let payload;
    try {
      payload = jwt.verify(token, SECRET());
    } catch {
      throw new HttpError(401, 'Session expired, please log in again');
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new HttpError(401, 'Account disabled or not found');

    let schoolId = user.schoolId;
    if (user.role === 'SUPER_ADMIN' && req.headers['x-school-id']) schoolId = String(req.headers['x-school-id']);

    let school = null;
    if (schoolId) {
      school = await prisma.school.findUnique({ where: { id: schoolId }, include: { plan: true } });
      if (!school) throw new HttpError(401, 'School not found');
      if (user.role !== 'SUPER_ADMIN' && ['SUSPENDED', 'CANCELLED'].includes(school.status)) {
        throw new HttpError(402, 'This school account is suspended. Please contact RnY Groups support.');
      }
    }
    req.user = user;
    req.school = school;
    req.schoolId = schoolId;
    req.modules = schoolModules(school);
    next();
  } catch (e) {
    next(e);
  }
}

export const authorize = (...roles) => (req, _res, next) => {
  const allowed = roles.flat();
  if (req.user.role === 'SUPER_ADMIN' || allowed.includes(req.user.role)) return next();
  next(forbidden());
};

/** Requires a tenant context (school user, or super admin impersonating). */
export const requireTenant = (req, _res, next) => {
  if (!req.schoolId) return next(new HttpError(400, 'Select a school first'));
  next();
};

/** Blocks access if the school's subscription plan does not include the module. */
export const requireModule = (mod) => (req, _res, next) => {
  if (!mod || req.user.role === 'SUPER_ADMIN' || req.modules.includes(mod)) return next();
  next(new HttpError(402, `The "${mod}" module is not part of your current plan. Upgrade to enable it.`));
};

export const publicUser = (u) => {
  if (!u) return u;
  const { passwordHash, ...rest } = u;
  return rest;
};
