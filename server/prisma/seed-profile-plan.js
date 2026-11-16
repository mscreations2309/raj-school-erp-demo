// Demo data plan for houses, student roles and activity groups. Pure function — used by seed.js
// (direct database) and by tools/demo-profile-data.mjs (through the API on a live site).
// students: [{ id, firstName, gender, rollNo, admissionNo, grade: { name, order }, section: { name } }]
// staff:    [{ id, firstName, designation, department }]
export const HOUSES = ['Red', 'Blue', 'Green', 'Yellow'];

let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

export function planProfileData(students, staff, { keepStudentId } = {}) {
  seed = 7;
  const active = [...students].sort((a, b) => a.admissionNo.localeCompare(b.admissionNo));
  const houses = Object.fromEntries(active.map((s, i) => [s.id, HOUSES[i % 4]]));
  const tags = [];
  const used = new Set();
  const add = (s, typeName, extra = {}) => { if (s) tags.push({ studentId: s.id, typeName, ...extra }); };
  const of = (gradeName, gender) => active.filter((s) => s.grade?.name === gradeName && (!gender || s.gender === gender) && !used.has(s.id));
  const take = (list) => { const s = list.find((x) => !used.has(x.id)); if (s) used.add(s.id); return s; };

  // School leaders from Class XII
  add(take(of('XII', 'MALE')), 'Head Boy');
  add(take(of('XII', 'FEMALE')), 'Head Girl');
  add(take(of('XII')), 'Sports Captain');
  for (const h of HOUSES) {
    add(take(of('XII').filter((s) => houses[s.id] === h)), 'House Captain', { house: h });
    add(take(of('XI').filter((s) => houses[s.id] === h)), 'Vice House Captain', { house: h });
  }
  for (let i = 0; i < 4; i++) add(take([...of('XI'), ...of('XII')]), 'Prefect');

  // One Class Monitor per section (Class I upwards)
  const sections = {};
  for (const s of active) if (s.grade?.order >= 4 && s.section) (sections[`${s.grade.name}-${s.section.name}`] ||= []).push(s);
  for (const list of Object.values(sections)) {
    list.sort((a, b) => (a.rollNo || 99) - (b.rollNo || 99));
    const keep = list.find((s) => s.id === keepStudentId);
    add(keep || list[0], 'Class Monitor');
  }

  // Activity groups
  const between = (lo, hi) => active.filter((s) => s.grade?.order >= lo && s.grade?.order <= hi);
  const pick = (list, n) => list.filter(() => rnd() < n / Math.max(list.length, 1));
  pick(between(11, 14), 26).forEach((s) => add(s, 'NCC'));
  pick(between(9, 12).filter((s) => s.gender === 'MALE'), 22).forEach((s) => add(s, 'Scouts'));
  pick(between(9, 12).filter((s) => s.gender === 'FEMALE'), 22).forEach((s) => add(s, 'Guides'));
  pick(between(14, 15), 14).forEach((s) => add(s, 'NSS'));
  pick(between(8, 13), 20).forEach((s) => add(s, 'Eco Club'));
  if (keepStudentId && !tags.some((t) => t.studentId === keepStudentId && t.typeName === 'NCC')) add({ id: keepStudentId }, 'NCC');

  // In-charge teachers
  const t = (re) => staff.find((s) => re.test(`${s.designation} ${s.department}`));
  const incharge = {
    NCC: t(/Physical Education/i)?.id,
    Scouts: t(/Social Science/i)?.id,
    Guides: t(/Hindi/i)?.id,
    NSS: t(/English/i)?.id,
    'Eco Club': t(/Science|Biology/i)?.id,
  };
  return { houses, tags, incharge };
}
