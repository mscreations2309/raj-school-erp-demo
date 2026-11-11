import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, ShieldCheck, XCircle, Loader2 } from 'lucide-react';
import { useSite } from '../SiteContext';
import { PageHero } from '../SiteLayout';
import { api, errMsg } from '../../lib/api';
import { fmtDate } from '../../lib/format';

export default function TC() {
  const { site, t, schoolName } = useSite();
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const search = async (e) => {
    e.preventDefault();
    setLoading(true); setErr(''); setRes(null);
    try { setRes((await api.get('/public/tc', { params: { q } })).data); } catch (x) { setErr(errMsg(x)); } finally { setLoading(false); }
  };
  return (
    <>
      <PageHero title={t('tc.title')} kicker={t('tc.kicker')} image={site.banners[4]?.imageUrl} crumbs={t('nav.tc')} />
      <section className="py-20">
        <div className="container-x max-w-3xl">
          <form onSubmit={search} className="card flex flex-col gap-3 p-4 shadow-soft sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} className="input py-3.5 pl-11 text-base" placeholder="TC/2026/0001" required /></div>
            <button className="btn-primary px-8 py-3.5">{loading ? <Loader2 className="animate-spin" size={18} /> : t('common.search')}</button>
          </form>
          <p className="mt-3 text-center text-sm text-slate-500">{t('tc.hint')}</p>
          <AnimatePresence mode="wait">
            {res && (
              <motion.div key="ok" initial={{ opacity: 0, y: 30, rotateX: -15 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 120 }} className="relative mt-10 overflow-hidden rounded-3xl border-4 border-double border-navy-200 bg-[linear-gradient(135deg,#fff,#f8fafc)] p-8 shadow-soft sm:p-10">
                <img src={site.school.logoUrl} alt="" className="pointer-events-none absolute right-6 top-6 h-24 w-24 opacity-10" />
                <div className="flex items-center gap-3 text-emerald-600"><ShieldCheck size={28} /><span className="text-lg font-bold">{t('tc.verified')}</span></div>
                <div className="mt-1 text-sm text-slate-500">{schoolName} • {res.tcNo}</div>
                <dl className="mt-8 grid gap-x-10 gap-y-4 sm:grid-cols-2">
                  {[['student', res.studentName], ['father', res.fatherName], ['admissionNo', res.admissionNo], ['class', res.className], ['leaving', fmtDate(res.leavingDate)], ['issue', fmtDate(res.issueDate)], ['conduct', res.conduct], ['reason', res.reason]].map(([k, v]) => (
                    <div key={k} className="border-b border-dashed border-slate-200 pb-2"><dt className="text-xs uppercase tracking-wide text-slate-400">{t(`tc.${k}`)}</dt><dd className="mt-0.5 font-semibold text-navy-900">{v || '—'}</dd></div>
                  ))}
                </dl>
              </motion.div>
            )}
            {err && (
              <motion.div key="err" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-10 rounded-3xl bg-rose-50 p-8 text-center text-rose-700"><XCircle className="mx-auto" size={40} /><p className="mt-3 font-semibold">{err}</p></motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </>
  );
}
