// Student roles (ribbons), activity groups (chips) and house — shown on profiles, lists and portals.
const HOUSE_COLORS = { Red: '#dc2626', Blue: '#2563eb', Green: '#16a34a', Yellow: '#ca8a04' };
export const houseColor = (h) => HOUSE_COLORS[h] || '#64748b';

export const activeTags = (tags = []) => tags.filter((t) => !t.toDate || new Date(t.toDate) >= new Date(new Date().toDateString()));

/** ⭐ Ribbon for a role like Head Boy / House Captain. */
export function RoleRibbon({ tag, size = 'md' }) {
  const t = tag.type;
  const sm = size === 'sm';
  return (
    <span className={`relative inline-flex items-center gap-1 font-bold text-white shadow-sm ${sm ? 'py-0.5 pl-2 pr-3 text-[10px]' : 'py-1 pl-2.5 pr-4 text-xs'}`}
      style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}cc)`, clipPath: 'polygon(0 0, 100% 0, calc(100% - 8px) 50%, 100% 100%, 0 100%)' }}
      title={`${t.name}${tag.house ? ` — ${tag.house} House` : ''}${tag.session ? ` (${tag.session})` : ''}${tag.assignedByName ? ` • assigned by ${tag.assignedByName}` : ''}`}>
      <span>{t.emoji || '⭐'}</span>{t.name}{tag.house && <span className="font-medium opacity-90">• {tag.house}</span>}
    </span>
  );
}

/** Chip for an activity group like NCC / Scouts / Guides. */
export function ActivityChip({ tag, size = 'md' }) {
  const t = tag.type;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2.5 py-0.5 text-xs'}`}
      style={{ color: t.color, borderColor: `${t.color}55`, background: `${t.color}12` }} title={`${t.name}${tag.session ? ` (${tag.session})` : ''}`}>
      {t.emoji && <span>{t.emoji}</span>}{t.name}
    </span>
  );
}

export function HouseChip({ house, size = 'md' }) {
  if (!house) return null;
  const c = houseColor(house);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${size === 'sm' ? 'px-1.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'}`} style={{ color: c, background: `${c}15` }}>
      <span className="h-2 w-2 rounded-full" style={{ background: c }} />{house} House
    </span>
  );
}

/** All badges of a student. `student` needs { house, tags:[{type,…}] }. */
export default function StudentBadges({ student, size = 'md', showHouse = true, className = '' }) {
  const tags = activeTags(student?.tags);
  const roles = tags.filter((t) => t.type?.kind === 'ROLE');
  const acts = tags.filter((t) => t.type?.kind !== 'ROLE');
  if (!roles.length && !acts.length && !(showHouse && student?.house)) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {roles.map((t) => <RoleRibbon key={t.id} tag={t} size={size} />)}
      {showHouse && <HouseChip house={student.house} size={size} />}
      {acts.map((t) => <ActivityChip key={t.id} tag={t} size={size} />)}
    </div>
  );
}
