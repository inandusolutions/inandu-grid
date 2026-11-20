import { buildPrintHtml, downloadBlob, escapeCsvValue, escapeMarkup, printHtmlDocument, truncatePdfText } from '@inandu-solutions/grid-core';

/**
 * What the grid hands over to be exported: the columns and rows on screen, already reduced to plain data, so the file formats
 * below know nothing about the grid. `text` is the *formatted* value (what the user sees), `number` the raw value of a numeric cell
 * or `undefined` (so a numeric column stays numeric in a spreadsheet). Not part of the public API.
 */
export interface InanduGridExportTable {
  /** Names the file: `<name>-export.csv`, and the title of the print page. */
  name: string;
  headers: readonly string[];
  /** The on-screen width of each column, used to share out the width of a PDF page. */
  widths: readonly number[];
  rowCount: number;
  text(row: number, column: number): string;
  number(row: number, column: number): number | undefined;
}

const textRows = (table: InanduGridExportTable): string[][] =>
  Array.from({ length: table.rowCount }, (_, row) => table.headers.map((_header, column) => table.text(row, column)));

/** Downloads the table as a CSV file, with a leading BOM so Excel opens accented text (e.g. "México", "Sí") as UTF-8 instead of Latin-1. */
export function exportCsv(table: InanduGridExportTable): void {
  const lines = [
    table.headers.map(header => escapeCsvValue(header)).join(','),
    ...textRows(table).map(values => values.map(value => escapeCsvValue(value)).join(',')),
  ];
  downloadBlob('﻿' + lines.join('\r\n'), `${table.name}-export.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Downloads the table as a spreadsheet: the dependency-free "SpreadsheetML" XML that Excel 2003+ (and LibreOffice/Google Sheets)
 * opens natively. A numeric cell is written as a number, everything else as text.
 */
export function exportExcel(table: InanduGridExportTable): void {
  const dataCell = (row: number, column: number): string => {
    const num = table.number(row, column);
    return num !== undefined
      ? `<Cell><Data ss:Type="Number">${num}</Data></Cell>`
      : `<Cell><Data ss:Type="String">${escapeMarkup(table.text(row, column))}</Data></Cell>`;
  };
  const headerRow = `<Row ss:StyleID="header">${table.headers
    .map(header => `<Cell><Data ss:Type="String">${escapeMarkup(header)}</Data></Cell>`)
    .join('')}</Row>`;
  const dataRows = Array.from({ length: table.rowCount }, (_, row) =>
    `<Row>${table.headers.map((_header, column) => dataCell(row, column)).join('')}</Row>`,
  ).join('');

  const xml = '<?xml version="1.0"?>'
    + '<?mso-application progid="Excel.Sheet"?>'
    + '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'
    + '<Styles><Style ss:ID="header"><Font ss:Bold="1"/></Style></Styles>'
    + '<Worksheet ss:Name="Sheet1"><Table>'
    + headerRow + dataRows
    + '</Table></Worksheet></Workbook>';

  downloadBlob(xml, `${table.name}-export.xls`, 'application/vnd.ms-excel');
}

/**
 * Downloads the table as a PDF: one simple table drawn with jsPDF's low-level text/line primitives rather than its `autotable`
 * plugin, to keep this to a single dependency. Cells are single-line, truncated with an ellipsis if they overflow their column's
 * width; the header row is redrawn at the top of every new page. `jspdf` is imported on demand, so a grid that never exports a PDF
 * never loads it.
 */
export async function exportPdf(table: InanduGridExportTable): Promise<void> {
  const { jsPDF: JsPdf } = await import('jspdf').catch((error: unknown) => {
    // `jspdf` is an optional peer dependency: a project that never exports PDF does not install it.
    throw new Error('PDF export needs the "jspdf" package: run `npm install jspdf`.', { cause: error });
  });
  const doc = new JsPdf({ orientation: 'landscape' });
  const marginX = 10;
  const marginY = 10;
  const rowHeight = 8;
  const pageWidth = doc.internal.pageSize.getWidth() - marginX * 2;
  const pageHeight = doc.internal.pageSize.getHeight() - marginY;
  const rawWidths = table.widths.map(width => width || 80);
  const totalRaw = rawWidths.reduce((sum, width) => sum + width, 0) || 1;
  const colWidths = rawWidths.map(width => (width / totalRaw) * pageWidth);

  let y = marginY;
  const drawRow = (values: readonly string[], bold: boolean): void => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    let x = marginX;
    values.forEach((value, i) => {
      doc.text(truncatePdfText(doc, value, colWidths[i] - 4), x + 2, y + 6);
      x += colWidths[i];
    });
    y += rowHeight;
  };

  drawRow(table.headers, true);
  for (let row = 0; row < table.rowCount; row++) {
    if (y + rowHeight > pageHeight) {
      doc.addPage();
      y = marginY;
      drawRow(table.headers, true);
    }
    drawRow(table.headers.map((_header, column) => table.text(row, column)), false);
  }

  // Through the same downloadBlob() helper as the other formats (via doc.output('blob'), a real Blob already typed
  // 'application/pdf') rather than jsPDF's own `.save()`, whose browser-feature-detection branches are not worth depending on.
  downloadBlob(doc.output('blob'), `${table.name}-export.pdf`);
}

/**
 * Opens a new tab with a plain, print-styled `<table>` and triggers the browser's print dialog on it, rather than printing the live
 * page (which would include the toolbar, pager and the app around it). The page is a `Blob` URL opened with `noopener`.
 */
export function printTable(table: InanduGridExportTable): void {
  printHtmlDocument(buildPrintHtml(table.name, table.headers, textRows(table)));
}
