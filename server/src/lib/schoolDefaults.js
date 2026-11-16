// Default student roles / activity groups and houses. Idempotent — safe to run on every start.
import { prisma } from './prisma.js';
import { parseJSON } from './http.js';

export const DEFAULT_HOUSES = [
  { name: 'Red', color: '#dc2626' },
  { name: 'Blue', color: '#2563eb' },
  { name: 'Green', color: '#16a34a' },
  { name: 'Yellow', color: '#ca8a04' },
];

export const DEFAULT_TAG_TYPES = [
  // kind, name, emoji, color, assignableBy, needsHouse
  ['ROLE', 'Head Boy', '⭐', '#b45309', 'ADMIN', false],
  ['ROLE', 'Head Girl', '⭐', '#b45309', 'ADMIN', false],
  ['ROLE', 'House Captain', '🏠', '#7c3aed', 'ADMIN', true],
  ['ROLE', 'Vice House Captain', '🏠', '#7c3aed', 'ADMIN', true],
  ['ROLE', 'Sports Captain', '🏅', '#0e7490', 'ADMIN', false],
  ['ROLE', 'Prefect', '🎗️', '#be123c', 'ADMIN', false],
  ['ROLE', 'Class Monitor', '🎖️', '#1d4ed8', 'CLASS_TEACHER', false],
  ['ACTIVITY', 'NCC', '🪖', '#4d7c0f', 'INCHARGE', false],
  ['ACTIVITY', 'Scouts', '⚜️', '#15803d', 'INCHARGE', false],
  ['ACTIVITY', 'Guides', '⚜️', '#0f766e', 'INCHARGE', false],
  ['ACTIVITY', 'NSS', '🤝', '#9a3412', 'INCHARGE', false],
  ['ACTIVITY', 'Eco Club', '🌱', '#166534', 'INCHARGE', false],
];

export async function ensureSchoolDefaults(schoolId) {
  if (!(await prisma.studentTagType.count({ where: { schoolId } }))) {
    await prisma.studentTagType.createMany({
      data: DEFAULT_TAG_TYPES.map(([kind, name, emoji, color, assignableBy, needsHouse], order) => ({ schoolId, kind, name, emoji, color, assignableBy, needsHouse, order })),
    });
  }
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { settings: true } });
  const settings = parseJSON(school?.settings, {});
  if (!Array.isArray(settings.houses)) {
    await prisma.school.update({ where: { id: schoolId }, data: { settings: JSON.stringify({ ...settings, houses: DEFAULT_HOUSES }) } });
  }
}

export async function ensureAllSchoolDefaults() {
  for (const s of await prisma.school.findMany({ select: { id: true } })) await ensureSchoolDefaults(s.id);
}
