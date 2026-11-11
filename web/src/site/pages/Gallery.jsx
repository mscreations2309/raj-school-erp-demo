import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Expand } from 'lucide-react';
import { useSite } from '../SiteContext';
import { PageHero } from '../SiteLayout';
import Lightbox from '../components/Lightbox';

export default function Gallery() {
  const { site, L, t } = useSite();
  const cats = ['All', ...new Set(site.gallery.map((g) => g.category))];
  const [cat, setCat] = useState('All');
  const [open, setOpen] = useState(null);
  const items = useMemo(() => site.gallery.filter((g) => cat === 'All' || g.category === cat), [cat, site.gallery]);
  return (
    <>
      <PageHero title={t('gallery.title')} kicker={t('gallery.kicker')} image={site.banners[8]?.imageUrl} crumbs={t('nav.gallery')} />
      <section className="py-20">
        <div className="container-x">
          <div className="mb-12 flex flex-wrap justify-center gap-2">
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`relative rounded-full px-5 py-2.5 text-sm font-semibold transition ${cat === c ? 'text-white' : 'text-slate-600 hover:text-navy-900'}`}>
                {cat === c && <motion.span layoutId="gal-pill" className="absolute inset-0 rounded-full bg-brand-600 shadow-glow" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                <span className="relative">{t(`gallery.categories.${c}`) || c}</span>
              </button>
            ))}
          </div>
          <motion.div layout className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence>
              {items.map((g, k) => (
                <motion.button
                  layout key={g.id} onClick={() => setOpen(k)}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.4, delay: k * 0.02 }}
                  className={`group relative overflow-hidden rounded-2xl ${k % 7 === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
                >
                  <img src={g.imageUrl} alt={g.titleEn} loading="lazy" className="aspect-square h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-navy-950/90 via-transparent to-transparent p-4 text-left opacity-0 transition duration-500 group-hover:opacity-100">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gold-300">{t(`gallery.categories.${g.category}`)}</span>
                    <span className="font-semibold text-white">{L(g, 'title')}</span>
                  </div>
                  <span className="absolute right-3 top-3 flex h-9 w-9 scale-0 items-center justify-center rounded-full bg-white/90 text-navy-900 transition group-hover:scale-100"><Expand size={16} /></span>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
      <Lightbox items={items.map((g) => ({ src: g.imageUrl, title: L(g, 'title') }))} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </>
  );
}
