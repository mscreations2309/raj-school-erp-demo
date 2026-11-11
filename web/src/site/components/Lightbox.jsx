import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function Lightbox({ items, index, onClose, onIndex }) {
  const open = index !== null && index !== undefined;
  useEffect(() => {
    if (!open) return;
    const key = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex((index + 1) % items.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = ''; };
  }, [open, index, items.length, onClose, onIndex]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-navy-950/95 p-4 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <button className="absolute right-5 top-5 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" onClick={onClose} aria-label="Close"><X /></button>
          <button className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + items.length) % items.length); }} aria-label="Previous"><ChevronLeft /></button>
          <button className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % items.length); }} aria-label="Next"><ChevronRight /></button>
          <AnimatePresence mode="wait">
            <motion.figure key={index} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.35 }} className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
              <img src={items[index].src} alt="" className="max-h-[80vh] rounded-2xl object-contain shadow-2xl" />
              <figcaption className="mt-4 text-center text-white/80">{items[index].title} <span className="ml-2 text-white/40">{index + 1} / {items.length}</span></figcaption>
            </motion.figure>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
