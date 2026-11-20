import { exportCsv, exportExcel, exportPdf, printTable } from './inandu-grid-exporter';
import type { InanduGridExportTable } from './inandu-grid-exporter';

describe('inandu-grid-exporter', () => {
  let blobs: Blob[];
  let clicks: string[];

  const table = (overrides: Partial<InanduGridExportTable> = {}): InanduGridExportTable => {
    const rows = [
      ['Amy, "Jr"', '10'],
      ['<Bob>', 'n/a'],
    ];
    return {
      name: 'people',
      headers: ['Name', 'Score'],
      widths: [120, 60],
      rowCount: rows.length,
      text: (row, column) => rows[row][column],
      number: (row, column) => (column === 1 && row === 0 ? 10 : undefined),
      ...overrides,
    };
  };
  const textOf = async (blob: Blob): Promise<string> => new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()));

  beforeEach(() => {
    blobs = [];
    clicks = [];
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
      blobs.push(blob);
      return 'blob:mock';
    });
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      clicks.push(this.download);
    });
  });

  it('CSV: a BOM, a header line, quoted values, CRLF between lines, and <name>-export.csv', async () => {
    exportCsv(table());

    expect(clicks).toEqual(['people-export.csv']);
    const bytes = new Uint8Array(await blobs[0].arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe('Name,Score\r\n"Amy, ""Jr""",10\r\n<Bob>,n/a');
  });

  it('Excel: a numeric cell is a Number, the rest text with markup escaped; <name>-export.xls', async () => {
    exportExcel(table());

    expect(clicks).toEqual(['people-export.xls']);
    const xml = await textOf(blobs[0]);
    expect(xml).toContain('<Data ss:Type="Number">10</Data>');
    expect(xml).toContain('<Data ss:Type="String">n/a</Data>');
    expect(xml).toContain('&lt;Bob&gt;');
    expect(xml).toContain('<Row ss:StyleID="header">');
  });

  it('an empty table still writes the header', async () => {
    exportCsv(table({ rowCount: 0 }));
    expect(await textOf(blobs[0])).toBe('Name,Score'); // the decoder drops the BOM
  });

  it('PDF: writes an application/pdf file named <name>-export.pdf', async () => {
    await exportPdf(table());

    expect(clicks).toEqual(['people-export.pdf']);
    expect(blobs[0].type).toBe('application/pdf');
    expect((await textOf(blobs[0])).startsWith('%PDF-')).toBeTrue();
  });

  it('PDF: many rows run onto more pages', async () => {
    await exportPdf(table({ rowCount: 100, text: row => `row ${row}` }));
    const pdf = await textOf(blobs[0]);
    expect((pdf.match(/\/Type\s*\/Page\b/g) ?? []).length).toBeGreaterThan(1);
  });

  it('print: opens a noopener Blob page that holds the escaped table', async () => {
    const open = spyOn(window, 'open').and.returnValue(null);
    printTable(table());

    expect(open).toHaveBeenCalledWith('blob:mock', '_blank', 'noopener');
    const html = await textOf(blobs[0]);
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('&lt;Bob&gt;');
  });
});
