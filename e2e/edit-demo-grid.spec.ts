import { test, expect } from '@playwright/test';

/**
 * Drives the demo site's `#edit-demo-grid` (src/app/app.component.html) — a small, local-only,
 * fully editable/creatable/deletable grid — through row creation with validation, then deletion, in
 * a real browser. `lang="en"` here, so the button labels and messages are the English defaults.
 *
 * It lives in the demo's "Editing" tab, which has to be opened first: inactive panels are `hidden`,
 * and Playwright won't act on a hidden element.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('#tab-editing').click();
  await expect(page.locator('div#edit-demo-grid')).toBeVisible();
});

test('creating a row validates required/min before accepting it, then it appears in the grid', async ({ page }) => {
  const grid = page.locator('div#edit-demo-grid');
  await grid.getByRole('button', { name: 'Add row' }).click();

  const addRow = grid.locator('tr.inandu-add-row');
  const saveButton = addRow.locator('.inandu-row-actions button').first();

  // Column order is the row-drag handle (rowReorder="true", no input either), Id (not editable, no
  // input), Product, Price, In stock, Restock.
  const productCell = addRow.locator('td').nth(2);
  const priceCell = addRow.locator('td').nth(3);
  const productInput = productCell.locator('.inandu-cell-edit-input');
  const priceInput = priceCell.locator('.inandu-cell-edit-input');

  // Both Product and Price are required — leaving everything empty blocks the save with an error
  // under each of them (scope to Product's own cell, since the message text is identical for both).
  await saveButton.click();
  await expect(productCell.locator('.inandu-field-error')).toHaveText('This field is required');

  // A negative Price (min="0") blocks it too, once Product itself is valid.
  await productInput.fill('Widget E2E');
  await priceInput.fill('-5');
  await saveButton.click();
  await expect(priceCell.locator('.inandu-field-error')).toHaveText('Must be at least 0');

  // A valid Price succeeds — the row is created and the trigger button reappears.
  await priceInput.fill('9.99');
  await saveButton.click();

  await expect(grid.getByRole('button', { name: 'Add row' })).toBeVisible();
  await expect(grid.locator('tbody tr.inandu-row', { hasText: 'Widget E2E' })).toBeVisible();
  await expect(page.getByText(/Row created:.*Widget E2E/)).toBeVisible();
});

test('deleting a row removes it immediately (no confirmation configured for this grid)', async ({ page }) => {
  const grid = page.locator('div#edit-demo-grid');
  const firstRow = grid.locator('tbody tr.inandu-row').first();
  // nth(1) is Id (index 0 is the row-drag handle) — Product itself is nth(2), see the other test's comment.
  const firstProductName = await firstRow.locator('td').nth(2).textContent();

  await firstRow.getByRole('button', { name: 'Delete' }).click();

  await expect(grid.locator('tbody tr.inandu-row', { hasText: firstProductName ?? '' })).toHaveCount(0);
  await expect(page.getByText(/Row deleted:/)).toBeVisible();
});
