/** Build CSV text. columns: [header, key | (row) => value][] */
export function toCSV(rows, columns) {
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map(([h]) => esc(h)).join(',');
  const body = rows.map((row) => columns.map(([, k]) => esc(typeof k === 'function' ? k(row) : row[k])).join(','));
  return '﻿' + [head, ...body].join('\r\n'); // BOM so Excel opens UTF-8 (Hindi) correctly
}
