import { PrismaClient, Prisma } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
});

export { Prisma };

export const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgres');

/** Case-insensitive "contains" filter that works on SQLite and PostgreSQL. */
export const contains = (value) =>
  isPostgres ? { contains: value, mode: 'insensitive' } : { contains: value };

/** Atomically get the next number in a per-tenant sequence. */
export async function nextNumber(schoolId, key, tx = prisma) {
  const c = await tx.counter.upsert({
    where: { schoolId_key: { schoolId, key } },
    create: { schoolId, key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return c.value;
}

export const pad = (n, len = 5) => String(n).padStart(len, '0');
