// Config-driven CRUD page: list + search + filters + paging + create/edit modal + delete + CSV export.
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search, Download, Upload, Loader2, RefreshCw } from 'lucide-react';
import { api, errMsg, uploadFile } from '../../lib/api';
import { fmtDate, money, pretty } from '../../lib/format';
import { useAuth } from '../../lib/auth';
import { PageHeader, Card, Modal, Confirm, Pagination, Spinner, Empty, Badge, Field, useFetch, ErrorBox } from './ui';

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

export function renderCell(col, row) {
  const v = typeof col.render === 'function' ? col.render(row) : get(row, col.key);
  if (typeof col.render === 'function') return v;
  if (v == null || v === '') return <span className="text-slate-300">—</span>;
  switch (col.type) {
    case 'date': return fmtDate(v);
    case 'money': return <span className="font-semibold">{money(v)}</span>;
    case 'bool': return v ? <Badge status="ACTIVE">Yes</Badge> : <Badge>No</Badge>;
    case 'status': return <Badge status={v} />;
    case 'image': return <img src={v} alt="" className="h-10 w-14 rounded-lg object-cover" />;
    default: return String(v);
  }
}

function FieldInput({ f, value, onChange, options }) {
  const [uploading, setUploading] = useState(false);
  const common = { className: 'input', value: value ?? '', onChange: (e) => onChange(e.target.value), required: f.required, placeholder: f.placeholder, disabled: f.disabled };
  switch (f.type) {
    case 'textarea': return <textarea rows={f.rows || 3} {...common} />;
    case 'number': case 'money': return <input type="number" step="any" {...common} />;
    case 'date': return <input type="date" {...common} value={value ? String(value).slice(0, 10) : ''} />;
    case 'time': return <input type="time" {...common} />;
    case 'bool': return (
      <label className="flex h-[42px] items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {f.checkLabel || 'Yes'}</label>
    );
    case 'select': return (
      <select {...common}>
        <option value="">{f.placeholder || '— Select —'}</option>
        {(options || f.options || []).map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{pretty(o)}</option>))}
      </select>
    );
    case 'image': case 'file': return (
      <div className="flex items-center gap-3">
        {value && f.type === 'image' && <img src={value} alt="" className="h-14 w-20 rounded-lg object-cover" />}
        {value && f.type === 'file' && <a href={value} target="_blank" rel="noreferrer" className="text-sm text-brand-600 underline">View file</a>}
        <label className="btn-outline btn-sm cursor-pointer">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {value ? 'Replace' : 'Upload'}
          <input type="file" className="hidden" accept={f.type === 'image' ? 'image/*' : '.pdf,.png,.jpg,.jpeg'} onChange={async (e) => {
            const file = e.target.files[0]; if (!file) return;
            setUploading(true);
            try { onChange(await uploadFile(file)); } catch (err) { toast.error(errMsg(err)); } finally { setUploading(false); }
          }} />
        </label>
        <input className="input flex-1" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="or paste URL" />
      </div>
    );
    default: return <input type={f.inputType || 'text'} {...common} />;
  }
}

/** Loads remote select options for fields with `optionsFrom: { url, map }` */
function useFieldOptions(fields) {
  const [opts, setOpts] = useState({});
  useEffect(() => {
    fields.filter((f) => f.optionsFrom).forEach(async (f) => {
      try {
        const { data } = await api.get(f.optionsFrom.url, { params: { all: 1 } });
        setOpts((o) => ({ ...o, [f.name]: (data.items || data).map(f.optionsFrom.map) }));
      } catch { /* ignore */ }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return opts;
}

export function RecordForm({ fields, initial, onSubmit, onCancel, submitLabel = 'Save' }) {
  const [v, setV] = useState(() => {
    const o = {};
    fields.forEach((f) => { o[f.name] = initial?.[f.name] ?? f.default ?? (f.type === 'bool' ? false : ''); });
    return o;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const options = useFieldOptions(fields);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await onSubmit(v); } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.filter((f) => !f.hidden || f.hidden(v) === false).map((f) => (
          <Field key={f.name} label={`${f.label}${f.required ? ' *' : ''}`} className={f.full || ['textarea', 'image', 'file'].includes(f.type) ? 'sm:col-span-2' : ''} hint={f.hint}>
            <FieldInput f={f} value={v[f.name]} options={options[f.name]} onChange={(val) => setV((s) => ({ ...s, [f.name]: val }))} />
          </Field>
        ))}
      </div>
      <div className="mt-5"><ErrorBox error={error} /></div>
      <div className="mt-6 flex justify-end gap-2 border-t pt-5">
        {onCancel && <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>}
        <button className="btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} {submitLabel}</button>
      </div>
    </form>
  );
}

/**
 * <ResourcePage title endpoint columns fields filters canCreate canEdit canDelete rowActions headerActions />
 * columns: [{ key, label, type, render }]
 * fields:  [{ name, label, type, required, options, optionsFrom }]
 * filters: [{ name, label, options | optionsFrom }]
 */
export default function ResourcePage({
  title, subtitle, icon, endpoint, columns, fields = [], filters = [], searchable = true, writeRoles,
  canCreate = true, canEdit = true, canDelete = true, rowActions, headerActions, defaultParams = {}, transformOut, onRowClick, pageSize = 20, children,
}) {
  const { is } = useAuth();
  const allowedWrite = !writeRoles || is(writeRoles);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [qDebounced, setQD] = useState('');
  const [filterVals, setFilterVals] = useState({});
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const id = setTimeout(() => { setQD(q); setPage(1); }, 300); return () => clearTimeout(id); }, [q]);
  const params = useMemo(() => ({ page, pageSize, q: qDebounced || undefined, ...defaultParams, ...filterVals }), [page, pageSize, qDebounced, filterVals, defaultParams]);
  const { data, loading, error, reload } = useFetch(endpoint, params);
  const filterOptions = useFieldOptions(filters);

  const save = async (v) => {
    const body = transformOut ? transformOut(v) : v;
    if (editing?.id) await api.put(`${endpoint}/${editing.id}`, body);
    else await api.post(endpoint, body);
    toast.success(editing?.id ? 'Updated successfully' : 'Created successfully');
    setEditing(null);
    reload();
  };
  const remove = async () => {
    setBusy(true);
    try { await api.delete(`${endpoint}/${deleting.id}`); toast.success('Deleted'); setDeleting(null); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const exportCsv = () => {
    const rows = data?.items || [];
    const head = columns.map((c) => `"${c.label}"`).join(',');
    const body = rows.map((r) => columns.map((c) => { const v = c.csv ? c.csv(r) : get(r, c.key); return `"${String(v ?? '').replace(/"/g, '""')}"`; }).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['﻿' + head + '\n' + body], { type: 'text/csv' })), download: `${title.toLowerCase().replace(/\s+/g, '-')}.csv` });
    a.click();
  };

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} icon={icon} actions={<>
        {headerActions}
        <button className="btn-outline" onClick={reload} title="Refresh"><RefreshCw size={16} /></button>
        <button className="btn-outline" onClick={exportCsv}><Download size={16} /> Export</button>
        {canCreate && allowedWrite && fields.length > 0 && <button className="btn-primary" onClick={() => setEditing({})}><Plus size={16} /> Add New</button>}
      </>} />
      {children}
      <Card pad={false}>
        {(searchable || filters.length > 0) && (
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
            {searchable && <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} /></div>}
            {filters.map((f) => (
              <select key={f.name} className="input lg:w-48" value={filterVals[f.name] || ''} onChange={(e) => { setFilterVals({ ...filterVals, [f.name]: e.target.value || undefined }); setPage(1); }}>
                <option value="">{f.label}: All</option>
                {(filterOptions[f.name] || f.options || []).map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{pretty(o)}</option>))}
              </select>
            ))}
          </div>
        )}
        {error && <div className="p-4"><ErrorBox error={error} /></div>}
        {loading && !data ? <Spinner /> : !data?.items?.length ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="table-x">
              <thead><tr>{columns.map((c) => <th key={c.key || c.label}>{c.label}</th>)}{(rowActions || (allowedWrite && (canEdit || canDelete))) && <th className="text-right">Actions</th>}</tr></thead>
              <tbody className={loading ? 'opacity-50' : ''}>
                {data.items.map((row) => (
                  <tr key={row.id} className={onRowClick ? 'cursor-pointer' : ''} onClick={() => onRowClick?.(row)}>
                    {columns.map((c) => <td key={c.key || c.label} className={c.className}>{renderCell(c, row)}</td>)}
                    {(rowActions || (allowedWrite && (canEdit || canDelete))) && (
                      <td className="whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {rowActions?.(row, reload)}
                          {allowedWrite && canEdit && fields.length > 0 && <button className="btn-ghost btn-sm" onClick={() => setEditing(row)} title="Edit"><Pencil size={15} /></button>}
                          {allowedWrite && canDelete && <button className="btn-ghost btn-sm text-rose-600 hover:bg-rose-50" onClick={() => setDeleting(row)} title="Delete"><Trash2 size={15} /></button>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page || 1} pageSize={data.pageSize || pageSize} total={data.total || 0} onPage={setPage} />}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${title.replace(/s$/, '')}` : `Add ${title.replace(/s$/, '')}`} size="lg">
        {editing && <RecordForm fields={fields} initial={editing} onSubmit={save} onCancel={() => setEditing(null)} />}
      </Modal>
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} busy={busy} text="This record will be permanently deleted. This action cannot be undone." />
    </div>
  );
}
