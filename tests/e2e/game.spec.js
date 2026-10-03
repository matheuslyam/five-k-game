import { test, expect } from '@playwright/test';

test('onboarding conclui e rotas #/ isolam as 6 páginas', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.getByText('Escondi 5 flags')).toBeVisible();
  await expect(page.locator('#page-home')).toBeVisible();
  await expect(page.locator('#page-flag-1')).toBeHidden();

  const tutorialInput = page.locator('form[data-flag="0"] input');
  await expect(tutorialInput).toHaveValue(/bem-vindo/);
  await page.locator('form[data-flag="0"] button').click();
  await expect(page.locator('#page-home .msg').first()).toContainText(/Agora tenta|Isso/i);

  for (const route of ['#/flag-1', '#/flag-2', '#/flag-3', '#/flag-4', '#/carta']) {
    await page.goto('/' + route);
    await expect(page.locator(`.page[data-route="${route}"]`)).toBeVisible();
  }

  await page.goto('/#/carta');
  await expect(page.locator('#carta')).toBeHidden();
  await expect(page.locator('#missing')).toContainText(/Falta/i);
});

test('inputs têm padrão mobile por rota', async ({ page }) => {
  for (const [route, id] of [['#/', '0'], ['#/flag-1', '1'], ['#/flag-2', '2'], ['#/flag-3', '3'], ['#/flag-4', '4']]) {
    await page.goto('/' + route);
    const input = page.locator(`form[data-flag="${id}"] input`);
    const btn = page.locator(`form[data-flag="${id}"] button[type="submit"]`);
    await expect(input).toBeVisible();
    expect(await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    expect(await btn.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(40);
  }
});

test('Dica 1/2 e Copiar Chave existem por flag', async ({ page }) => {
  for (const n of ['1', '2', '3', '4']) {
    await page.goto(`/#/flag-${n}`);
    await expect(page.locator(`#sec-${n} summary`).first()).toContainText(/Dica 1/i);
    await expect(page.locator(`[data-copy="${n}"]`)).toContainText(/Copiar Chave/i);
  }
});
