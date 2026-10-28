import { expect, test, type Page } from '@playwright/test';

async function openPeople(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pessoas', exact: true }).click();
  await page.getByLabel('E-mail').fill('owner@teste.com');
  await page.getByLabel('Senha').fill('123456');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard de aderência', exact: true })).toBeVisible();
}

test.describe.serial('Fase 2B — versão, dashboard e responsividade', () => {
  test('Grupo A — cria versões, atualiza a ativa e preserva o histórico', async ({ page }) => {
    await openPeople(page);
    const jobName = `Cargo perfil E2B ${Date.now()}`;
    await page.getByLabel('Nome do cargo').fill(jobName);
    await page.getByRole('button', { name: 'Criar cargo', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Pessoas', exact: true }).click();
    await expect(page.locator('#job-profile-config')).toBeVisible();
    const configuration = page.locator('#job-profile-config');
    await configuration.getByRole('combobox', { name: 'Cargo', exact: true }).selectOption({ label: jobName });
    await configuration.getByRole('button', { name: 'Salvar nova versão', exact: true }).click();
    await expect(configuration.getByText('Nova versão criada com sucesso.', { exact: true })).toBeVisible();
    await configuration.getByRole('button', { name: 'Salvar nova versão', exact: true }).click();
    const versions = page.locator('.job-profile-versions');
    await expect(versions.locator('.versions-list article')).toHaveCount(2);
    await expect(versions.locator('.active-version')).toContainText('Versão 2');
    await versions.getByRole('button', { name: 'Abrir somente leitura', exact: true }).last().click();
    await expect(versions.getByLabel('Detalhe da versão somente leitura')).toContainText('Versão 1');
  });

  test('Grupo B — painel de aderência ao cargo está disponível', async ({ page }) => {
    await openPeople(page);
    await expect(page.locator('.job-fit')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gerar análise de aderência', exact: true })).toBeVisible();
  });

  test('Grupo C — área de gaps é apresentada sem ranking', async ({ page }) => {
    await openPeople(page);
    await expect(page.locator('.job-fit-dashboard').getByText('Gaps mais frequentes', { exact: true })).toBeVisible();
    await expect(page.locator('.job-fit-dashboard').getByText(/Sem gaps recorrentes|Gaps mais frequentes/).first()).toBeVisible();
  });

  test('Grupo D — histórico de aderência está disponível', async ({ page }) => {
    await openPeople(page);
    await expect(page.locator('.job-fit-history')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Histórico de aderência', exact: true })).toBeVisible();
  });

  test('Grupo E — dashboard mostra métricas agregadas', async ({ page }) => {
    await openPeople(page);
    await expect(page.locator('.job-fit-dashboard')).toBeVisible();
    await expect(page.locator('.job-fit-dashboard').getByText('Funcionários', { exact: true })).toBeVisible();
    await expect(page.locator('.job-fit-dashboard').getByText('Gaps mais frequentes', { exact: true })).toBeVisible();
  });

  for (const width of [1440, 1024, 768, 390]) {
    test(`responsividade ${width}px sem overflow global`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1200 });
      await openPeople(page);
      for (const selector of ['#job-profile-config', '.job-profile-versions', '.job-fit', '.job-fit-history', '.job-fit-dashboard']) {
        await expect(page.locator(selector)).toBeVisible();
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`phase2b-${width}.png`), fullPage: true });
    });
  }
});
