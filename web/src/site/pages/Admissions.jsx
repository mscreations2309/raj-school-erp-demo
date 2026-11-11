import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Upload, FileText, X, Loader2, ShieldCheck, CheckCircle2, Search, CreditCard, Smartphone } from 'lucide-react';
import { useSite } from '../SiteContext';
import { PageHero } from '../SiteLayout';
import { Reveal, Heading } from '../components/Motion';
import { api, errMsg } from '../../lib/api';
import { fmtDate, money, pretty, STATUS_COLORS } from '../../lib/format';

const EMPTY = {
  studentName: '', gender: 'MALE', dob: '', gradeSought: '', bloodGroup: '', aadhaar: '', previousSchool: '',
  fatherName: '', fatherPhone: '', fatherEmail: '', fatherOccupation: '', motherName: '', motherPhone: '', motherOccupation: '',
  permanentAddress: '', correspondenceAddress: '', siblingInfo: '', hostelRequired: false, transportRequired: false,
};

function Field({ label, children, req }) {
  return <div><label className="label">{label}{req && <span className="text-brand-600"> *</span>}</label>{children}</div>;
}

function StatusChecker() {
  const { t } = useSite();
  const [q, setQ] = useState({ regNo: '', phone: '' });
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const check = async (e) => {
    e.preventDefault();
    setErr(''); setRes(null);
    try { setRes((await api.get('/public/admission/status', { params: q })).data); } catch (x) { setErr(errMsg(x)); }
  };
  return (
    <div className="card p-6">
      <h3 className="flex items-center gap-2 font-semibold text-navy-900"><Search size={18} /> {t('admission.checkStatus')}</h3>
      <form onSubmit={check} className="mt-4 grid gap-3">
        <input className="input" placeholder="REG20270001" value={q.regNo} onChange={(e) => setQ({ ...q, regNo: e.target.value.toUpperCase() })} required />
        <input className="input" placeholder={t('admission.fatherPhone')} value={q.phone} onChange={(e) => setQ({ ...q, phone: e.target.value })} required />
        <button className="btn-navy">{t('admission.track')}</button>
      </form>
      {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
      {res && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
          <div className="flex items-center justify-between"><b>{res.studentName}</b><span className={`badge ${STATUS_COLORS[res.status]}`}>{pretty(res.status)}</span></div>
          <div className="mt-1 text-slate-500">{res.regNo} • Class {res.gradeSought} • {fmtDate(res.createdAt)}</div>
          {res.testDate && <div className="mt-1 text-violet-700">Interaction / Test: {fmtDate(res.testDate)}</div>}
          {res.remarks && <div className="mt-1 text-slate-600">{res.remarks}</div>}
        </motion.div>
      )}
    </div>
  );
}

export default function Admissions() {
  const { site, t, C } = useSite();
  const steps = t('admission.steps');
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [f, setF] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [same, setSame] = useState(true);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [method, setMethod] = useState('UPI');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const fee = site.school.registrationFee;

  const validate = () => {
    const need = [
      ['studentName', 'dob', 'gradeSought'],
      ['fatherName', 'fatherPhone'],
      ['permanentAddress'],
      [],
    ][step] || [];
    const miss = need.filter((k) => !String(f[k] || '').trim());
    if (miss.length) return `Please fill: ${miss.map((k) => t(`admission.${k}`)).join(', ')}`;
    if (step === 1 && !/^[6-9]\d{9}$/.test(f.fatherPhone)) return 'Enter a valid 10-digit mobile number';
    if (step === 3 && files.some((x) => x.size > 1024 * 1024)) return 'Each file must be 1 MB or smaller';
    return '';
  };
  const go = (d) => {
    if (d > 0) { const e = validate(); if (e) return setError(e); }
    setError(''); setDir(d); setStep((s) => s + d);
  };

  const submit = async () => {
    if (!agree) return setError(t('admission.declaration'));
    setError(''); setBusy('submit');
    try {
      const fd = new FormData();
      Object.entries({ ...f, correspondenceAddress: same ? f.permanentAddress : f.correspondenceAddress }).forEach(([k, v]) => fd.append(k, v));
      files.forEach((x) => fd.append('documents', x));
      const { data } = await api.post('/public/admission', fd);
      setBusy('pay');
      await new Promise((r) => setTimeout(r, 1800)); // simulate gateway handshake
      const pay = await api.post(`/public/admission/${data.regNo}/pay`, { method });
      setDone({ ...data, paymentRef: pay.data.paymentRef });
    } catch (e) {
      setError(errMsg(e));
    } finally { setBusy(''); }
  };

  const reset = () => { setF(EMPTY); setFiles([]); setStep(0); setDone(null); setAgree(false); };
  const variants = { enter: (d) => ({ x: d > 0 ? 80 : -80, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d) => ({ x: d > 0 ? -80 : 80, opacity: 0 }) };

  return (
    <>
      <PageHero title={t('admission.title')} kicker={t('admission.kicker')} image={site.banners[9]?.imageUrl} crumbs={t('nav.admissions')} />

      <section className="py-20">
        <div className="container-x">
          <div className="grid gap-5 md:grid-cols-4">
            {t('admission.process').map(([a, b], k) => (
              <Reveal key={k} delay={k * 0.08}>
                <div className="relative h-full rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-6">
                  <div className="font-display text-5xl font-black text-brand-100">{String(k + 1).padStart(2, '0')}</div>
                  <div className="mt-2 font-semibold text-navy-900">{a}</div>
                  <div className="mt-1 text-sm text-slate-500">{b}</div>
                  {k < 3 && <ChevronRight className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-brand-300 md:block" />}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_360px]">
          <Reveal>
            <div className="card overflow-hidden shadow-soft">
              {/* Stepper */}
              <div className="border-b bg-white px-6 py-5 sm:px-10">
                <div className="flex items-center justify-between">
                  {steps.map((s, k) => (
                    <div key={k} className="flex flex-1 items-center last:flex-none">
                      <div className="flex flex-col items-center gap-1.5">
                        <motion.div animate={{ scale: k === step ? 1.1 : 1 }} className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition ${k < step || done ? 'bg-emerald-500 text-white' : k === step ? 'bg-brand-600 text-white shadow-glow' : 'bg-slate-100 text-slate-400'}`}>
                          {k < step || done ? <Check size={18} /> : k + 1}
                        </motion.div>
                        <span className={`hidden text-xs font-semibold sm:block ${k === step ? 'text-brand-600' : 'text-slate-400'}`}>{s}</span>
                      </div>
                      {k < steps.length - 1 && <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded bg-slate-100"><motion.div className="h-full bg-emerald-500" animate={{ width: k < step || done ? '100%' : '0%' }} transition={{ duration: 0.5 }} /></div>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[420px] overflow-hidden p-6 sm:p-10">
                {done ? (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
                    <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200 }} className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 size={56} className="text-emerald-500" /></motion.div>
                    <h3 className="mt-6 font-display text-3xl font-bold text-navy-900">{t('admission.success')}</h3>
                    <p className="mt-6 text-sm uppercase tracking-wider text-slate-500">{t('admission.regNo')}</p>
                    <motion.p initial={{ letterSpacing: '0.6em', opacity: 0 }} animate={{ letterSpacing: '0.15em', opacity: 1 }} transition={{ duration: 0.8 }} className="mt-1 font-display text-4xl font-bold text-brand-600">{done.regNo}</motion.p>
                    <p className="mt-3 text-sm text-slate-500">{t('admission.paymentRef')}: <code className="rounded bg-slate-100 px-2 py-0.5">{done.paymentRef}</code> • {money(done.registrationFee)}</p>
                    <p className="mx-auto mt-6 max-w-md text-slate-600">{t('admission.saveNote')}</p>
                    <div className="mt-8 flex justify-center gap-3"><button onClick={() => window.print()} className="btn-outline">{t('common.download')}</button><button onClick={reset} className="btn-primary">{t('admission.applyAnother')}</button></div>
                  </motion.div>
                ) : (
                  <AnimatePresence mode="wait" custom={dir}>
                    <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
                      {step === 0 && (
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div className="sm:col-span-2"><Field label={t('admission.studentName')} req><input className="input" value={f.studentName} onChange={set('studentName')} /></Field></div>
                          <Field label={t('admission.gender')} req>
                            <div className="grid grid-cols-3 gap-2">{['MALE', 'FEMALE', 'OTHER'].map((g) => <button type="button" key={g} onClick={() => setF({ ...f, gender: g })} className={`rounded-xl border py-2.5 text-sm font-medium transition ${f.gender === g ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 hover:border-slate-300'}`}>{t(`admission.${g.toLowerCase()}`)}</button>)}</div>
                          </Field>
                          <Field label={t('admission.dob')} req><input type="date" className="input" value={f.dob} onChange={set('dob')} max={new Date().toISOString().slice(0, 10)} /></Field>
                          <Field label={t('admission.grade')} req><select className="input" value={f.gradeSought} onChange={set('gradeSought')}><option value="">—</option>{site.grades.map((g) => <option key={g.id}>{g.name}</option>)}</select></Field>
                          <Field label={t('admission.bloodGroup')}><select className="input" value={f.bloodGroup} onChange={set('bloodGroup')}><option value="">—</option>{['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((b) => <option key={b}>{b}</option>)}</select></Field>
                          <Field label={t('admission.aadhaar')}><input className="input" maxLength={12} value={f.aadhaar} onChange={(e) => setF({ ...f, aadhaar: e.target.value.replace(/\D/g, '') })} /></Field>
                          <Field label={t('admission.previousSchool')}><input className="input" value={f.previousSchool} onChange={set('previousSchool')} /></Field>
                        </div>
                      )}
                      {step === 1 && (
                        <div className="grid gap-5 sm:grid-cols-2">
                          <Field label={t('admission.fatherName')} req><input className="input" value={f.fatherName} onChange={set('fatherName')} /></Field>
                          <Field label={t('admission.fatherPhone')} req><input className="input" maxLength={10} value={f.fatherPhone} onChange={(e) => setF({ ...f, fatherPhone: e.target.value.replace(/\D/g, '') })} /></Field>
                          <Field label={t('admission.fatherEmail')}><input type="email" className="input" value={f.fatherEmail} onChange={set('fatherEmail')} /></Field>
                          <Field label={t('admission.fatherOccupation')}><input className="input" value={f.fatherOccupation} onChange={set('fatherOccupation')} /></Field>
                          <Field label={t('admission.motherName')}><input className="input" value={f.motherName} onChange={set('motherName')} /></Field>
                          <Field label={t('admission.motherPhone')}><input className="input" maxLength={10} value={f.motherPhone} onChange={(e) => setF({ ...f, motherPhone: e.target.value.replace(/\D/g, '') })} /></Field>
                          <Field label={t('admission.motherOccupation')}><input className="input" value={f.motherOccupation} onChange={set('motherOccupation')} /></Field>
                          <Field label={t('admission.sibling')}><input className="input" value={f.siblingInfo} onChange={set('siblingInfo')} /></Field>
                        </div>
                      )}
                      {step === 2 && (
                        <div className="grid gap-5">
                          <Field label={t('admission.permanentAddress')} req><textarea rows={3} className="input" value={f.permanentAddress} onChange={set('permanentAddress')} /></Field>
                          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} className="h-4 w-4 accent-brand-600" /> {t('admission.sameAddress')}</label>
                          {!same && <Field label={t('admission.correspondenceAddress')}><textarea rows={3} className="input" value={f.correspondenceAddress} onChange={set('correspondenceAddress')} /></Field>}
                          <div className="grid gap-3 sm:grid-cols-2">
                            {['hostelRequired', 'transportRequired'].map((k) => (
                              <label key={k} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${f[k] ? 'border-brand-600 bg-brand-50' : 'border-slate-200'}`}>
                                <input type="checkbox" checked={f[k]} onChange={set(k)} className="h-4 w-4 accent-brand-600" /> <span className="font-medium">{t(`admission.${k === 'hostelRequired' ? 'hostel' : 'transport'}`)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      {step === 3 && (
                        <div>
                          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center transition hover:border-brand-400 hover:bg-brand-50/40">
                            <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2 }}><Upload className="text-brand-600" size={36} /></motion.div>
                            <span className="mt-3 font-semibold text-navy-900">{t('admission.upload')}</span>
                            <span className="mt-1 text-sm text-slate-500">{t('admission.uploadHint')}</span>
                            <input type="file" multiple accept=".png,.jpg,.jpeg,.pdf" className="hidden" onChange={(e) => setFiles([...files, ...Array.from(e.target.files)].slice(0, 6))} />
                          </label>
                          <div className="mt-5 space-y-2">
                            {files.map((x, k) => (
                              <motion.div key={k} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`flex items-center justify-between rounded-xl border p-3 text-sm ${x.size > 1048576 ? 'border-rose-300 bg-rose-50' : 'bg-white'}`}>
                                <span className="flex items-center gap-2"><FileText size={16} className="text-navy-600" /> {x.name} <span className="text-slate-400">({(x.size / 1024).toFixed(0)} KB)</span></span>
                                <button onClick={() => setFiles(files.filter((_, i) => i !== k))} className="text-slate-400 hover:text-rose-600"><X size={16} /></button>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                      {step === 4 && (
                        <div className="space-y-6">
                          <div className="grid gap-x-8 gap-y-3 rounded-2xl bg-slate-50 p-6 text-sm sm:grid-cols-2">
                            {[['studentName'], ['gradeSought', 'grade'], ['dob'], ['gender'], ['fatherName'], ['fatherPhone'], ['motherName'], ['permanentAddress']].map(([k, label]) => (
                              <div key={k} className="flex justify-between gap-4 border-b border-slate-200/70 pb-2"><span className="text-slate-500">{t(`admission.${label || k}`)}</span><b className="text-right text-navy-900">{k === 'gender' ? t(`admission.${f.gender.toLowerCase()}`) : f[k] || '—'}</b></div>
                            ))}
                          </div>
                          <div className="rounded-2xl border-2 border-navy-100 p-6">
                            <div className="flex items-center justify-between"><span className="flex items-center gap-2 font-semibold text-navy-900"><ShieldCheck className="text-emerald-500" /> {t('admission.demoGateway')}</span><span className="font-display text-2xl font-bold text-brand-600">{money(fee)}</span></div>
                            <div className="mt-4 grid grid-cols-3 gap-2">
                              {[['UPI', Smartphone], ['CARD', CreditCard], ['ONLINE', ShieldCheck]].map(([m, I]) => (
                                <button key={m} type="button" onClick={() => setMethod(m)} className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-semibold transition ${method === m ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'}`}><I size={18} />{m === 'ONLINE' ? 'Net Banking' : m}</button>
                              ))}
                            </div>
                          </div>
                          <label className="flex items-start gap-3 text-sm text-slate-600"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 accent-brand-600" />{t('admission.declaration')}</label>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}

                <AnimatePresence>
                  {busy && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur">
                      <Loader2 className="animate-spin text-brand-600" size={44} />
                      <p className="mt-4 font-semibold text-navy-900">{busy === 'pay' ? t('admission.paying') : t('common.loading')}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {!done && (
                <div className="flex items-center justify-between border-t bg-slate-50/60 px-6 py-4 sm:px-10">
                  <button disabled={step === 0} onClick={() => go(-1)} className="btn-ghost"><ChevronLeft size={16} /> {t('common.back')}</button>
                  {error && <p className="mx-4 hidden flex-1 text-center text-sm text-rose-600 sm:block">{error}</p>}
                  {step < 4 ? <button onClick={() => go(1)} className="btn-primary">{t('common.next')} <ChevronRight size={16} /></button> : <button disabled={!!busy} onClick={submit} className="btn-primary">{t('admission.payNow')} • {money(fee)}</button>}
                </div>
              )}
              {error && <p className="px-6 pb-4 text-sm text-rose-600 sm:hidden">{error}</p>}
            </div>
          </Reveal>

          <aside className="space-y-6">
            <StatusChecker />
            <div className="card p-6">
              <h3 className="font-semibold text-navy-900">{t('admission.documents')}</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-600">{C('admission.documents').split('|').map((d) => <li key={d} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />{d}</li>)}</ul>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-navy-900">{t('admission.instructions')}</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-600">{C('admission.instructions').split('|').map((d) => <li key={d} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />{d}</li>)}</ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
