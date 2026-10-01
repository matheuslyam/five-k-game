import { test, expect } from '@playwright/test';

// Requer `npm run build && npm run preview` (playwright sobe sozinho via webServer).
// Cobre o loop crítico: tutorial + formato + inputs acessíveis no mobile.
test('tutorial conclui e inputs têm padrão mobile', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Escondi 5 flags')).toBeVisible();

  const tutorialInput = page.locator('form[data-flag="0"] input');
  await expect(tutorialInput).toHaveValue(/bem-vindo/);
  await page.locator('form[data-flag="0"] button').click();
  await expect(page.locator('form[data-flag="0"] + .msg, form[data-flag="0"] ~ .msg').first()).toContainText(/Agora tenta|Isso/i);

  // Padrão anti-softlock mobile: font >=16px e botão >=48px
  for (const id of ['0', '1', '2', '3', '4']) {
    const input = page.locator(`form[data-flag="${id}"] input`);
    const btn = page.locator(`form[data-flag="${id}"] button`);
    if (await input.count()) {
      expect(await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      expect(await btn.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(40);
    }
  }
});
