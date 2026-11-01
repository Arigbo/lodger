/** Serialises rows to RFC 4180 CSV (quotes, commas and newlines escaped). */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? '' : String(cell);
          // Neutralise spreadsheet formula injection (=, +, -, @ at the start).
          const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
          return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
        })
        .join(','),
    )
    .join('\r\n');
}

/** Triggers a browser download of the given CSV text. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
