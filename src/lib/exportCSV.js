export function exportCSV(data, filename) {
  if (!data || !data.length) {
    alert('Aucune donnée à exporter');
    return;
  }
  const EXCLUDE = ['id', 'created_by', 'created_by_id', 'app_id', '__v', 'updated_date'];
  const headers = Object.keys(data[0]).filter(k => !EXCLUDE.includes(k));
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val).replace(/,/g, ';');
      return String(val).replace(/,/g, ';');
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
