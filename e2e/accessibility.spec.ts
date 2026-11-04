import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Runs axe-core over the demo's flagship grid (`#customers-grid`: selectable, filterable, paged) and
 * fails on the structural / ARIA rules the grid is responsible for. Colour contrast is left out on
 * purpose: it depends on the theme a consumer picks, not on the grid's markup.
 */
const RULES = [
  'aria-allowed-attr',
  'aria-required-attr',
  'aria-required-children',
  'aria-required-parent',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'aria-roles',
  'aria-hidden-focus',
  'button-name',
  'label',
  'scope-attr-valid',
  'th-has-data-cells',
  'td-headers-attr',
  'duplicate-id-aria',
];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('div#customers-grid tbody tr.inandu-row').first()).toBeVisible();
});

test('the customers grid has no ARIA or structure violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).include('div#customers-grid').withRules(RULES).analyze();
  expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target.join(' ')).slice(0, 3) }))).toEqual([]);
});

test('sorting exposes aria-sort, and selecting a row exposes aria-selected', async ({ page }) => {
  const grid = page.locator('div#customers-grid');
  const company = grid.locator('th[data-field="Company"]');
  await expect(company).toHaveAttribute('aria-sort', 'none');

  await grid.getByRole('button', { name: 'Sort by Company' }).click();
  await expect(company).toHaveAttribute('aria-sort', 'ascending');

  const firstRow = grid.locator('tbody tr.inandu-row').first();
  await expect(firstRow).toHaveAttribute('aria-selected', 'false');
  await firstRow.locator('input.inandu-select-checkbox').check();
  await expect(firstRow).toHaveAttribute('aria-selected', 'true');
  await expect(grid.locator('table')).toHaveAttribute('aria-rowcount', /^\d+$/);
});
