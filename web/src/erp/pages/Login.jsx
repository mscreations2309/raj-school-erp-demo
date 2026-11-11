import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, LogIn, Eye, EyeOff, ArrowLeft, ShieldCheck, Users, GraduationCap, Wallet, School, BookOpen, UserRound } from 'lucide-react';
import { useAuth, homeFor } from '../../lib/auth';
import { api, errMsg } from '../../lib/api';

const DEMO = [
  ['School Admin', 'admin@rajschool.in', 'Admin@123', ShieldCheck],
  ['Principal', 'principal@rajschool.in', 'Principal@123', School],
  ['Teacher', 'teacher@rajschool.in', 'Teacher@123', GraduationCap],
  ['Accountant', 'accounts@rajschool.in', 'Accounts@123', Wallet],
  ['Reception', 'reception@rajschool.in', 'Reception@123', Users],
  ['Librarian', 'library@rajschool.in', 'Library@123', BookOpen],
  ['Parent', '9876543210', '9876543210', UserRound],
  ['RnY Super Admin', 'admin@rnygroups.com', 'Admin@123', ShieldCheck],
];

export default function Login() {
  const { login, user, school } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [v, setV] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(sp.get('expired') ? 'Your session expired. Please sign in again.' : '');
  const [site, setSite] = useState(null);
  useEffect(() => { api.get('/public/site').then((r) => setSite({ ...r.data.school, banner: r.data.banners[0]?.imageUrl })).catch(() => {}); }, []);
  useEffect(() => { if (user) nav(sp.get('next') || homeFor(user, school), { replace: true }); }, [user, school, nav, sp]);

  const submit = async (e, creds = v) => {
    e?.preventDefault();
    setBusy(true); setError('');
    try { await login(creds.email.trim(), creds.password, site?.slug); } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy-950 lg:block">
        <motion.img initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 2 }} src={site?.banner || site?.logoUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900/90 to-brand-900/80" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center gap-2 text-sm text-white/70 hover:text-white"><ArrowLeft size={16} /> Back to website</Link>
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
              <div className="rounded-2xl bg-white p-2"><img src={site?.logoUrl || '/favicon.png'} alt="" className="h-16 w-16" /></div>
              <div><div className="font-display text-3xl font-bold">{site?.name || 'School ERP'}</div><div className="text-sm text-gold-300">Smart School Management</div></div>
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-12 font-display text-5xl font-bold leading-tight">One platform for<br /><span className="text-gradient">everything school.</span></motion.h2>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 grid max-w-md grid-cols-2 gap-3 text-sm text-white/80">
              {['Admissions & Students', 'Attendance & Timetable', 'Exams & Report Cards', 'Fees & Online Payments', 'HR, Payroll & Leaves', 'Transport, Hostel & Library', 'Parent & Teacher Portals', 'Website CMS (EN / हिं)'].map((x) => <div key={x} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-gold-400" />{x}</div>)}
            </motion.div>
          </div>
          <div className="text-sm text-white/50">Powered by <b className="text-white">RnY Groups</b> • RnY EduSuite</div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-white p-6 sm:p-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 text-sm text-slate-500 lg:hidden"><ArrowLeft size={16} /> Website</Link>
          <h1 className="text-3xl font-bold text-navy-900">Welcome back</h1>
          <p className="mt-2 text-slate-500">Sign in with your email or registered mobile number.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div><label className="label">Email or mobile</label><input className="input py-3" autoFocus required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} placeholder="you@school.in or 98XXXXXXXX" /></div>
            <div>
              <label className="label">Password</label>
              <div className="relative"><input type={show ? 'text' : 'password'} className="input py-3 pr-11" required value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} /><button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            </div>
            {error && <motion.p initial={{ x: -10 }} animate={{ x: [0, -8, 8, -4, 0] }} className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</motion.p>}
            <button className="btn-primary w-full py-3.5 text-base" disabled={busy}>{busy ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />} Sign in</button>
          </form>

          <div className="mt-10">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" /> Demo logins (one click) <span className="h-px flex-1 bg-slate-200" /></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {DEMO.map(([label, email, password, I]) => (
                <button key={label} disabled={busy} onClick={() => { setV({ email, password }); submit(null, { email, password }); }} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50">
                  <I size={16} className="text-brand-600" /> <span className="font-medium text-slate-700">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
