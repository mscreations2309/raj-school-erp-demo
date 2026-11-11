import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Bell, CalendarDays, ChevronLeft, ChevronRight, Quote, Star, Award, Play, BadgeCheck, MapPin, Sparkles } from 'lucide-react';
import { useSite } from '../SiteContext';
import { Reveal, Counter, Tilt, Heading, Blobs, SplitText, Parallax, fadeUp, Stagger } from '../components/Motion';
import Icon from '../components/Icon';
import Lightbox from '../components/Lightbox';
import { fmtDate } from '../../lib/format';

function Hero() {
  const { site, L, C, t } = useSite();
  const banners = site.banners.length ? site.banners : [{ id: 'default', imageUrl: site.school.logoUrl || '/favicon.png', titleEn: C('hero.title') || site.school.name, subtitleEn: C('hero.subtitle') }];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => setI((x) => (x + 1) % banners.length), 6500);
    return () => clearTimeout(id);
  }, [i, paused, banners.length]);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 800], [0, 250]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);
  const b = banners[i];
  const go = (d) => setI((x) => (x + d + banners.length) % banners.length);

  return (
    <section className="relative isolate h-[100svh] min-h-[640px] overflow-hidden bg-navy-950" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <AnimatePresence mode="sync">
        <motion.div key={b.id} className="absolute inset-0 -z-10" initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.4, ease: 'easeInOut' }}>
          <motion.img style={{ y }} src={b.imageUrl} alt="" className="kenburns h-full w-full object-cover" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/95 via-navy-950/70 to-navy-950/20" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-950 via-transparent to-navy-950/40" />
      <Blobs className="-z-10 opacity-60" />

      <motion.div style={{ opacity }} className="container-x flex h-full flex-col justify-center pt-24">
        <div className="max-w-3xl">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.7, duration: 0.7 }} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300 backdrop-blur">
            <Sparkles size={14} /> {C('hero.kicker')}
          </motion.div>
          <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
            <SplitText key={`t-${i}`} text={L(b, 'title') || C('hero.title')} delay={sessionStorage.getItem('rny_loaded') ? 0.1 : 1.8} />
          </h1>
          <AnimatePresence mode="wait">
            <motion.p key={`s-${i}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.6, delay: 0.4 }} className="mt-6 max-w-xl text-lg text-white/80 sm:text-xl">
              {L(b, 'subtitle') || C('hero.subtitle')}
            </motion.p>
          </AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2, duration: 0.7 }} className="mt-10 flex flex-wrap gap-4">
            <Link to="/admissions" className="group relative overflow-hidden rounded-2xl bg-brand-600 px-7 py-4 font-semibold text-white shadow-glow transition hover:bg-brand-700">
              <span className="relative z-10 flex items-center gap-2">{t('nav.applyNow')} <ArrowRight size={18} className="transition group-hover:translate-x-1" /></span>
              <span className="absolute inset-0 animate-shine bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,.25)_50%,transparent_75%)] bg-[length:200%_100%]" />
            </Link>
            <Link to="/gallery" className="glass flex items-center gap-2 rounded-2xl px-7 py-4 font-semibold text-white transition hover:bg-white/20">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-brand-600"><Play size={12} className="ml-0.5 fill-current" /></span> {t('home.exploreCampus')}
            </Link>
          </motion.div>
        </div>

        {/* Floating highlight cards */}
        <div className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 flex-col gap-5 xl:flex">
          {[
            { icon: <BadgeCheck className="text-emerald-400" />, big: '95.7%', small: 'CBSE Class X 2025' },
            { icon: <Award className="text-gold-400" />, big: '29+', small: 'Years of Excellence' },
            { icon: <MapPin className="text-brand-400" />, big: 'Sarnath', small: 'Varanasi, U.P.' },
          ].map((c, k) => (
            <motion.div key={k} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.1 + k * 0.15, type: 'spring' }} className="glass flex w-60 animate-float items-center gap-4 rounded-2xl p-4 text-white shadow-2xl" style={{ animationDelay: `${k * -2}s` }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">{c.icon}</div>
              <div><div className="text-2xl font-bold">{c.big}</div><div className="text-xs text-white/70">{c.small}</div></div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Slider controls */}
      <div className="absolute bottom-10 left-0 right-0">
        <div className="container-x flex items-end justify-between">
          <div className="flex gap-2">
            {banners.map((x, k) => (
              <button key={x.id} onClick={() => setI(k)} className="group relative h-1.5 w-10 overflow-hidden rounded-full bg-white/25" aria-label={`Slide ${k + 1}`}>
                {k === i && <motion.span key={`${i}-${paused}`} className="absolute inset-y-0 left-0 bg-gold-400" initial={{ width: 0 }} animate={{ width: paused ? '30%' : '100%' }} transition={{ duration: paused ? 0.3 : 6.5, ease: 'linear' }} />}
                {k < i && <span className="absolute inset-0 bg-white/70" />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-white/70"><b className="text-2xl text-white">{String(i + 1).padStart(2, '0')}</b> / {String(banners.length).padStart(2, '0')}</span>
            <button onClick={() => go(-1)} className="glass rounded-full p-3 text-white hover:bg-white/20" aria-label="Previous"><ChevronLeft size={18} /></button>
            <button onClick={() => go(1)} className="glass rounded-full p-3 text-white hover:bg-white/20" aria-label="Next"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>
      <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute bottom-24 left-1/2 hidden -translate-x-1/2 flex-col items-center text-[10px] uppercase tracking-[0.3em] text-white/50 md:flex">
        {t('home.scroll')}<span className="mt-2 h-10 w-px bg-gradient-to-b from-white/60 to-transparent" />
      </motion.div>
    </section>
  );
}

function Ticker() {
  const { site, L, t } = useSite();
  const items = site.notices.slice(0, 8);
  if (!items.length) return null;
  return (
    <div className="relative z-10 flex items-stretch bg-brand-600 text-white">
      <div className="z-10 flex shrink-0 items-center gap-2 bg-navy-900 px-5 py-3 text-sm font-bold uppercase tracking-wider">
        <Bell size={16} className="animate-[wiggle_1s_ease-in-out_infinite]" /> {t('home.latest')}
      </div>
      <div className="mask-fade-x relative flex-1 overflow-hidden">
        <div className="flex w-max animate-marquee items-center gap-12 py-3 hover:[animation-play-state:paused]">
          {[...items, ...items].map((n, k) => (
            <Link key={k} to="/notices" className="flex items-center gap-3 whitespace-nowrap text-sm font-medium hover:text-gold-300">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-400" /> {L(n, 'title')}
              <span className="text-white/60">• {fmtDate(n.publishDate)}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function About() {
  const { site, C, t, schoolName } = useSite();
  const g = site.gallery;
  const img = (name) => g.find((x) => x.imageUrl.includes(name))?.imageUrl || g[0]?.imageUrl;
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="container-x grid items-center gap-16 lg:grid-cols-2">
        <div className="relative h-[520px]">
          <Reveal x={-60} y={0} className="absolute left-0 top-0 h-[78%] w-[72%] overflow-hidden rounded-[2rem] shadow-soft">
            <Parallax src={img('main-entrance')} className="h-full w-full" speed={40} />
          </Reveal>
          <Reveal x={60} y={0} delay={0.15} className="absolute bottom-0 right-0 h-[55%] w-[55%] overflow-hidden rounded-[2rem] border-8 border-white shadow-soft">
            <Parallax src={img('lobby-block-a')} className="h-full w-full" speed={30} />
          </Reveal>
          <motion.div initial={{ scale: 0, rotate: -20 }} whileInView={{ scale: 1, rotate: 0 }} viewport={{ once: true }} transition={{ type: 'spring', delay: 0.4 }} className="absolute bottom-16 left-6 flex h-36 w-36 flex-col items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-center text-white shadow-glow">
            <div className="absolute inset-2 animate-spinslow rounded-full border border-dashed border-white/40" />
            <div className="font-display text-4xl font-bold"><Counter to={new Date().getFullYear() - (site.school.established || 1997)} suffix="+" /></div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/80">Years of<br />Excellence</div>
          </motion.div>
          <div className="absolute -right-6 top-10 -z-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,#c8102e_1.5px,transparent_1.5px)] [background-size:16px_16px] opacity-30" />
        </div>
        <div>
          <Heading align="left" kicker={t('home.aboutKicker')} title={schoolName} />
          <Reveal><p className="text-lg font-semibold text-navy-800">{C('about.aegis')}</p></Reveal>
          <Reveal delay={0.1}><p className="mt-5 leading-relaxed text-slate-600">{C('about.short')}</p></Reveal>
          <Reveal delay={0.15}><p className="mt-4 leading-relaxed text-slate-600">{C('about.join')}</p></Reveal>
          <Stagger className="mt-8 grid grid-cols-2 gap-4">
            {[['CBSE', site.school.affiliationNo], ['Play Group – XII', 'Classes'], ['Boys & Girls', 'Hostels'], ['8,805 m²', 'Campus']].map(([a, b], k) => (
              <motion.div key={k} variants={fadeUp} custom={k} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:-translate-y-1 hover:border-brand-200 hover:bg-white hover:shadow-soft">
                <div className="font-bold text-navy-900">{a}</div><div className="text-sm text-slate-500">{b}</div>
              </motion.div>
            ))}
          </Stagger>
          <Reveal delay={0.2}>
            <Link to="/about" className="btn-primary mt-8 px-6 py-3.5">{t('common.readMore')} <ArrowRight size={16} /></Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Achievement() {
  const { site, C, t } = useSite();
  const img = site.gallery.find((x) => x.category === 'Achievements')?.imageUrl;
  if (!img) return null;
  return (
    <section className="relative overflow-hidden bg-navy-950 py-24 text-white">
      <Blobs />
      <div className="noise absolute inset-0" />
      <div className="container-x relative grid items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full bg-gold-400/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-gold-300"><Award size={14} /> {t('home.achievementKicker')}</span>
          <h2 className="mt-5 font-display text-3xl font-bold leading-tight sm:text-5xl">{C('achievement.title')}</h2>
          <p className="mt-6 text-lg leading-relaxed text-white/70">{C('achievement.text')}</p>
          <div className="mt-8 flex items-center gap-4 text-sm text-white/60"><span className="h-px w-12 bg-gold-400" /> Rashtrapati Bhavan, New Delhi</div>
        </Reveal>
        <Reveal delay={0.15}>
          <Tilt max={6} className="relative">
            <div className="absolute -inset-4 rounded-[2.2rem] bg-gradient-to-tr from-brand-600 via-gold-500 to-navy-500 opacity-60 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-white p-2 shadow-2xl">
              <img src={img} alt="" className="w-full rounded-[1.6rem]" />
            </div>
          </Tilt>
        </Reveal>
      </div>
    </section>
  );
}

function Stats() {
  const { site, L, t } = useSite();
  const bg = site.banners[2]?.imageUrl;
  return (
    <section className="relative isolate overflow-hidden py-24">
      <Parallax src={bg} className="absolute inset-0 -z-10" speed={120} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-900/95 via-navy-950/95 to-navy-900/95" />
      <div className="container-x">
        <Heading light kicker={t('home.statsKicker')} title={t('home.statsTitle')} />
        <Stagger className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {site.stats.slice(0, 8).map((s, k) => (
            <motion.div key={s.id} variants={fadeUp} custom={k} whileHover={{ y: -8 }} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-white backdrop-blur-sm">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-500/20 blur-2xl transition group-hover:bg-gold-400/30" />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg"><Icon name={s.icon} size={22} /></div>
              <div className="mt-5 font-display text-4xl font-bold sm:text-5xl"><Counter to={s.value} suffix={s.suffix || ''} /></div>
              <div className="mt-1 text-sm text-white/70">{L(s, 'label')}</div>
            </motion.div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function Leaders() {
  const { site, L, t } = useSite();
  return (
    <section className="relative bg-gradient-to-b from-slate-50 to-white py-24 sm:py-32">
      <div className="container-x">
        <Heading kicker={t('home.leadersKicker')} title={t('home.leadersTitle')} />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {site.leaders.map((p, k) => (
            <Reveal key={p.id} delay={k * 0.1}>
              <Tilt className="group h-full">
                <div className="relative h-full overflow-hidden rounded-3xl bg-white shadow-soft">
                  <div className="relative h-80 overflow-hidden bg-gradient-to-b from-navy-100 to-navy-50">
                    <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-navy-950/95 via-navy-950/40 to-transparent p-6 opacity-0 transition duration-500 group-hover:opacity-100">
                      <p className="translate-y-6 text-sm italic leading-relaxed text-white transition duration-500 group-hover:translate-y-0"><Quote size={18} className="mb-2 text-gold-400" />{L(p, 'quote')}</p>
                    </div>
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="font-display text-xl font-bold text-navy-900">{L(p, 'name') || p.name}</h3>
                    <p className="mt-1 text-sm font-medium text-brand-600">{L(p, 'role') || p.role}</p>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-brand-600 to-gold-500 transition duration-500 group-hover:scale-x-100" />
                </div>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Facilities() {
  const { site, L, t } = useSite();
  return (
    <section className="py-24 sm:py-32">
      <div className="container-x">
        <Heading kicker={t('home.facilitiesKicker')} title={t('home.facilitiesTitle')} />
        <div className="grid auto-rows-[260px] gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {site.facilities.slice(0, 8).map((f, k) => (
            <Reveal key={f.id} delay={(k % 4) * 0.08} className={k === 0 || k === 5 ? 'sm:col-span-2 sm:row-span-2' : ''}>
              <Link to="/facilities" className="group relative block h-full overflow-hidden rounded-3xl">
                <img src={f.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-[1.2s] group-hover:scale-110" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/30 to-transparent transition group-hover:from-brand-900/95" />
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur transition group-hover:bg-brand-600"><Icon name={f.icon} size={20} /></div>
                  <h3 className="font-display text-xl font-bold">{L(f, 'title')}</h3>
                  <p className={`mt-2 max-h-0 overflow-hidden text-sm text-white/80 opacity-0 transition-all duration-500 group-hover:max-h-32 group-hover:opacity-100 ${k === 0 || k === 5 ? 'sm:max-h-32 sm:opacity-100' : ''}`}>{L(f, 'desc')}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Results() {
  const { site, t } = useSite();
  const groups = useMemo(() => ['X', 'XII'].map((c) => ({ c, rows: site.results.filter((r) => r.className === c) })), [site.results]);
  return (
    <section className="relative overflow-hidden bg-slate-50 py-24 sm:py-32">
      <div className="container-x">
        <Heading kicker={t('home.resultsKicker')} title={t('home.resultsTitle')} sub={t('home.resultsNote')} />
        <div className="grid gap-8 lg:grid-cols-2">
          {groups.map(({ c, rows }, gi) => (
            <Reveal key={c} delay={gi * 0.1}>
              <div className="card relative overflow-hidden p-8">
                <div className="absolute right-6 top-6 font-display text-7xl font-black text-slate-100">{c}</div>
                <h3 className="relative font-display text-2xl font-bold text-navy-900">{c === 'X' ? t('home.classX') : t('home.classXII')}</h3>
                <div className="relative mt-8 flex h-64 items-end justify-around gap-6 border-b border-slate-200">
                  {rows.map((r, k) => (
                    <div key={r.id} className="flex h-full flex-1 flex-col items-center justify-end">
                      <div className="mb-2 font-display text-xl font-bold text-navy-900"><Counter to={r.percent} decimals={1} suffix="%" /></div>
                      <motion.div initial={{ height: 0 }} whileInView={{ height: `${r.percent}%` }} viewport={{ once: true }} transition={{ duration: 1.2, delay: k * 0.15, ease: [0.22, 1, 0.36, 1] }} className={`w-full max-w-[70px] rounded-t-2xl ${k === rows.length - 1 ? 'bg-gradient-to-t from-brand-700 to-brand-500 shadow-glow' : 'bg-gradient-to-t from-navy-700 to-navy-400'}`} />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-around text-sm font-semibold text-slate-500">{rows.map((r) => <span key={r.id} className="flex-1 text-center">{r.year}</span>)}</div>
                <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
                  {rows.map((r) => (
                    <div key={r.id} className="rounded-xl bg-slate-50 p-3"><div className="text-slate-500">{t('home.registered')}: <b className="text-slate-800">{r.registered}</b></div><div className="text-slate-500">{t('home.passed')}: <b className="text-emerald-600">{r.passed}</b></div></div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Vision() {
  const { C, site } = useSite();
  return (
    <section className="relative isolate overflow-hidden py-28">
      <Parallax src={site.banners[6]?.imageUrl} className="absolute inset-0 -z-10" speed={100} />
      <div className="absolute inset-0 -z-10 bg-navy-950/85" />
      <div className="container-x max-w-5xl text-center text-white">
        <Reveal><Quote size={56} className="mx-auto text-gold-400" /></Reveal>
        <Reveal delay={0.1}><h2 className="mt-6 font-display text-2xl font-bold sm:text-3xl">{C('vision.title')}</h2></Reveal>
        <Reveal delay={0.2}><p className="mt-8 font-display text-xl italic leading-relaxed text-white/85 sm:text-2xl">“{C('vision.text')}”</p></Reveal>
        <Reveal delay={0.3}><div className="mx-auto mt-10 h-px w-40 bg-gradient-to-r from-transparent via-gold-400 to-transparent" /></Reveal>
      </div>
    </section>
  );
}

function GalleryPreview() {
  const { site, L, t } = useSite();
  const [open, setOpen] = useState(null);
  const items = site.gallery.slice(0, 9);
  return (
    <section className="py-24 sm:py-32">
      <div className="container-x">
        <Heading kicker={t('home.galleryKicker')} title={t('home.galleryTitle')} />
        <div className="columns-2 gap-4 md:columns-3 [&>*]:mb-4">
          {items.map((g, k) => (
            <Reveal key={g.id} delay={(k % 3) * 0.08}>
              <button onClick={() => setOpen(k)} className="group relative block w-full overflow-hidden rounded-2xl">
                <img src={g.imageUrl} alt={g.titleEn} loading="lazy" className={`w-full object-cover transition duration-700 group-hover:scale-110 ${k % 3 === 0 ? 'h-80' : k % 3 === 1 ? 'h-56' : 'h-64'}`} />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-navy-950/90 to-transparent p-4 opacity-0 transition group-hover:opacity-100">
                  <span className="translate-y-4 text-left text-sm font-semibold text-white transition group-hover:translate-y-0">{L(g, 'title')}</span>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10 text-center"><Link to="/gallery" className="btn-outline px-6 py-3">{t('common.viewAll')} <ArrowRight size={16} /></Link></Reveal>
      </div>
      <Lightbox items={items.map((g) => ({ src: g.imageUrl, title: L(g, 'title') }))} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </section>
  );
}

function Testimonials() {
  const { site, L, t } = useSite();
  const list = site.testimonials;
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % list.length), 6000);
    return () => clearInterval(id);
  }, [list.length]);
  if (!list.length) return null;
  const x = list[i];
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-navy-50 py-24 sm:py-32">
      <div className="container-x max-w-4xl text-center">
        <Heading kicker={t('home.testimonialsKicker')} title={t('home.testimonialsTitle')} />
        <div className="relative min-h-[260px]">
          <AnimatePresence mode="wait">
            <motion.div key={i} initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6 }} className="card mx-auto p-10 shadow-soft">
              <div className="flex justify-center gap-1 text-gold-500">{Array.from({ length: x.rating }).map((_, k) => <Star key={k} size={18} className="fill-current" />)}</div>
              <p className="mt-6 font-display text-xl italic leading-relaxed text-slate-700 sm:text-2xl">“{L(x, 'text')}”</p>
              <div className="mt-8 flex items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-navy-700 font-bold text-white">{x.name.replace(/^(Mr|Mrs|Ms|Dr)\.?\s/, '')[0]}</div>
                <div className="text-left"><div className="font-bold text-navy-900">{x.name}</div><div className="text-sm text-slate-500">{x.relation}</div></div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-8 flex justify-center gap-2">{list.map((_, k) => <button key={k} onClick={() => setI(k)} className={`h-2 rounded-full transition-all ${k === i ? 'w-8 bg-brand-600' : 'w-2 bg-slate-300'}`} aria-label={`Testimonial ${k + 1}`} />)}</div>
      </div>
    </section>
  );
}

function NoticesEvents() {
  const { site, L, t, lang } = useSite();
  const upcoming = site.events.filter((e) => new Date(e.endDate || e.startDate) >= new Date(new Date().toDateString())).slice(0, 5);
  return (
    <section className="py-24 sm:py-32">
      <div className="container-x">
        <Heading kicker={t('home.noticesKicker')} title={t('home.noticesTitle')} />
        <div className="grid gap-8 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <div className="card h-full overflow-hidden">
              <div className="flex items-center justify-between bg-navy-900 px-6 py-4 text-white"><span className="flex items-center gap-2 font-semibold"><Bell size={18} /> {t('home.noticesTitle')}</span><Link to="/notices" className="text-xs text-gold-300 hover:underline">{t('common.viewAll')}</Link></div>
              <div className="max-h-[420px] divide-y overflow-y-auto">
                {site.notices.slice(0, 6).map((n, k) => (
                  <motion.div key={n.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.06 }} className="group flex gap-4 p-5 transition hover:bg-brand-50/40">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">
                      <span className="text-lg font-bold leading-none">{new Date(n.publishDate).getDate()}</span>
                      <span className="text-[10px] font-semibold uppercase">{new Date(n.publishDate).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en', { month: 'short' })}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><h4 className="font-semibold text-navy-900">{L(n, 'title')}</h4>{n.isPinned && <span className="badge bg-gold-300/40 text-amber-800">{t('notices.pinned')}</span>}</div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{L(n, 'body')}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-2">
            <div className="h-full rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white shadow-glow">
              <h3 className="flex items-center gap-2 font-semibold"><CalendarDays size={18} /> {t('home.eventsTitle')}</h3>
              <div className="mt-6 space-y-4">
                {upcoming.map((e, k) => (
                  <motion.div key={e.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.08 }} className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur transition hover:bg-white/20">
                    <div className="text-center"><div className="font-display text-2xl font-bold">{new Date(e.startDate).getUTCDate()}</div><div className="text-[10px] uppercase tracking-wider text-white/70">{new Date(e.startDate).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en', { month: 'short', timeZone: 'UTC' })}</div></div>
                    <div className="h-10 w-px bg-white/20" />
                    <div><div className="font-semibold">{L(e, 'title')}</div><div className="text-xs text-white/60">{t(`notices.eventTypes.${e.type}`)}{e.endDate ? ` • ${fmtDate(e.startDate)} – ${fmtDate(e.endDate)}` : ''}</div></div>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function AdmissionCTA() {
  const { t, site } = useSite();
  const steps = t('admission.process');
  return (
    <section className="relative overflow-hidden py-24">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-navy-950 px-6 py-16 text-white sm:px-14">
          <Blobs />
          <div className="noise absolute inset-0" />
          <div className="relative grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Reveal><span className="text-xs font-bold uppercase tracking-[0.25em] text-gold-300">{t('home.admissionProcess')}</span></Reveal>
              <Reveal delay={0.05}><h2 className="mt-4 font-display text-3xl font-bold sm:text-5xl">{t('home.ctaTitle')}</h2></Reveal>
              <Reveal delay={0.1}><p className="mt-5 text-lg text-white/70">{t('home.ctaText')}</p></Reveal>
              <Reveal delay={0.15} className="mt-8 flex flex-wrap gap-4">
                <Link to="/admissions" className="btn-primary px-7 py-4 text-base">{t('nav.applyNow')} <ArrowRight size={18} /></Link>
                <Link to="/contact" className="glass btn px-7 py-4 text-base text-white hover:bg-white/20">{t('nav.contact')}</Link>
              </Reveal>
            </div>
            <div className="relative space-y-4">
              {steps.map(([a, b], k) => (
                <motion.div key={k} initial={{ opacity: 0, x: 60 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.12, type: 'spring', stiffness: 80 }} className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-amber-600 font-display text-xl font-bold text-navy-950">{k + 1}</div>
                  <div><div className="font-semibold">{a}</div><div className="text-sm text-white/60">{b}</div></div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Partner() {
  const { C } = useSite();
  if (!C('partner.title')) return null;
  return (
    <section className="pb-24">
      <div className="container-x">
        <Reveal>
          <div className="grid items-center gap-10 rounded-3xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white p-8 sm:p-12 md:grid-cols-[280px_1fr]">
            <motion.img whileHover={{ scale: 1.05, rotate: -2 }} src={C('partner.image')} alt="Partner" className="mx-auto max-h-40 object-contain" />
            <div>
              <h3 className="font-display text-2xl font-bold text-navy-900">{C('partner.title')}</h3>
              <p className="mt-3 leading-relaxed text-slate-600">{C('partner.text')}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Ticker />
      <About />
      <Achievement />
      <Stats />
      <Leaders />
      <Facilities />
      <Results />
      <Vision />
      <GalleryPreview />
      <Testimonials />
      <NoticesEvents />
      <AdmissionCTA />
      <Partner />
    </>
  );
}
