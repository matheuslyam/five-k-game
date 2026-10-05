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

test('validação local barra sem rede e carta salva reabre texto + vídeo', async ({ page }) => {
  await page.goto('/#/flag-1');
  await page.locator('form[data-flag="1"] input').fill('');
  await page.locator('form[data-flag="1"] button').click();
  await expect(page.locator('#sec-1 .msg')).toContainText(/inválido/i);

  await page.goto('/#/carta');
  await page.locator('form[data-flag="final"] input').fill('chave-curta');
  await page.locator('form[data-flag="final"] button').click();
  await expect(page.locator('#sec-final .msg')).toContainText(/incompleta/i);

  // PORQUE: o preview estático não roda /api, então o caminho unlock→carta
  // é coberto via restore — e com done a #/carta redireciona para a aberta.
  await page.addInitScript(() => {
    localStorage.setItem(
      '5k-progress',
      JSON.stringify({ frags: { 1: 'a', 2: 'b', 3: 'c', 4: 'd' }, carta: 'Carta de teste para rever.', done: true })
    );
  });
  await page.reload();
  await expect(page).toHaveURL(/#\/carta\/aberta/);
  await expect(page.locator('#page-carta-aberta')).toBeVisible();
  await expect(page.locator('#carta-aberta-text')).toContainText(/Carta de teste/);
  await expect(page.locator('#aberta-video-cta')).toBeVisible();
  await expect(page.locator('#btn-aberta-replay')).toBeVisible();
});

test('placeholders não entregam dica (só a carta tem)', async ({ page }) => {
  // PORQUE: placeholder visível vira dica grátis — decisão do autor 04/10/2026:
  // flags 1-4 sem placeholder, só a final mantém o formato frag1-...-frag4.
  for (const n of ['1', '2', '3', '4']) {
    await page.goto(`/#/flag-${n}`);
    expect(await page.locator(`form[data-flag="${n}"] input`).getAttribute('placeholder')).toBeNull();
  }
  await page.goto('/#/carta');
  expect(await page.locator('form[data-flag="final"] input').getAttribute('placeholder')).toMatch(/frag1-frag2-frag3-frag4/);
});

test('#/carta/aberta sem carta volta para #/carta (guard)', async ({ page }) => {
  await page.goto('/#/carta/aberta');
  await expect(page.locator('#page-carta')).toBeVisible();
  await expect(page.locator('#page-carta-aberta')).toBeHidden();
});

test('#/carta/aberta com carta salva mostra parágrafos + CTA do vídeo', async ({ page }) => {
  // PORQUE: o preview estático não roda /api/unlock, então a cerimônia é
  // coberta via restore (decode de \\n escapado + releitura direta).
  await page.addInitScript(() => {
    localStorage.setItem(
      '5k-progress',
      JSON.stringify({ frags: { 1: 'a', 2: 'b', 3: 'c', 4: 'd' }, carta: 'p1\\n\\np2', done: true })
    );
  });
  await page.goto('/#/carta/aberta');
  await expect(page.locator('#page-carta-aberta')).toBeVisible();
  // decode: \\n escapado virou quebra real com parágrafo preservado
  expect(await page.locator('#carta-aberta-text').evaluate((el) => el.textContent)).toContain('p1\n\np2');
  await expect(page.locator('#carta-aberta-cursor')).toBeHidden();
  await expect(page.locator('#aberta-video-cta')).toBeVisible();
  await expect(page.locator('#btn-aberta-skip')).toBeHidden();
  await expect(page.locator('#btn-aberta-replay')).toBeVisible();
  // tela única: hero/nav e footer somem nessa rota
  await expect(page.locator('body')).toHaveClass(/on-aberta/);
  await expect(page.locator('.hero')).toBeHidden();
  // CTA abre o player com o mp4 oficial
  await page.locator('#btn-aberta-video').click();
  await expect(page.locator('#aberta-video-wrap')).toBeVisible();
  const vsrc = await page.locator('#aberta-video').getAttribute('src');
  expect(vsrc).toContain('pos-carta-final.mp4');
});

test('reviver cerimônia reencena suspense a partir da releitura', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      '5k-progress',
      JSON.stringify({ frags: { 1: 'a', 2: 'b', 3: 'c', 4: 'd' }, carta: 'p1\\n\\np2', done: true })
    );
  });
  await page.goto('/#/carta/aberta');
  await expect(page.locator('#btn-aberta-replay')).toBeVisible();
  await page.locator('#btn-aberta-replay').click();
  // suspense de 5s: cursor piscando, texto ainda vazio, skip volta à cena
  await expect(page.locator('#carta-aberta-cursor')).toBeVisible();
  await expect(page.locator('#btn-aberta-skip')).toBeHidden();
  expect(await page.locator('#carta-aberta-text').evaluate((el) => el.textContent)).toBe('');
});
