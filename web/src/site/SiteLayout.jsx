import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Menu, X, Phone, Mail, MapPin, ArrowUp, LogIn, ChevronDown, MessageCircle, ArrowRight } from 'lucide-react';
import { useSite } from './SiteContext';

export function LangToggle({ dark = false }) {
  const { i18n } = useTranslation();
  const hi = i18n.language === 'hi';
  return (
    <button
      onClick={() => i18n.changeLanguage(hi ? 'en' : 'hi')}
      className={`relative flex h-8 w-[84px] items-center rounded-full p-1 text-xs font-bold transition ${dark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}
      aria-label="Toggle language"
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`absolute h-6 w-[38px] rounded-full bg-brand-600 shadow ${hi ? 'right-1' : 'left-1'}`} />
      <span className={`relative z-10 w-1/2 text-center ${!hi ? 'text-white' : ''}`}>EN</span>
      <span className={`relative z-10 w-1/2 text-center ${hi ? 'text-white' : ''}`}>हिं</span>
    </button>
  );
}

function Preloader({ logo }) {
  const [show, setShow] = useState(() => !sessionStorage.getItem('rny_loaded'));
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => { setShow(false); sessionStorage.setItem('rny_loaded', '1'); }, 1600);
    return () => clearTimeout(t);
  }, [show]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-navy-950" exit={{ clipPath: 'circle(0% at 50% 50%)' }} initial={{ clipPath: 'circle(150% at 50% 50%)' }} transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}>
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }} className="relative">
            <div className="absolute inset-0 -m-6 animate-spinslow rounded-full border-2 border-dashed border-gold-400/40" />
            <div className="rounded-full bg-white p-3 shadow-2xl"><img src={logo} alt="" className="h-20 w-20 object-contain" /></div>
          </motion.div>
          <motion.div initial={{ width: 0 }} animate={{ width: 180 }} transition={{ duration: 1.3, ease: 'easeInOut' }} className="mt-10 h-1 rounded-full bg-gradient-to-r from-brand-600 to-gold-500" />
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-4 text-xs font-semibold uppercase tracking-[0.4em] text-white/60">Knowledge is Power</motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Navbar() {
  const { site, t, schoolName, hi } = useSite();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); setMore(false); }, [loc.pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const s = site?.school;
  const isHome = loc.pathname === '/';
  const solid = scrolled || !isHome;
  const links = [['/', t('nav.home')], ['/about', t('nav.about')], ['/academics', t('nav.academics')], ['/facilities', t('nav.facilities')], ['/admissions', t('nav.admissions')], ['/gallery', t('nav.gallery')], ['/notices', t('nav.notices')], ['/contact', t('nav.contact')]];
  const extra = [['/disclosure', t('nav.disclosure')], ['/tc', t('nav.tc')], ['/login', t('nav.login')]];

  return (
    <>
      {/* Top info bar */}
      <div className="relative z-40 hidden bg-navy-950 text-[13px] text-white/80 lg:block">
        <div className="container-x flex h-10 items-center justify-between">
          <div className="flex items-center gap-6">
            <span>{t('top.affiliation')} <b className="text-white">{s?.affiliationNo}</b></span>
            <span className="h-4 w-px bg-white/20" />
            <span>{t('top.schoolCode')} <b className="text-white">{s?.schoolCode}</b></span>
            <span className="h-4 w-px bg-white/20" />
            <a href={`tel:${s?.phone}`} className="flex items-center gap-1.5 hover:text-gold-300"><Phone size={13} /> {s?.phone}</a>
            <a href={`mailto:${s?.email}`} className="flex items-center gap-1.5 hover:text-gold-300"><Mail size={13} /> {s?.email}</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admissions" className="relative overflow-hidden rounded-full bg-gradient-to-r from-gold-500 to-amber-500 px-3 py-0.5 text-xs font-bold text-navy-950">
              <span className="relative z-10">{t('top.admissionsOpen')}</span>
              <span className="absolute inset-0 animate-shine bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,.6)_50%,transparent_75%)] bg-[length:200%_100%]" />
            </Link>
            <LangToggle dark />
          </div>
        </div>
      </div>

      <motion.header
        initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
        className={`sticky top-0 z-50 transition-all duration-500 ${solid ? 'bg-white/90 shadow-[0_8px_30px_rgba(15,31,74,.08)] backdrop-blur-xl' : 'bg-transparent'} ${isHome && !scrolled ? '-mb-[84px]' : ''}`}
      >
        <div className="container-x flex h-[84px] items-center justify-between gap-4">
          <Link to="/" className="group flex items-center gap-3">
            <motion.div whileHover={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.6 }} className="rounded-full bg-white p-1 shadow-md">
              <img src={s?.logoUrl} alt="" className="h-14 w-14 object-contain" />
            </motion.div>
            <div className="leading-tight">
              <div className={`whitespace-nowrap font-display text-lg font-bold sm:text-xl ${solid ? 'text-navy-900' : 'text-white drop-shadow'}`}>{schoolName}</div>
              <div className={`whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.15em] ${solid ? 'text-brand-600' : 'text-gold-300'}`}>{hi ? 'सारनाथ, वाराणसी' : 'Sarnath, Varanasi'} • CBSE</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-0.5 xl:flex">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `relative whitespace-nowrap rounded-lg px-2.5 py-2 text-[14px] font-medium transition ${solid ? (isActive ? 'text-brand-600' : 'text-slate-700 hover:text-brand-600') : isActive ? 'text-gold-300' : 'text-white/90 hover:text-white'}`}>
                {({ isActive }) => (
                  <>
                    {label}
                    {isActive && <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-brand-600 to-gold-500" />}
                  </>
                )}
              </NavLink>
            ))}
            <div className="relative" onMouseEnter={() => setMore(true)} onMouseLeave={() => setMore(false)}>
              <button className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-[14px] font-medium ${solid ? 'text-slate-700' : 'text-white/90'}`}>{t('nav.more')} <ChevronDown size={14} className={`transition ${more ? 'rotate-180' : ''}`} /></button>
              <AnimatePresence>
                {more && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 top-full w-60 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-soft">
                    {extra.map(([to, label]) => <Link key={to} to={to} className="block rounded-xl px-4 py-2.5 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700">{label}</Link>)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <div className="lg:hidden"><LangToggle dark={!solid} /></div>
            <Link to="/login" className={`hidden items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:flex ${solid ? 'bg-navy-700 text-white hover:bg-navy-800' : 'glass text-white hover:bg-white/20'}`}>
              <LogIn size={16} /> {t('nav.login')}
            </Link>
            <button onClick={() => setOpen(true)} className={`rounded-xl p-2.5 xl:hidden ${solid ? 'text-navy-900 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`} aria-label="Menu"><Menu /></button>
          </div>
        </div>
      </motion.header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-navy-950/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="fixed right-0 top-0 z-[61] flex h-full w-[86%] max-w-sm flex-col bg-white" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <div className="flex items-center justify-between border-b p-5">
                <div className="flex items-center gap-3"><img src={s?.logoUrl} className="h-10 w-10" alt="" /><b className="font-display text-navy-900">{schoolName}</b></div>
                <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100"><X /></button>
              </div>
              <motion.nav className="flex-1 overflow-y-auto p-4" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
                {[...links, ...extra].map(([to, label]) => (
                  <motion.div key={to} variants={{ hidden: { opacity: 0, x: 30 }, show: { opacity: 1, x: 0 } }}>
                    <NavLink to={to} end={to === '/'} className={({ isActive }) => `flex items-center justify-between rounded-xl px-4 py-3 text-[15px] font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                      {label} <ArrowRight size={16} className="opacity-40" />
                    </NavLink>
                  </motion.div>
                ))}
              </motion.nav>
              <div className="space-y-2 border-t p-5 text-sm text-slate-600">
                <a href={`tel:${s?.phone}`} className="flex items-center gap-2"><Phone size={15} /> {s?.phone}</a>
                <a href={`mailto:${s?.email}`} className="flex items-center gap-2"><Mail size={15} /> {s?.email}</a>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

const Social = {
  youtube: <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" /></svg>,
  facebook: <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" /></svg>,
  instagram: <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z" /></svg>,
};

function Footer() {
  const { site, t, C, schoolName } = useSite();
  const s = site?.school;
  return (
    <footer className="relative overflow-hidden bg-navy-950 text-white/70">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl" />
      <div className="container-x relative grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white p-1"><img src={s?.logoUrl} alt="" className="h-14 w-14" /></div>
            <div><div className="font-display text-2xl font-bold text-white">{schoolName}</div><div className="text-xs uppercase tracking-[0.25em] text-gold-300">{t('top.affiliation')} {s?.affiliationNo}</div></div>
          </div>
          <p className="mt-6 max-w-md text-sm leading-relaxed">{C('footer.about')}</p>
          <div className="mt-6 flex gap-3">
            {Object.entries({ youtube: s?.social?.youtube || 'https://www.youtube.com', facebook: 'https://facebook.com', instagram: 'https://instagram.com' }).map(([k, href]) => (
              <motion.a key={k} href={href} target="_blank" rel="noreferrer" whileHover={{ y: -4 }} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-brand-600">{Social[k]}</motion.a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-5 font-display text-lg font-semibold text-white">{t('footer.quick')}</h4>
          <ul className="space-y-2.5 text-sm">
            {[['/about', t('nav.about')], ['/admissions', t('nav.admissions')], ['/academics', t('nav.academics')], ['/notices', t('nav.notices')], ['/disclosure', t('nav.disclosure')], ['/tc', t('nav.tc')], ['/login', t('footer.portal')]].map(([to, l]) => (
              <li key={to}><Link to={to} className="group inline-flex items-center gap-2 hover:text-white"><span className="h-px w-3 bg-brand-500 transition-all group-hover:w-6" />{l}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-5 font-display text-lg font-semibold text-white">{t('footer.reach')}</h4>
          <ul className="space-y-4 text-sm">
            <li className="flex gap-3"><MapPin size={18} className="mt-0.5 shrink-0 text-brand-400" />{s?.address}, {s?.city}, {s?.state} {s?.pincode}</li>
            <li className="flex gap-3"><Phone size={18} className="shrink-0 text-brand-400" /><span>{[s?.phone, ...(site?.contacts || []).map((c) => c.phone)].filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 3).join(', ')}</span></li>
            <li className="flex gap-3"><Mail size={18} className="shrink-0 text-brand-400" />{s?.email}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} {schoolName}. {t('footer.rights')}</p>
          <p className="flex items-center gap-2">
            {t('footer.poweredBy')}
            <a href="#" className="rounded-full bg-gradient-to-r from-brand-600 to-gold-500 px-3 py-1 font-bold tracking-wide text-white shadow-glow">RnY Groups</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FloatingActions({ phone }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-center gap-3">
      <motion.a href={`https://wa.me/91${phone}`} target="_blank" rel="noreferrer" whileHover={{ scale: 1.1 }} className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg" aria-label="WhatsApp">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/50" />
        <MessageCircle className="relative" />
      </motion.a>
      <AnimatePresence>
        {show && (
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-800 text-white shadow-lg hover:bg-brand-600" aria-label="Back to top">
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SiteLayout() {
  const { site, error, schoolName } = useSite();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 25 });
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  useEffect(() => { if (schoolName) document.title = `${schoolName}, Varanasi`; }, [schoolName]);

  if (error) return <div className="flex min-h-screen items-center justify-center p-8 text-center text-slate-600">Website is temporarily unavailable. Please make sure the API server is running.</div>;
  if (!site) return <div className="flex min-h-screen items-center justify-center bg-navy-950"><div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-brand-500" /></div>;

  return (
    <div className="min-h-screen overflow-x-clip">
      {site.demo && (
        <div className="relative z-[45] bg-gradient-to-r from-brand-700 via-brand-600 to-gold-600 px-4 py-1.5 text-center text-xs font-semibold text-white">
          ✨ Demo website by <b>RnY Groups</b> — redesign proposal for {site.school.name}. Sample data shown. <a href="/login" className="underline underline-offset-2">Try the ERP →</a>
        </div>
      )}
      <Preloader logo={site.school.logoUrl || '/favicon.png'} />
      <motion.div style={{ scaleX }} className="fixed inset-x-0 top-0 z-[70] h-1 origin-left bg-gradient-to-r from-brand-600 via-rose-500 to-gold-500" />
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.main key={loc.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <Footer />
      <FloatingActions phone={site.school.phone} />
    </div>
  );
}

/** Inner-page banner with parallax background */
export function PageHero({ title, kicker, image, crumbs }) {
  return (
    <section className="relative isolate overflow-hidden bg-navy-950 py-24 sm:py-32">
      <motion.img initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease: 'easeOut' }} src={image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-navy-950 via-navy-900/80 to-brand-900/60" />
      <div className="noise absolute inset-0 -z-10" />
      <div className="container-x text-center">
        {kicker && <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-gold-300 backdrop-blur">{kicker}</motion.span>}
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.8 }} className="mt-5 font-display text-4xl font-bold text-white sm:text-6xl">{title}</motion.h1>
        {crumbs && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-4 text-sm text-white/60"><Link to="/" className="hover:text-white">Home</Link> / {crumbs}</motion.p>}
      </div>
      <svg className="absolute -bottom-px left-0 w-full text-white" viewBox="0 0 1440 60" preserveAspectRatio="none"><path fill="currentColor" d="M0,40 C360,80 1080,0 1440,40 L1440,60 L0,60 Z" /></svg>
    </section>
  );
}
