import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { useSite } from '../SiteContext';
import { PageHero } from '../SiteLayout';
import { Reveal, Heading } from '../components/Motion';
import { api, errMsg } from '../../lib/api';

export default function Contact() {
  const { site, L, t, C } = useSite();
  const s = site.school;
  const [form, setForm] = useState({ name: '', phone: '', email: '', gradeSought: '', message: '' });
  const [state, setState] = useState({ loading: false, done: false, error: '' });
  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, done: false, error: '' });
    try {
      await api.post('/public/enquiry', form);
      setState({ loading: false, done: true, error: '' });
      setForm({ name: '', phone: '', email: '', gradeSought: '', message: '' });
    } catch (err) {
      setState({ loading: false, done: false, error: errMsg(err) });
    }
  };
  const cards = [
    [MapPin, t('common.address'), `${s.address}, ${s.city}, ${s.state} ${s.pincode}`],
    [Phone, t('common.phone'), [s.phone, ...site.contacts.map((c) => c.phone)].filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 3).join(', ')],
    [Mail, t('common.email'), s.email],
    [Clock, t('contact.hours'), t('contact.hoursText')],
  ];
  return (
    <>
      <PageHero title={t('contact.title')} kicker={t('contact.kicker')} image={site.gallery.find((g) => g.imageUrl.includes('corporate'))?.imageUrl} crumbs={t('nav.contact')} />
      <section className="relative z-10 -mt-16">
        <div className="container-x grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([I, h, v], k) => (
            <Reveal key={k} delay={k * 0.08}>
              <div className="card group h-full p-6 shadow-soft transition hover:-translate-y-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white"><I /></div>
                <div className="mt-4 text-sm font-semibold uppercase tracking-wide text-slate-400">{h}</div>
                <div className="mt-1 font-medium text-navy-900">{v}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-24">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-3xl font-bold text-navy-900">{t('contact.enquiry')}</h2>
            <p className="mt-3 text-slate-600">{t('contact.enquiryText')}</p>
            <AnimatePresence mode="wait">
              {state.done ? (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 rounded-3xl bg-emerald-50 p-10 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}><CheckCircle2 size={64} className="mx-auto text-emerald-500" /></motion.div>
                  <p className="mt-4 text-lg font-semibold text-emerald-800">{t('contact.thanks')}</p>
                  <button onClick={() => setState({ ...state, done: false })} className="btn-outline mt-6">{t('common.send')} ↺</button>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={submit} className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div><label className="label">{t('common.name')} *</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><label className="label">{t('contact.mobile')} *</label><input required pattern="[6-9][0-9]{9}" maxLength={10} className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} /></div>
                  <div><label className="label">{t('common.email')}</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><label className="label">{t('contact.classInterested')}</label>
                    <select className="input" value={form.gradeSought} onChange={(e) => setForm({ ...form, gradeSought: e.target.value })}><option value="">—</option>{site.grades.map((g) => <option key={g.id}>{g.name}</option>)}</select>
                  </div>
                  <div className="sm:col-span-2"><label className="label">{t('common.message')}</label><textarea rows={4} className="input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
                  {state.error && <p className="text-sm text-rose-600 sm:col-span-2">{state.error}</p>}
                  <button disabled={state.loading} className="btn-primary py-3.5 sm:col-span-2">{state.loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} {t('common.submit')}</button>
                </motion.form>
              )}
            </AnimatePresence>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-3xl font-bold text-navy-900">{t('contact.locate')}</h2>
            <div className="mt-8 overflow-hidden rounded-3xl border shadow-soft">
              <iframe title="map" src={C('contact.mapEmbed') || s.mapEmbed} className="h-[420px] w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-slate-50 py-24">
        <div className="container-x">
          <Heading kicker={t('contact.kicker')} title={t('contact.directory')} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {site.contacts.map((c, k) => (
              <Reveal key={c.id} delay={(k % 3) * 0.06}>
                <a href={`tel:${c.phone}`} className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700 transition group-hover:bg-brand-600 group-hover:text-white"><Phone size={18} /></div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wide text-brand-600">{L(c, 'purpose')}</div>
                    <div className="truncate font-semibold text-navy-900">{c.officer}</div>
                    <div className="text-sm text-slate-500">{c.phone}</div>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
