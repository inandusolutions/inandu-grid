import { test } from '@playwright/test';

/**
 * Not an assertion suite. Each test drives the demo app through one "look what it does" gesture
 * at a watchable pace. The `promo` project in playwright.config.ts records video for every test;
 * `scripts/make-gifs.mjs` turns each recording into `docs/gifs/<test name>.gif`. Run it all with
 * `npm run gifs` (or just the recording with `npm run gifs:record`).
 *
 * Selectors that aren't certain (group rows, tree toggles) are guarded, so a scene that can't
 * find its target still records the grid rather than failing the run.
 */

const READY = 'inandu-grid#customers-grid tbody tr.inandu-row';

test('search', async ({ page }) => {
  await page.goto('/');
  await page.locator(READY).first().waitFor();
  await page.waitForTimeout(600);

  const box = page.locator('inandu-grid#customers-grid').getByPlaceholder('Buscar');
  await box.click();
  for (const ch of 'london') {
    await box.press(ch);
    await page.waitForTimeout(170);
  }
  await page.waitForTimeout(1400);
  for (let i = 0; i < 6; i++) {
    await box.press('Backspace');
    await page.waitForTimeout(140);
  }
  await page.waitForTimeout(900);
});

test('multi-sort', async ({ page }) => {
  await page.goto('/');
  await page.locator(READY).first().waitFor();
  await page.waitForTimeout(600);

  const grid = page.locator('inandu-grid#customers-grid');
  await grid.getByRole('button', { name: 'Ordenar por Ciudad' }).click();
  await page.waitForTimeout(850);
  await grid.getByRole('button', { name: 'Ordenar por Ciudad' }).click();
  await page.waitForTimeout(850);
  await grid.getByRole('button', { name: 'Ordenar por Nombre' }).click({ modifiers: ['Shift'] });
  await page.waitForTimeout(1400);
});

test('grouping', async ({ page }) => {
  await page.goto('/');
  await page.locator(READY).first().waitFor();
  await page.waitForTimeout(600);

  const grid = page.locator('inandu-grid#customers-grid');
  const header = grid.locator('thead th', { hasText: 'Puesto' });
  const zone = grid.getByText(/Arrastr\w+ el encabezado/i);
  const h = await header.boundingBox();
  const z = await zone.boundingBox();
  if (!h || !z) throw new Error('grouping: header or drop zone not found');
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2 + 12, h.y + 4, { steps: 6 });
  await page.mouse.move(z.x + z.width / 2, z.y + z.height / 2, { steps: 24 });
  await page.waitForTimeout(400);
  await page.mouse.up();
  await page.waitForTimeout(1600);

  const group = grid.locator('tbody tr.inandu-group-row, tbody tr.inandu-group, tbody tr[class*="group"]').first();
  if (await group.count()) {
    await group.click();
    await page.waitForTimeout(1300);
  }
});

test('row-selection', async ({ page }) => {
  await page.goto('/');
  await page.locator(READY).first().waitFor();
  await page.waitForTimeout(600);

  const grid = page.locator('inandu-grid#customers-grid');
  const rows = grid.locator('tbody tr.inandu-row');
  for (const i of [0, 2, 4]) {
    await rows.nth(i).locator('input[type="checkbox"]').check();
    await page.waitForTimeout(430);
  }
  await page.waitForTimeout(650);
  await grid.locator('thead input[type="checkbox"]').check();
  await page.waitForTimeout(1300);
});

test('inline-edit', async ({ page }) => {
  await page.goto('/');
  await page.locator(READY).first().waitFor();
  await page.waitForTimeout(600);

  const grid = page.locator('inandu-grid#edit-demo-grid');
  await grid.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const row = grid.locator('tbody tr.inandu-row').first();
  await row.getByRole('button', { name: 'Editar' }).click();
  await page.waitForTimeout(700);
  const precio = row.locator('td').nth(3).locator('.inandu-cell-edit-input');
  await precio.click();
  await precio.fill('149.90');
  await page.waitForTimeout(800);
  await row.locator('.inandu-row-actions button').first().click();
  await page.waitForTimeout(1400);
});

test('tree-data', async ({ page }) => {
  await page.goto('/');
  await page.locator(READY).first().waitFor();
  await page.waitForTimeout(600);

  const grid = page.locator('inandu-grid#tree-grid');
  await grid.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const toggles = grid.locator(
    'tbody tr.inandu-row .inandu-tree-toggle, tbody tr.inandu-row button[aria-expanded], tbody tr.inandu-row td:first-child [role="button"]',
  );
  const n = Math.min(await toggles.count(), 3);
  for (let i = 0; i < n; i++) {
    await toggles.nth(i).click();
    await page.waitForTimeout(850);
  }
  await page.waitForTimeout(800);
});

test('virtual-scroll', async ({ page }) => {
  await page.goto('/');
  await page.locator(READY).first().waitFor();
  await page.waitForTimeout(600);

  const grid = page.locator('inandu-grid#virtual-scroll-grid');
  await grid.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const b = await grid.boundingBox();
  if (!b) throw new Error('virtual-scroll: grid not found');
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  for (let i = 0; i < 28; i++) {
    await page.mouse.wheel(0, 420);
    await page.waitForTimeout(85);
  }
  await page.waitForTimeout(700);
  await grid.getByRole('button', { name: 'Ordenar por Precio' }).click();
  await page.waitForTimeout(1200);
});
