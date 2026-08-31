import { test, expect } from '@playwright/test';

/**
 * Drives the demo app's first grid (`#customers-grid` in src/app/app.component.html — 100+ static
 * rows, `lang="es-AR"`, `filter`/`selectable`/`exportable` all on, paginated) through a real browser,
 * the way an actual consumer would use it. Complements the Karma/Jasmine unit specs, which construct
 * `InanduGridComponent` directly via TestBed rather than clicking against a rendered page.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('renders the grid with its header row and data rows', async ({ page }) => {
  const grid = page.locator('div#customers-grid');
  await expect(grid).toBeVisible();
  await expect(grid.locator('thead th')).not.toHaveCount(0);
  await expect(grid.locator('tbody tr.inandu-row')).not.toHaveCount(0);
});

test('sorting by a column changes row order', async ({ page }) => {
  const grid = page.locator('div#customers-grid');
  // Column order (see placeColumnsByOrder + this grid's order="0"/"1" columns): select-checkbox,
  // Ciudad, Puesto, Id, Nombre, Apellido, Activo, Alta, Ventas — Nombre is the 5th cell (index 4).
  const firstNameCell = () => grid.locator('tbody tr.inandu-row').first().locator('td').nth(4);
  const sortButton = grid.getByRole('button', { name: 'Ordenar por Nombre' });

  // The natural (unsorted) first row could coincidentally already match the ascending-sorted first
  // row, so comparing ascending vs. descending (guaranteed to differ unless every name is
  // identical) is the reliable way to prove sorting actually reorders the rows.
  await sortButton.click(); // ascending
  const ascending = await firstNameCell().textContent();
  await sortButton.click(); // descending
  const descending = await firstNameCell().textContent();

  expect(ascending).not.toBe(descending);
});

test('free-text search narrows the visible rows', async ({ page }) => {
  const grid = page.locator('div#customers-grid');
  const rows = grid.locator('tbody tr.inandu-row');
  const initialCount = await rows.count();

  await grid.getByPlaceholder('Buscar').fill('Alfreds');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Alfreds');

  await grid.getByPlaceholder('Buscar').fill('');
  await expect(rows).toHaveCount(initialCount);
});

test('pagination advances to the next page and updates the page label', async ({ page }) => {
  const grid = page.locator('div#customers-grid');
  const label = grid.locator('.inandu-pager-label');

  await expect(label).toHaveText('Página 1 de 10');
  await grid.getByRole('button', { name: 'Página siguiente' }).click();
  await expect(label).toHaveText('Página 2 de 10');
});

test('selecting a row updates the "seleccionado" count above the grid', async ({ page }) => {
  await expect(page.getByText('0 cliente(s) seleccionado(s)')).toBeVisible();

  await page.locator('div#customers-grid tbody .inandu-select-checkbox').first().check();

  await expect(page.getByText('1 cliente(s) seleccionado(s)')).toBeVisible();
});

test('a per-column filter narrows rows to the requested city', async ({ page }) => {
  const grid = page.locator('div#customers-grid');
  await grid.getByRole('button', { name: 'Filtrar Ciudad' }).click();

  const popup = grid.locator('.inandu-column-filter-popup');
  await popup.locator('input[type="text"]').fill('Berlin');

  const cityCells = grid.locator('tbody tr.inandu-row td:nth-child(2)');
  await expect(cityCells.first()).toHaveText('Berlin');
  const count = await cityCells.count();
  for (let i = 0; i < count; i++) {
    await expect(cityCells.nth(i)).toHaveText('Berlin');
  }
});
