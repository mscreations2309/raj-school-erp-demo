// Short human label for a record (used in delete dialogs)
const FIELDS = ['title', 'titleEn', 'name', 'label', 'labelEn', 'purposeEn', 'studentName', 'tcNo', 'invoiceNo', 'number', 'roomNo', 'key', 'code', 'category'];
export function labelOf(r) {
  if (!r) return 'this record';
  if (r.firstName) return `${r.firstName} ${r.lastName || ''}`.trim();
  const k = FIELDS.find((f) => r[f]);
  return k ? String(r[k]) : 'this record';
}
