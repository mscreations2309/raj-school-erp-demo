import { motion } from 'framer-motion';
import { useSite } from '../SiteContext';
import { PageHero } from '../SiteLayout';
import { Heading, Reveal, Counter } from '../components/Motion';
import Icon from '../components/Icon';

export default function Facilities() {
  const { site, L, t } = useSite();
  return (
    <>
      <PageHero title={t('facilities.title')} kicker={t('facilities.kicker')} image={site.gallery.find((g) => g.imageUrl.includes('school-ground'))?.imageUrl} crumbs={t('nav.facilities')} />
      <section className="py-24">
        <div className="container-x">
          <Heading kicker={t('facilities.kicker')} title={t('facilities.title')} sub={t('facilities.intro')} />
          <div className="space-y-24">
            {site.facilities.map((f, k) => (
              <div key={f.id} className="grid items-center gap-10 lg:grid-cols-2">
                <Reveal x={k % 2 ? 60 : -60} y={0} className={k % 2 ? 'lg:order-2' : ''}>
                  <div className="group relative">
                    <div className={`absolute -inset-3 rounded-[2rem] bg-gradient-to-br ${k % 2 ? 'from-navy-600 to-brand-600' : 'from-brand-600 to-gold-500'} opacity-20 blur-xl transition group-hover:opacity-40`} />
                    <div className="relative overflow-hidden rounded-[2rem]">
                      <motion.img whileHover={{ scale: 1.06 }} transition={{ duration: 0.8 }} src={f.imageUrl} alt="" className="h-[380px] w-full object-cover" loading="lazy" />
                    </div>
                  </div>
                </Reveal>
                <Reveal x={k % 2 ? -60 : 60} y={0} delay={0.1}>
                  <div className="flex items-center gap-4">
                    <motion.div whileInView={{ rotate: [0, -10, 10, 0] }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-glow"><Icon name={f.icon} size={28} /></motion.div>
                    <span className="font-display text-6xl font-black text-slate-100">{String(k + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="mt-6 font-display text-3xl font-bold text-navy-900">{L(f, 'title')}</h3>
                  <p className="mt-4 text-lg leading-relaxed text-slate-600">{L(f, 'desc')}</p>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-gradient-to-r from-brand-700 to-navy-800 py-16 text-white">
        <div className="container-x grid grid-cols-2 gap-8 text-center md:grid-cols-4">
          {[[8805, ' m²', 'Campus Area'], [51, '', 'Classrooms'], [9, '', 'Labs'], [120, '', 'Smart Classes']].map(([v, s, l]) => (
            <div key={l}><div className="font-display text-4xl font-bold sm:text-5xl"><Counter to={v} suffix={s} /></div><div className="mt-2 text-sm text-white/70">{l}</div></div>
          ))}
        </div>
      </section>
    </>
  );
}
