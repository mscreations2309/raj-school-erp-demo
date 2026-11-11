import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

const Ctx = createContext(null);

export function SiteProvider({ children }) {
  const [site, setSite] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api.get('/public/site').then((r) => setSite(r.data)).catch((e) => setError(e));
  }, []);
  return <Ctx.Provider value={{ site, error }}>{children}</Ctx.Provider>;
}

/** Site data + bilingual helpers. */
export function useSite() {
  const { site, error } = useContext(Ctx);
  const { i18n, t } = useTranslation();
  const hi = i18n.language === 'hi';
  /** Localised field from a CMS record: L(item, 'title') → titleHi | titleEn */
  const L = (item, field) => {
    if (!item) return '';
    if (hi && item[`${field}Hi`]) return item[`${field}Hi`];
    return item[`${field}En`] ?? item[field] ?? '';
  };
  /** Localised CMS text by key */
  const C = (key) => {
    const v = site?.content?.[key];
    return v ? (hi ? v.hi || v.en : v.en) : '';
  };
  const schoolName = hi ? site?.school?.nameHi || site?.school?.name : site?.school?.name;
  return { site, error, hi, L, C, t, schoolName, lang: i18n.language };
}
