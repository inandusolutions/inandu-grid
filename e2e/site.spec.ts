import { test, expect } from '@playwright/test';

const demoTabs = (page: import('@playwright/test').Page) => page.getByRole('tablist', { name: 'Demo' });

/** The public page: the demo tabs can be linked to, and the copy says what it means. */
test.describe('demo tabs and deep links', () => {
  test('opening #demo-editing shows the Editing tab', async ({ page }) => {
    await page.goto('/#demo-editing');
    await expect(demoTabs(page).getByRole('tab', { name: 'Editing', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-editing')).toBeVisible();
    await expect(page.locator('#panel-overview')).toBeHidden();
  });

  test('an unknown tab in the link falls back to the first one', async ({ page }) => {
    await page.goto('/#demo-nonsense');
    await expect(demoTabs(page).getByRole('tab', { name: 'Grid basics', exact: true })).toHaveAttribute('aria-selected', 'true');
  });

  test('choosing a tab puts it in the address, and the first tab is plain #demo', async ({ page }) => {
    await page.goto('/');
    await demoTabs(page).getByRole('tab', { name: 'Tree data', exact: true }).click();
    await expect(page).toHaveURL(/#demo-tree$/);
    await demoTabs(page).getByRole('tab', { name: 'Grid basics', exact: true }).click();
    await expect(page).toHaveURL(/#demo$/);
  });
});

test.describe('copy', () => {
  test('dates in the demo are unambiguous (ISO), not DD/MM/YYYY', async ({ page }) => {
    await page.goto('/#demo-editing');
    const text = await page.locator('#panel-editing').innerText();
    expect(text).toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
    expect(text).not.toMatch(/\b\d{2}\/\d{2}\/\d{4}\b/);
  });

  test('the hero names the bundled languages', async ({ page }) => {
    await page.goto('/');
    const stat = page.locator('.hero-stats li', { hasText: 'bundled languages' });
    await expect(stat).toContainText('EN · ES · FR · IT · ZH');
    await expect(stat).toHaveAttribute('title', 'English, Spanish, French, Italian and Chinese');
  });

  test('every call to action to the demo says the same thing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Try the live demo' })).toBeVisible();
    await page.locator('#features, .explorer-actions').first().scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: /^Try the live demo/ }).first()).toBeVisible();
    await expect(page.getByText('See it running')).toHaveCount(0);
  });

  test('the comparison says when it was last checked', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#compare .fineprint')).toContainText('last checked');
  });
});
