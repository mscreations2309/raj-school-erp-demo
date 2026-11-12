import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LogOut, Menu, Search, X, KeyRound, Globe, ArrowLeftRight, Bell, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/auth';
import { api, errMsg } from '../lib/api';
import { pretty } from '../lib/format';
import { NAV, PLATFORM_NAV } from './nav';
import { Avatar, Modal, Field } from './components/ui';

function visible(item, user, has) {
  if (item.roles && user.role !== 'SUPER_ADMIN' && !item.roles.includes(user.role)) return false;
  if (item.module && !has(item.module)) return false;
  return true;
}

function SideNav({ items, onNavigate }) {
  const loc = useLocation();
  const [open, setOpen] = useState(() => items.findIndex((i) => i.children?.some((c) => loc.pathname.startsWith(c.to))));
  return (
    <nav className="space-y-1 px-3">
      {items.map((item, idx) => {
        const I = item.icon;
        if (!item.children) {
          return (
            <NavLink key={item.label} to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
              {({ isActive }) => (<>{isActive && <motion.span layoutId="side-active" className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-brand-500" />}<I size={18} /> {item.label}</>)}
            </NavLink>
          );
        }
        const active = item.children.some((c) => loc.pathname === c.to || loc.pathname.startsWith(c.to + '/'));
        const isOpen = open === idx;
        return (
          <div key={item.label}>
            <button onClick={() => setOpen(isOpen ? -1 : idx)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
              <I size={18} /> <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown size={15} className={`transition ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="ml-5 space-y-0.5 border-l border-white/10 py-1 pl-4">
                    {item.children.map((c) => (
                      <NavLink key={c.to} to={c.to} end onClick={onNavigate} className={({ isActive }) => `block rounded-lg px-3 py-2 text-[13px] transition ${isActive ? 'bg-brand-600 font-semibold text-white' : 'text-white/55 hover:text-white'}`}>{c.label}</NavLink>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const nav = useNavigate();
  const ref = useRef(null);
  useEffect(() => {
    if (q.length < 2) return setRes(null);
    const id = setTimeout(() => api.get('/search', { params: { q } }).then((r) => setRes(r.data)).catch(() => {}), 250);
    return () => clearTimeout(id);
  }, [q]);
  useEffect(() => {
    const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); ref.current?.focus(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  const go = (to) => { setQ(''); setRes(null); nav(to); };
  return (
    <div className="relative hidden w-full max-w-md md:block">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students, staff…  (Ctrl+K)" className="input bg-slate-50 pl-9" />
      <AnimatePresence>
        {res && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border bg-white p-2 shadow-soft">
            {!res.students.length && !res.staff.length && <p className="p-3 text-sm text-slate-400">No results</p>}
            {res.students.map((s) => <button key={s.id} onClick={() => go(`/app/students/${s.id}`)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50"><Avatar name={`${s.firstName} ${s.lastName || ''}`} size={32} /><div><div className="text-sm font-medium">{s.firstName} {s.lastName}</div><div className="text-xs text-slate-500">{s.admissionNo} • {s.grade?.name}-{s.section?.name}</div></div></button>)}
            {res.staff.map((s) => <button key={s.id} onClick={() => go(`/app/staff?q=${s.employeeId}`)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50"><Avatar name={`${s.firstName} ${s.lastName || ''}`} size={32} /><div><div className="text-sm font-medium">{s.firstName} {s.lastName}</div><div className="text-xs text-slate-500">Staff • {s.designation}</div></div></button>)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChangePassword({ open, onClose }) {
  const [v, setV] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.post('/auth/change-password', v); toast.success('Password changed'); onClose(); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Change Password" size="sm">
      <form onSubmit={save} className="space-y-4">
        <Field label="Current password"><input type="password" className="input" required value={v.currentPassword} onChange={(e) => setV({ ...v, currentPassword: e.target.value })} /></Field>
        <Field label="New password (min 6)"><input type="password" className="input" minLength={6} required value={v.newPassword} onChange={(e) => setV({ ...v, newPassword: e.target.value })} /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Update password</button>
      </form>
    </Modal>
  );
}

export default function ErpLayout({ platform = false }) {
  const { user, school, loading, logout, has, actAsSchool } = useAuth();
  const [mobile, setMobile] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pwd, setPwd] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => { setMobile(false); setMenu(false); }, [loc.pathname]);
  const items = useMemo(() => {
    if (!user) return [];
    if (platform) return PLATFORM_NAV;
    return NAV.filter((i) => visible(i, user, has)).map((i) => (i.children ? { ...i, children: i.children.filter((c) => visible(c, user, has)) } : i)).filter((i) => !i.children || i.children.length);
  }, [user, has, platform]);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-brand-600" size={36} /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (platform && user.role !== 'SUPER_ADMIN') return <Navigate to="/app" replace />;
  if (!platform && user.role === 'SUPER_ADMIN' && !school) return <Navigate to="/platform" replace />;

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-950">
      <div className="flex items-center gap-3 px-5 py-5">
        {platform ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-gold-500 font-black text-white">R<span className="text-xs">nY</span></div>
        ) : <div className="rounded-xl bg-white p-1"><img src={school?.logoUrl || '/favicon.png'} alt="" className="h-9 w-9 object-contain" /></div>}
        <div className="min-w-0 leading-tight">
          <div className="truncate font-bold text-white">{platform ? 'RnY EduSuite' : school?.name}</div>
          <div className="truncate text-[11px] uppercase tracking-wider text-white/40">{platform ? 'SaaS Control Center' : `${school?.plan?.name || ''} plan`}</div>
        </div>
      </div>
      {user.role === 'SUPER_ADMIN' && !platform && (
        <button onClick={async () => { await actAsSchool(null); nav('/platform'); }} className="mx-4 mb-3 flex items-center justify-center gap-2 rounded-xl border border-gold-400/40 bg-gold-400/10 py-2 text-xs font-semibold text-gold-300 hover:bg-gold-400/20"><ArrowLeftRight size={14} /> Back to SaaS console</button>
      )}
      <div className="flex-1 overflow-y-auto pb-6 [scrollbar-width:thin]"><SideNav items={items} onNavigate={() => setMobile(false)} /></div>
      <div className="border-t border-white/10 p-4 text-center text-[11px] text-white/40">Powered by <b className="text-white/70">RnY Groups</b></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="hidden w-72 shrink-0 lg:block">{sidebar}</aside>
      <AnimatePresence>
        {mobile && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobile(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>{sidebar}</motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex h-16 shrink-0 items-center gap-4 border-b bg-white px-4 sm:px-6">
          <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setMobile(true)}><Menu /></button>
          {!platform && !['PARENT', 'STUDENT'].includes(user.role) ? <GlobalSearch /> : <div className="flex-1" />}
          <div className="ml-auto flex items-center gap-2">
            {!platform && <Link to="/" target="_blank" className="btn-ghost hidden sm:inline-flex" title="Open website"><Globe size={18} /> Website</Link>}
            {!platform && <Link to="/app/messages" className="btn-ghost" title="Messages"><Bell size={18} /></Link>}
            <div className="relative">
              <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 rounded-xl p-1.5 pr-3 hover:bg-slate-100">
                <Avatar name={user.name} size={34} />
                <div className="hidden text-left leading-tight sm:block"><div className="text-sm font-semibold text-navy-900">{user.name}</div><div className="text-[11px] text-slate-500">{pretty(user.role)}</div></div>
                <ChevronDown size={15} className="text-slate-400" />
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border bg-white p-1.5 shadow-soft">
                    <div className="border-b px-3 py-2 text-xs text-slate-500">{user.email}</div>
                    <button onClick={() => { setPwd(true); setMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><KeyRound size={15} /> Change password</button>
                    <button onClick={() => { logout(); nav('/login'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"><LogOut size={15} /> Sign out</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
            <Outlet />
          </motion.div>
        </main>
      </div>
      <ChangePassword open={pwd} onClose={() => setPwd(false)} />
    </div>
  );
}
