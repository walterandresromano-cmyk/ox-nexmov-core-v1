/**
 * Exporta un array de objetos a un archivo CSV descargable.
 *
 * @param {Object[]} rows       - Datos a exportar
 * @param {Object[]} columns    - [{ header: string, value: (row) => string }]
 * @param {string}   filename   - Nombre del archivo sin extensión
 */
export function exportToCSV(rows, columns, filename = "export") {
  if (!rows?.length || !columns?.length) return;

  const escape = (val) => {
    const s = String(val ?? "").replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };

  const header = columns.map((col) => escape(col.header)).join(",");
  const body = rows
    .map((row) => columns.map((col) => escape(col.value(row))).join(","))
    .join("\n");

  const csv = "﻿" + header + "\n" + body; // BOM para Excel en Windows
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
