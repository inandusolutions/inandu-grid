import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InanduGridComponent, InanduGridRow } from './inandu-grid.component';
import { InanduColumnComponent } from '../inandu-column/inandu-column.component';

/**
 * Deterministic fixtures for the three export formats: the same rows every time, checked against what a spreadsheet or a PDF
 * reader would actually do with them. Written for the review's point C1 (Unicode, dates, number formats, spreadsheet-formula
 * injection, many rows / pages).
 */
@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" exportable="true">
      <inandu-column title="Name" field="name"></inandu-column>
      <inandu-column title="Amount" field="amount" type="number" format="1.2-2"></inandu-column>
      <inandu-column title="When" field="when" type="date" format="YYYY-MM-DD"></inandu-column>
      <inandu-column title="OK" field="ok" type="boolean"></inandu-column>
    </inandu-grid>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class ExportFixtureHostComponent {
  rows: InanduGridRow[] = [
    { name: 'Ñandú', amount: 1234.5, when: new Date(2024, 1, 29), ok: true },
    { name: '日本語 🚀 العربية', amount: -0.5, when: new Date(2019, 7, 3), ok: false },
    { name: 'line one\nline two', amount: 0, when: null, ok: null },
  ];
}

describe('InanduGridComponent export fixtures', () => {
  let fixture: ComponentFixture<ExportFixtureHostComponent>;
  let blobs: Blob[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ExportFixtureHostComponent] });
    fixture = TestBed.createComponent(ExportFixtureHostComponent);
    fixture.detectChanges();
    blobs = [];
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
      blobs.push(blob);
      return 'blob:mock';
    });
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click');
  });

  const grid = () => fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
  const setRows = (rows: InanduGridRow[]) => {
    fixture.componentInstance.rows = rows;
    fixture.detectChanges();
  };
  const csv = async () => {
    grid().exportCsv();
    const bytes = new Uint8Array(await blobs.at(-1)!.arrayBuffer());
    return new TextDecoder().decode(bytes.slice(3)); // without the BOM
  };
  const xml = async () => {
    grid().exportExcel();
    return blobs.at(-1)!.text();
  };
  const parse = (text: string) => new DOMParser().parseFromString(text, 'application/xml');
  const pages = async () => {
    const text = new TextDecoder('latin1').decode(await blobs.at(-1)!.arrayBuffer());
    return (text.match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length;
  };

  describe('CSV', () => {
    it('keeps Unicode intact: accents, CJK, emoji and right-to-left text', async () => {
      const out = await csv();
      expect(out).toContain('Ñandú');
      expect(out).toContain('日本語 🚀 العربية');
    });

    it('puts a line break inside a cell in quotes, so it stays one record', async () => {
      expect(await csv()).toContain('"line one\nline two"');
    });

    it('formats numbers and dates the way the grid shows them, and empty cells are empty', async () => {
      const lines = (await csv()).split('\r\n');
      expect(lines[1]).toContain('1,234.50');
      expect(lines[1]).toContain('2024-02-29');
      expect(lines[3]).toMatch(/,0\.00,,/);
      expect(lines.join('')).not.toMatch(/null|undefined|NaN/);
    });

    it('is only the header for no rows', async () => {
      setRows([]);
      expect(await csv()).toBe('Name,Amount,When,OK');
    });

    for (const value of ['=1+1', '+1+1', '-1+1', '@SUM(A1)', '\t=1+1', '\r=1+1']) {
      it(`neutralizes the formula ${JSON.stringify(value)}`, async () => {
        setRows([{ name: value, amount: 1, when: null, ok: null }]);
        const line = (await csv()).split('\r\n')[1];
        expect(line.replace(/^"/, '')).toMatch(/^'/);
      });
    }

    it('writes 5,000 rows with one record per row', async () => {
      setRows(Array.from({ length: 5000 }, (_, i) => ({ name: `row ${i}`, amount: i, when: null, ok: null })));
      expect((await csv()).split('\r\n')).toHaveSize(5001);
    });
  });

  describe('Excel (SpreadsheetML)', () => {
    it('is well-formed XML with one Row per record plus the header', async () => {
      const doc = parse(await xml());
      expect(doc.getElementsByTagName('parsererror').length).toBe(0);
      expect(doc.getElementsByTagName('Row').length).toBe(4);
      for (const row of Array.from(doc.getElementsByTagName('Row'))) expect(row.getElementsByTagName('Cell').length).toBe(4);
    });

    it('survives text that is dangerous in XML and in a spreadsheet', async () => {
      setRows([
        { name: '<script>alert(1)</script>', amount: 1, when: null, ok: null },
        { name: ']]></Data><Cell>', amount: 2, when: null, ok: null },
        { name: 'a\u0000b\u0008c\u000bd', amount: 3, when: null, ok: null },
        { name: "=cmd|' /C calc'!A0", amount: 4, when: null, ok: null },
      ]);
      const text = await xml();
      const doc = parse(text);
      expect(doc.getElementsByTagName('parsererror').length).toBe(0);
      expect(doc.getElementsByTagName('Row').length).toBe(5);
      expect(text).not.toContain('<script>');
    });

    it('writes a string that looks like a formula as a String cell, which a spreadsheet never evaluates', async () => {
      setRows([{ name: '=1+1', amount: 1, when: null, ok: null }]);
      const data = parse(await xml()).getElementsByTagName('Data');
      const cell = Array.from(data).find(d => d.textContent === '=1+1')!;
      expect(cell.getAttribute('ss:Type')).toBe('String');
    });

    for (const bad of [NaN, Infinity, -Infinity]) {
      it(`never writes ${bad} as a number (Excel would reject the file)`, async () => {
        setRows([{ name: 'x', amount: bad, when: null, ok: null }]);
        const text = await xml();
        expect(text).not.toMatch(/ss:Type="Number">(NaN|Infinity|-Infinity)/);
        expect(parse(text).getElementsByTagName('parsererror').length).toBe(0);
      });
    }

    it('keeps Unicode and line breaks, and writes the dates as the grid formats them', async () => {
      const text = Array.from(parse(await xml()).getElementsByTagName('Data')).map(d => d.textContent);
      expect(text).toContain('日本語 🚀 العربية');
      expect(text).toContain('line one\nline two');
      expect(text).toContain('2024-02-29');
    });
  });

  describe('PDF', () => {
    it('produces a PDF file, on one page for a few rows', async () => {
      await grid().exportPdf();
      const head = new TextDecoder('latin1').decode((await blobs.at(-1)!.arrayBuffer()).slice(0, 5));
      expect(head).toBe('%PDF-');
      expect(await pages()).toBe(1);
    });

    it('adds pages for many rows, and the count follows the rows', async () => {
      const many = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `row ${i}`, amount: i, when: new Date(2024, 0, 1), ok: true }));
      setRows(many(100));
      await grid().exportPdf();
      const small = await pages();
      setRows(many(400));
      await grid().exportPdf();
      const big = await pages();
      expect(small).toBeGreaterThan(1);
      expect(big).toBeGreaterThan(small);
    });

    it('does not throw for an empty grid, or for text jsPDF cannot encode', async () => {
      setRows([]);
      await expectAsync(grid().exportPdf()).toBeResolved();
      setRows(fixture.componentInstance.rows.length ? fixture.componentInstance.rows : [{ name: '日本語 🚀 العربية', amount: 1, when: null, ok: null }]);
      await expectAsync(grid().exportPdf()).toBeResolved();
    });
  });
});
