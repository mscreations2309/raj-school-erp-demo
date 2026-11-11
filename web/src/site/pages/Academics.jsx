import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Baby, BookOpen, Microscope, GraduationCap, Rocket, ClipboardCheck, CalendarDays } from 'lucide-react';
import { useSite } from '../SiteContext';
import { PageHero } from '../SiteLayout';
import { Reveal, Heading, fadeUp, Stagger } from '../components/Motion';
import { fmtDate } from '../../lib/format';

const ICONS = [Baby, BookOpen, Microscope, GraduationCap, Rocket];
const SUBJECTS = [
  ['English', 'Hindi', 'Mathematics', 'Art & Craft', 'Music', 'Rhymes & Stories'],
  ['English', 'Hindi', 'Mathematics', 'EVS', 'Computer Science', 'General Knowledge'],
  ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Sanskrit', 'Computer Science'],
  ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Computer Applications'],
  ['English', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Physical Education', 'Computer Science'],
];

export default function Academics() {
  const { site, t, L } = useSite();
  const stages = t('academics.stages');
  const [active, setActive] = useState(0);
  const calendar = site.events;
  return (
    <>
      <PageHero title={t('academics.title')} kicker={t('academics.kicker')} image={site.banners[5]?.imageUrl} crumbs={t('nav.academics')} />
      <section className="py-24">
        <div className="container-x">
          <Heading kicker={t('academics.kicker')} title={t('academics.title')} sub={t('academics.intro')} />
          <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
            <div className="space-y-3">
              {stages.map(([name, range], k) => {
                const I = ICONS[k];
                return (
                  <Reveal key={k} delay={k * 0.06}>
                    <button onClick={() => setActive(k)} className={`relative flex w-full items-center gap-4 overflow-hidden rounded-2xl p-5 text-left transition ${active === k ? 'text-white shadow-glow' : 'bg-slate-50 hover:bg-slate-100'}`}>
                      {active === k && <motion.span layoutId="stage-bg" className="absolute inset-0 bg-gradient-to-r from-brand-600 to-brand-800" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />}
                      <span className={`relative flex h-12 w-12 items-center justify-center rounded-xl ${active === k ? 'bg-white/20' : 'bg-white text-brand-600 shadow-sm'}`}><I size={22} /></span>
                      <span className="relative"><span className="block font-semibold">{name}</span><span className={`text-sm ${active === k ? 'text-white/80' : 'text-slate-500'}`}>{range}</span></span>
                    </button>
                  </Reveal>
                );
              })}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.45 }} className="card relative overflow-hidden p-8 sm:p-12">
                <div className="absolute -right-10 -top-10 font-display text-[10rem] font-black leading-none text-slate-50">{String(active + 1).padStart(2, '0')}</div>
                <div className="relative">
                  <span className="badge bg-brand-50 text-brand-700">{stages[active][1]}</span>
                  <h3 className="mt-4 font-display text-3xl font-bold text-navy-900">{stages[active][0]}</h3>
                  <p className="mt-4 text-lg leading-relaxed text-slate-600">{stages[active][2]}</p>
                  <h4 className="mt-10 text-sm font-bold uppercase tracking-wider text-slate-400">{t('academics.subjects')}</h4>
                  <Stagger className="mt-4 flex flex-wrap gap-3">
                    {SUBJECTS[active].map((s, k) => (
                      <motion.span key={s} variants={fadeUp} custom={k} className="rounded-xl border border-navy-100 bg-navy-50 px-4 py-2 text-sm font-medium text-navy-800">{s}</motion.span>
                    ))}
                  </Stagger>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      <section className="bg-navy-950 py-24 text-white">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <Reveal>
            <ClipboardCheck size={44} className="text-gold-400" />
            <h2 className="mt-6 font-display text-3xl font-bold sm:text-4xl">{t('academics.assessment')}</h2>
            <p className="mt-5 text-lg leading-relaxed text-white/70">{t('academics.assessmentText')}</p>
            <div className="mt-8 grid grid-cols-3 gap-4">
              {['Unit Test 1', 'Half Yearly', 'Annual'].map((x, k) => (
                <motion.div key={x} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.1 }} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <div className="font-display text-2xl font-bold text-gold-300">{['25', '80', '80'][k]}</div><div className="text-xs text-white/60">{x}<br />max marks</div>
                </motion.div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h3 className="flex items-center gap-2 font-display text-2xl font-bold"><CalendarDays className="text-gold-400" /> {t('academics.calendar')}</h3>
            <div className="mt-6 max-h-[420px] space-y-3 overflow-y-auto pr-2">
              {calendar.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-5 py-3">
                  <div><div className="font-medium">{L(e, 'title')}</div><div className="text-xs text-white/50">{t(`notices.eventTypes.${e.type}`)}</div></div>
                  <div className="whitespace-nowrap text-right text-sm text-white/70">{fmtDate(e.startDate)}{e.endDate ? <><br />– {fmtDate(e.endDate)}</> : ''}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
