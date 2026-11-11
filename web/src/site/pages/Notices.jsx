import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pin, CalendarDays, Megaphone, Search } from 'lucide-react';
import { useSite } from '../SiteContext';
import { PageHero } from '../SiteLayout';
import { Reveal } from '../components/Motion';
import { fmtDate } from '../../lib/format';

const TYPE_COLORS = { HOLIDAY: 'bg-emerald-100 text-emerald-700', EXAM: 'bg-rose-100 text-rose-700', EVENT: 'bg-sky-100 text-sky-700', PTM: 'bg-violet-100 text-violet-700', ACTIVITY: 'bg-amber-100 text-amber-700' };

export default function Notices() {
  const { site, L, t, lang } = useSite();
  const [cat, setCat] = useState('ALL');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const list = useMemo(() => site.notices.filter((n) => (cat === 'ALL' || n.category === cat) && (!q || `${n.title} ${n.titleHi} ${n.body}`.toLowerCase().includes(q.toLowerCase()))), [site.notices, cat, q]);
  const today = new Date(new Date().toDateString());
  const upcoming = site.events.filter((e) => new Date(e.endDate || e.startDate) >= today);
  return (
    <>
      <PageHero title={t('notices.title')} kicker={t('notices.kicker')} image={site.banners[8]?.imageUrl} crumbs={t('nav.notices')} />
      <section className="py-20">
        <div className="container-x grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {Object.keys(t('notices.categories')).map((c) => (
                  <button key={c} onClick={() => setCat(c)} className={`relative rounded-full px-4 py-2 text-sm font-semibold ${cat === c ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {cat === c && <motion.span layoutId="ncat" className="absolute inset-0 rounded-full bg-navy-800" />}
                    <span className="relative">{t(`notices.categories.${c}`)}</span>
                  </button>
                ))}
              </div>
              <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} className="input pl-9 sm:w-56" /></div>
            </div>
            <motion.div layout className="space-y-4">
              <AnimatePresence>
                {list.map((n) => (
                  <motion.article layout key={n.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="card cursor-pointer overflow-hidden transition hover:shadow-soft" onClick={() => setOpen(open === n.id ? null : n.id)}>
                    <div className="flex gap-5 p-6">
                      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
                        <span className="text-2xl font-bold leading-none">{new Date(n.publishDate).getDate()}</span>
                        <span className="text-[10px] font-semibold uppercase">{new Date(n.publishDate).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en', { month: 'short', year: '2-digit' })}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="badge bg-navy-50 text-navy-700">{t(`notices.categories.${n.category}`)}</span>
                          {n.isPinned && <span className="badge bg-amber-100 text-amber-800"><Pin size={11} /> {t('notices.pinned')}</span>}
                        </div>
                        <h3 className="mt-2 font-display text-xl font-bold text-navy-900">{L(n, 'title')}</h3>
                        <AnimatePresence initial={false}>
                          <motion.p key={open === n.id ? 'o' : 'c'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mt-2 text-slate-600 ${open === n.id ? '' : 'line-clamp-2'}`}>{L(n, 'body')}</motion.p>
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
              {!list.length && <p className="py-16 text-center text-slate-400"><Megaphone className="mx-auto mb-3" />—</p>}
            </motion.div>
          </div>
          <aside>
            <Reveal className="sticky top-28">
              <div className="overflow-hidden rounded-3xl bg-navy-950 text-white">
                <div className="flex items-center gap-2 bg-brand-600 px-6 py-4 font-semibold"><CalendarDays size={18} /> {t('notices.upcoming')}</div>
                <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
                  {upcoming.map((e, k) => (
                    <motion.div key={e.id} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.05 }} className="rounded-2xl bg-white/5 p-4">
                      <span className={`badge ${TYPE_COLORS[e.type]}`}>{t(`notices.eventTypes.${e.type}`)}</span>
                      <div className="mt-2 font-semibold">{L(e, 'title')}</div>
                      <div className="text-xs text-white/60">{fmtDate(e.startDate, lang)}{e.endDate ? ` – ${fmtDate(e.endDate, lang)}` : ''}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Reveal>
          </aside>
        </div>
      </section>
    </>
  );
}
