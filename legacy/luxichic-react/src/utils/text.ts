export function slugify(s: string): string {
  return s.
  toLowerCase().
  trim().
  replace(/[^a-z0-9\s-]/g, '').
  replace(/\s+/g, '-').
  replace(/-+/g, '-');
}

/** Replaces {{variable}} tokens in a template with sample or real values. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => values[key] ?? `{{${key}}}`);
}

export function initials(name: string): string {
  return name.
  split(/\s+/).
  filter(Boolean).
  slice(0, 2).
  map((p) => p[0]?.toUpperCase()).
  join('');
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}