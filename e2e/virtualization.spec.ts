import { test, expect, type Page } from '@playwright/test';

/**
 * Virtual scroll under stress (the demo's 5,000-row grid, CDK fixed-size strategy): the arrow keys keep working across the window,
 * programmatic scroll lands where it should, and a cell that had focus does not strand the keyboard user when it scrolls out of the
 * DOM and back. The first column is the Id (1 to 5,000, in order), so a cell's id says which row it is.
 */
const grid = (page: Page) => page.locator('div#virtual-scroll-grid');
const dataRows = (page: Page) => grid(page).locator('tbody tr.inandu-row[role="row"]');
const firstCells = (page: Page) => dataRows(page).locator('td[role="gridcell"]:first-child');
const viewport = (page: Page) => grid(page).locator('cdk-virtual-scroll-viewport');
const focusedCell = (page: Page) => grid(page).locator('td[role="gridcell"]:focus');
const num = (text: string | null) => Number((text ?? '').replace(/[^\d]/g, ''));
const idOf = async (page: Page) => num(await focusedCell(page).locator('xpath=..').locator('td[role="gridcell"]').first().textContent());
const renderedIds = async (page: Page) => (await firstCells(page).allTextContents()).map(num);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('#tab-scale').click();
  await expect(firstCells(page).first()).toBeVisible();
  await firstCells(page).first().focus();
});

test('keeps a small window of rows in the DOM for 5,000 rows', async ({ page }) => {
  expect(await dataRows(page).count()).toBeLessThan(80);
});

test('arrow keys walk far past the first window and the focus stays on a cell', async ({ page }) => {
  for (let i = 0; i < 120; i += 1) await page.keyboard.press('ArrowDown');
  await expect(focusedCell(page)).toHaveCount(1);
  expect(await idOf(page)).toBe(121);
});

test('ArrowUp walks back to the top', async ({ page }) => {
  for (let i = 0; i < 60; i += 1) await page.keyboard.press('ArrowDown');
  for (let i = 0; i < 60; i += 1) await page.keyboard.press('ArrowUp');
  expect(await idOf(page)).toBe(1);
});

// The demo puts this grid in a tab panel that is hidden until its tab is chosen. The cdk measured the viewport at 0px and never again,
// so the grid rendered a handful of rows: a half-empty viewport, and at the very bottom the rows only up to 4994, with about 126px of
// blank space under them (the last six rows out of reach). The grid now asks the cdk to measure again whenever the viewport's size changes.
test('scrolled to the very end, the last row is rendered and the viewport is filled', async ({ page }) => {
  await expect.poll(async () => dataRows(page).count()).toBeGreaterThanOrEqual(10); // a full window as soon as the tab is shown
  await viewport(page).evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect.poll(async () => (await renderedIds(page)).at(-1)).toBe(5000);
  expect(await dataRows(page).count()).toBeLessThan(80);
});

test('programmatic scroll to the middle mounts a window around that position, and only a window', async ({ page }) => {
  await viewport(page).evaluate(el => { el.scrollTop = el.scrollHeight / 2; });
  await expect.poll(async () => (await renderedIds(page))[0]).toBeGreaterThan(2000);
  expect(await dataRows(page).count()).toBeLessThan(80);
});

test('the window stays contiguous at several scroll positions', async ({ page }) => {
  for (const frac of [0.5, 0.99, 0, 0.123]) {
    await viewport(page).evaluate((el, f) => { el.scrollTop = (el.scrollHeight - el.clientHeight) * f; }, frac);
    await expect.poll(async () => {
      const ids = await renderedIds(page);
      return ids.length > 0 && ids.every((v, i) => i === 0 || v === ids[i - 1] + 1);
    }).toBe(true);
  }
});

test('focus is not dropped when its row scrolls out of the window: it waits on the grid and returns to the cell', async ({ page }) => {
  await expect(focusedCell(page)).toHaveCount(1);
  await viewport(page).evaluate(el => { el.scrollTop = el.scrollHeight / 2; });
  await expect.poll(async () => (await renderedIds(page))[0]).toBeGreaterThan(1000);
  // The row that had focus is no longer in the DOM; focus must not have fallen back to <body> (where Tab restarts from the top of the page).
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
  expect(await page.evaluate(() => !!document.activeElement?.closest('#virtual-scroll-grid'))).toBe(true);
  await viewport(page).evaluate(el => { el.scrollTop = 0; });
  await expect(focusedCell(page)).toHaveCount(1);
  expect(await idOf(page)).toBe(1);
});
