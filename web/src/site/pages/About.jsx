import { motion } from 'framer-motion';
import { Quote, Target, Eye, Landmark } from 'lucide-react';
import { useSite } from '../SiteContext';
import { PageHero } from '../SiteLayout';
import { Reveal, Heading, Parallax, Tilt } from '../components/Motion';
import { Results } from './Home';

export default function About() {
  const { site, C, L, t } = useSite();
  const timeline = t('about.timeline');
  return (
    <>
      <PageHero title={C('about.title')} kicker={t('about.kicker')} image={site.banners[3]?.imageUrl} crumbs={t('nav.about')} />

      <section className="py-24">
        <div className="container-x grid items-center gap-16 lg:grid-cols-2">
          <div>
            <Reveal><span className="inline-flex items-center gap-2 rounded-full bg-navy-50 px-4 py-1.5 text-sm font-semibold text-navy-700"><Landmark size={16} /> {t('about.foundation')}</span></Reveal>
            <Reveal delay={0.05}><h2 className="mt-5 font-display text-3xl font-bold text-navy-900 sm:text-4xl">{C('about.aegis')}</h2></Reveal>
            <Reveal delay={0.1}><p className="mt-6 text-lg leading-relaxed text-slate-600">{C('about.history')}</p></Reveal>
            <Reveal delay={0.15}><p className="mt-4 leading-relaxed text-slate-600">{C('about.affiliation')}</p></Reveal>
          </div>
          <Reveal delay={0.1}>
            <Tilt max={5}>
              <div className="relative">
                <div className="absolute -inset-3 rotate-2 rounded-[2rem] bg-gradient-to-br from-brand-600 to-gold-500" />
                <Parallax src={site.banners[0]?.imageUrl} className="relative h-[460px] rounded-[2rem]" speed={40} />
              </div>
            </Tilt>
          </Reveal>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-slate-50 py-24">
        <div className="container-x">
          <Heading kicker={t('about.kicker')} title={t('about.journey')} />
          <div className="relative mx-auto max-w-4xl">
            <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.5 }} className="absolute left-5 top-0 h-full w-0.5 origin-top bg-gradient-to-b from-brand-600 via-gold-500 to-navy-600 md:left-1/2" />
            {timeline.map(([year, text], k) => (
              <Reveal key={k} x={k % 2 ? 60 : -60} y={0} delay={0.05}>
                <div className={`relative mb-10 flex items-center md:w-1/2 ${k % 2 ? 'md:ml-auto md:pl-12' : 'md:pr-12 md:text-right'} pl-14 md:pl-0`}>
                  <div className={`absolute left-[11px] h-5 w-5 rounded-full border-4 border-white bg-brand-600 shadow md:left-auto ${k % 2 ? 'md:-left-2.5' : 'md:-right-2.5'}`} />
                  <div className="card w-full p-6 transition hover:-translate-y-1 hover:shadow-soft">
                    <div className="font-display text-3xl font-bold text-brand-600">{year}</div>
                    <p className="mt-2 text-slate-600">{text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Vision & mission */}
      <section className="py-24">
        <div className="container-x">
          <Heading kicker={t('about.vision')} title={C('vision.title')} />
          <div className="grid gap-8 md:grid-cols-2">
            {[[Eye, C('teachers.title'), C('teachers.text')], [Target, C('vision.title'), C('vision.text')]].map(([I, h, p], k) => (
              <Reveal key={k} delay={k * 0.1}>
                <div className="group relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 to-navy-950 p-10 text-white">
                  <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-600/30 blur-3xl transition group-hover:bg-gold-400/30" />
                  <I size={40} className="text-gold-400" />
                  <h3 className="mt-6 font-display text-2xl font-bold">{h}</h3>
                  <p className="mt-4 leading-relaxed text-white/75">{p}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership messages */}
      <section className="bg-gradient-to-b from-white to-slate-50 py-24">
        <div className="container-x">
          <Heading kicker={t('home.leadersKicker')} title={t('about.messages')} />
          <div className="space-y-16">
            {site.leaders.map((p, k) => (
              <Reveal key={p.id}>
                <div className={`grid items-center gap-10 md:grid-cols-[300px_1fr] ${k % 2 ? 'md:grid-cols-[1fr_300px]' : ''}`}>
                  <div className={`${k % 2 ? 'md:order-2' : ''}`}>
                    <Tilt>
                      <div className="relative mx-auto w-64 md:w-full">
                        <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-brand-600 to-navy-700 opacity-80" />
                        <img src={p.photoUrl} alt={p.name} className="relative aspect-[4/5] w-full rounded-[1.8rem] object-cover object-top" />
                      </div>
                    </Tilt>
                  </div>
                  <div className="card relative p-8 sm:p-10">
                    <Quote className="absolute right-8 top-8 text-slate-100" size={80} />
                    <p className="relative font-display text-2xl italic leading-relaxed text-navy-900">“{L(p, 'quote')}”</p>
                    <p className="relative mt-6 leading-relaxed text-slate-600">{L(p, 'message')}</p>
                    <div className="relative mt-8 border-t pt-6">
                      <div className="font-display text-xl font-bold text-navy-900">{L(p, 'name') || p.name}</div>
                      <div className="text-sm font-medium text-brand-600">{L(p, 'role') || p.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <Results />
    </>
  );
}
