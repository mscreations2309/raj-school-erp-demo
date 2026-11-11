import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring, useScroll, useTransform, animate } from 'framer-motion';

export const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] } }),
};

/** Fade + rise when scrolled into view */
export function Reveal({ children, delay = 0, y = 40, x = 0, className = '', as = 'div', once = true }) {
  const M = motion[as];
  return (
    <M
      className={className}
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </M>
  );
}

/** Stagger children that use variants={fadeUp} */
export function Stagger({ children, className = '' }) {
  return (
    <motion.div className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
      {children}
    </motion.div>
  );
}

/** Counts up from 0 when visible */
export function Counter({ to, suffix = '', prefix = '', duration = 2, decimals = 0, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, Number(to) || 0, { duration, ease: 'easeOut', onUpdate: (v) => setVal(v) });
    return () => c.stop();
  }, [inView, to, duration]);
  return <span ref={ref} className={className}>{prefix}{val.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

/** Mouse-follow 3D tilt card */
export function Tilt({ children, className = '', max = 10 }) {
  const ref = useRef(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * max * 2);
    rx.set(-py * max * 2);
  };
  const reset = () => { rx.set(0); ry.set(0); };
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={reset} style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }} className={className}>
      {children}
    </motion.div>
  );
}

/** Image that drifts slower than the page */
export function Parallax({ src, className = '', speed = 80, alt = '' }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [-speed, speed]);
  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.img src={src} alt={alt} style={{ y, scale: 1.25 }} className="h-full w-full object-cover" loading="lazy" />
    </div>
  );
}

/** Section heading with kicker + animated underline */
export function Heading({ kicker, title, sub, align = 'center', light = false }) {
  const center = align === 'center';
  return (
    <div className={`mb-12 ${center ? 'text-center mx-auto max-w-3xl' : ''}`}>
      {kicker && (
        <Reveal y={20}>
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] ${light ? 'bg-white/10 text-gold-300' : 'bg-brand-50 text-brand-700'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${light ? 'bg-gold-400' : 'bg-brand-600'} animate-pulse`} /> {kicker}
          </span>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <h2 className={`mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl ${light ? 'text-white' : 'text-navy-900'}`}>{title}</h2>
      </Reveal>
      <motion.div
        initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.2 }}
        className={`mt-5 h-1 w-24 origin-left rounded-full bg-gradient-to-r from-brand-600 to-gold-500 ${center ? 'mx-auto' : ''}`}
      />
      {sub && <Reveal delay={0.1}><p className={`mt-5 text-base sm:text-lg ${light ? 'text-white/70' : 'text-slate-600'}`}>{sub}</p></Reveal>}
    </div>
  );
}

/** Animated gradient blobs for backgrounds */
export function Blobs({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute -left-24 -top-24 h-96 w-96 animate-blob bg-brand-500/20 blur-3xl" />
      <div className="absolute -right-24 top-1/3 h-[28rem] w-[28rem] animate-blob bg-navy-500/20 blur-3xl [animation-delay:-4s]" />
      <div className="absolute bottom-0 left-1/3 h-80 w-80 animate-blob bg-gold-400/20 blur-3xl [animation-delay:-8s]" />
    </div>
  );
}

/** Words of a sentence fly in one by one */
export function SplitText({ text, className = '', delay = 0 }) {
  const words = String(text || '').split(' ');
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '110%', rotate: 6 }}
            animate={{ y: 0, rotate: 0 }}
            transition={{ duration: 0.8, delay: delay + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}
