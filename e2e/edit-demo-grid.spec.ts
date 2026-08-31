import { test, expect } from '@playwright/test';

/**
 * Drives the demo app's `#edit-demo-grid` (src/app/app.component.html) — a small, local-only,
 * fully editable/creatable/deletable grid — through row creation with validation, then deletion, in
 * a real browser. `lang="es-AR"` here, so button labels/messages are the Spanish translations.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('creating a row validates required/min before accepting it, then it appears in the grid', async ({ page }) => {
  const grid = page.locator('div#edit-demo-grid');
  await grid.getByRole('button', { name: 'Agregar fila' }).click();

  const addRow = grid.locator('tr.inandu-add-row');
  const saveButton = addRow.locator('.inandu-row-actions button').first();

  // Column order is the row-drag handle (rowReorder="true", no input either), Id (not editable, no
  // input), Producto, Precio, En stock, Reposición.
  const productoCell = addRow.locator('td').nth(2);
  const precioCell = addRow.locator('td').nth(3);
  const productoInput = productoCell.locator('.inandu-cell-edit-input');
  const precioInput = precioCell.locator('.inandu-cell-edit-input');

  // Both Producto and Precio are required — leaving everything empty blocks the save with an error
  // under each of them (scope to Producto's own cell, since the message text is identical for both).
  await saveButton.click();
  await expect(productoCell.locator('.inandu-field-error')).toHaveText('Este campo es obligatorio');

  // A negative Precio (min="0") blocks it too, once Producto itself is valid.
  await productoInput.fill('Widget E2E');
  await precioInput.fill('-5');
  await saveButton.click();
  await expect(precioCell.locator('.inandu-field-error')).toHaveText('Debe ser como mínimo 0');

  // A valid Precio succeeds — the row is created and the trigger button reappears.
  await precioInput.fill('9.99');
  await saveButton.click();

  await expect(grid.getByRole('button', { name: 'Agregar fila' })).toBeVisible();
  await expect(grid.locator('tbody tr.inandu-row', { hasText: 'Widget E2E' })).toBeVisible();
  await expect(page.getByText(/Fila creada:.*Widget E2E/)).toBeVisible();
});

test('deleting a row removes it immediately (no confirmation configured for this grid)', async ({ page }) => {
  const grid = page.locator('div#edit-demo-grid');
  const firstRow = grid.locator('tbody tr.inandu-row').first();
  // nth(1) is Id (index 0 is the row-drag handle) — Producto itself is nth(2), see the other test's comment.
  const firstProductName = await firstRow.locator('td').nth(2).textContent();

  await firstRow.getByRole('button', { name: 'Eliminar' }).click();

  await expect(grid.locator('tbody tr.inandu-row', { hasText: firstProductName ?? '' })).toHaveCount(0);
  await expect(page.getByText(/Fila eliminada:/)).toBeVisible();
});
