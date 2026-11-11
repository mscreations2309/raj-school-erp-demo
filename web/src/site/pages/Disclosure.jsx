import { useEffect, useState } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { useSite } from '../SiteContext';
import { PageHero } from '../SiteLayout';
import { Reveal } from '../components/Motion';
import { api } from '../../lib/api';

export default function Disclosure() {
  const { site, t } = useSite();
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/public/disclosure').then((r) => setData(r.data)); }, []);
  const sections = ['GENERAL', 'STAFF', 'INFRASTRUCTURE', 'DOCUMENTS'];
  return (
    <>
      <PageHero title={t('disclosure.title')} kicker={t('disclosure.kicker')} image={site.banners[2]?.imageUrl} crumbs={t('nav.disclosure')} />
      <section className="py-20">
        <div className="container-x max-w-5xl space-y-10">
          {!data && <div className="py-20 text-center text-slate-400">{t('common.loading')}</div>}
          {data && sections.map((sec, si) => (
            <Reveal key={sec} delay={si * 0.05}>
              <div className="card overflow-hidden">
                <h2 className="bg-navy-900 px-6 py-4 font-display text-lg font-bold text-white">{t(`disclosure.${sec}`)}</h2>
                <table className="w-full text-sm">
                  <tbody>
                    {data.items.filter((x) => x.section === sec).map((x, k) => (
                      <tr key={x.id} className="border-t transition hover:bg-slate-50">
                        <td className="w-14 px-6 py-3 text-slate-400">{k + 1}</td>
                        <td className="px-2 py-3 font-medium text-slate-700">{x.label}</td>
                        <td className="px-6 py-3 text-right text-navy-900">
                          {x.fileUrl ? <a href={x.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"><FileText size={14} /> {t('common.download')}</a>
                            : x.value?.startsWith('http') ? <a href={x.value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline">View <ExternalLink size={13} /></a>
                            : <b>{x.value || <span className="font-normal text-slate-400">{t('disclosure.available')}</span>}</b>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          ))}
          {data && (
            <Reveal>
              <div className="card overflow-hidden">
                <h2 className="bg-navy-900 px-6 py-4 font-display text-lg font-bold text-white">{t('disclosure.results')}</h2>
                <div className="overflow-x-auto">
                  <table className="table-x">
                    <thead><tr><th>Class</th><th>Year</th><th>{t('home.registered')}</th><th>{t('home.passed')}</th><th>Pass %</th></tr></thead>
                    <tbody>{data.results.map((r) => <tr key={r.id}><td className="font-semibold">{r.className}</td><td>{r.year}</td><td>{r.registered}</td><td>{r.passed}</td><td><span className="badge bg-emerald-50 text-emerald-700">{r.percent}%</span></td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
