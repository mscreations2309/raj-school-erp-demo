const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const money = (n) => inr.format(Math.round(Number(n) || 0));
export const num = (n) => new Intl.NumberFormat('en-IN').format(Number(n) || 0);
export const compactMoney = (n) => {
  n = Number(n) || 0;
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${n}`;
};

export const fmtDate = (d, lang = 'en') => {
  if (!d) return '—';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
export const isoDay = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const fullName = (p) => (p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '');
export const className = (s) => (s?.grade ? `${s.grade.name}${s.section ? `-${s.section.name}` : ''}` : '—');
export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

export function amountInWords(amount) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (n) => (n < 20 ? a[n] : `${b[Math.floor(n / 10)]}${n % 10 ? ' ' + a[n % 10] : ''}`);
  const three = (n) => (n >= 100 ? `${a[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' + two(n % 100) : ''}` : two(n));
  let n = Math.round(Number(amount) || 0);
  if (n === 0) return 'Zero Rupees Only';
  const parts = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (n) parts.push(three(n));
  return `${parts.join(' ')} Rupees Only`;
}

export const STATUS_COLORS = {
  ACTIVE: 'bg-emerald-50 text-emerald-700', PAID: 'bg-emerald-50 text-emerald-700', PRESENT: 'bg-emerald-50 text-emerald-700', APPROVED: 'bg-emerald-50 text-emerald-700', RETURNED: 'bg-emerald-50 text-emerald-700', ENROLLED: 'bg-emerald-50 text-emerald-700', CONVERTED: 'bg-emerald-50 text-emerald-700', PASS: 'bg-emerald-50 text-emerald-700',
  UNPAID: 'bg-rose-50 text-rose-700', ABSENT: 'bg-rose-50 text-rose-700', REJECTED: 'bg-rose-50 text-rose-700', SUSPENDED: 'bg-rose-50 text-rose-700', LOST: 'bg-rose-50 text-rose-700', CANCELLED: 'bg-slate-100 text-slate-500', CLOSED: 'bg-slate-100 text-slate-500', LEFT: 'bg-slate-100 text-slate-500', RESIGNED: 'bg-slate-100 text-slate-500',
  PARTIAL: 'bg-amber-50 text-amber-700', LATE: 'bg-amber-50 text-amber-700', PENDING: 'bg-amber-50 text-amber-700', TRIAL: 'bg-amber-50 text-amber-700', UNDER_REVIEW: 'bg-amber-50 text-amber-700', CONTACTED: 'bg-amber-50 text-amber-700', HALF_DAY: 'bg-amber-50 text-amber-700', ISSUED: 'bg-sky-50 text-sky-700',
  NEW: 'bg-sky-50 text-sky-700', SUBMITTED: 'bg-sky-50 text-sky-700', TEST_SCHEDULED: 'bg-violet-50 text-violet-700', VISITED: 'bg-violet-50 text-violet-700', LEAVE: 'bg-violet-50 text-violet-700', GENERATED: 'bg-sky-50 text-sky-700', TC_ISSUED: 'bg-violet-50 text-violet-700', ALUMNI: 'bg-indigo-50 text-indigo-700', ON_LEAVE: 'bg-violet-50 text-violet-700',
};
export const pretty = (s) => (s ? String(s).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : '');
