import { expect, test, type Page } from '@playwright/test';

async function openPeople(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pessoas', exact: true }).click();
  await page.getByLabel('E-mail').fill('owner@teste.com');
  await page.getByLabel('Senha', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pessoas', exact: true })).toBeVisible();
}

async function reloadPeople(page: Page) {
  await page.getByRole('button', { name: 'Plano de ação', exact: true }).click();
  await page.getByRole('button', { name: 'Pessoas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Histórico', exact: true })).toBeVisible();
}

test('Grupo A — Perfil comportamental [group-a]', { timeout: 120_000 }, async ({ page }) => {
  await openPeople(page);
  await page.getByRole('button', { name: 'Iniciar avaliação', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Perfil comportamental', exact: true })).toBeVisible();
  for (let question = 0; question < 20; question += 1) {
    await page.getByRole('radio', { name: '5 — Concordo totalmente', exact: true }).check();
    const action = page.getByRole('button', { name: question === 19 ? 'Finalizar' : 'Avançar', exact: true });
    await expect(action).toBeEnabled();
    await action.click();
    if (question < 19) await expect(page.getByText(`Pergunta ${question + 2} de 20`, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Resultado do perfil', exact: true })).toBeVisible();
  await reloadPeople(page);
  await expect(page.getByText('Perfil comportamental', { exact: true }).last()).toBeVisible();
});

test('Grupo B — Competências [group-b]', async ({ page }) => {
  await openPeople(page);
  await page.getByRole('button', { name: 'Nova avaliação de competências', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Avaliação de competências/ })).toBeVisible();
  await page.getByRole('combobox', { name: /Nota para/ }).first().selectOption('4');
  await page.getByRole('button', { name: 'Finalizar avaliação', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resultado de competências', exact: true })).toBeVisible();
  await expect(page.locator('progress')).toHaveCount(1);
  await reloadPeople(page);
  await page.getByRole('button', { name: 'Abrir detalhes', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Detalhes do ciclo', exact: true })).toBeVisible();
});

test('Grupo C — Cargos [group-c]', async ({ page }) => {
  await openPeople(page);
  const jobName = `Cargo E2E ${Date.now()}`;
  await page.getByLabel('Nome do cargo').fill(jobName);
  await page.getByRole('button', { name: 'Criar cargo', exact: true }).click();
  await expect(page.getByText(jobName, { exact: true }).first()).toBeVisible();
  await page.getByLabel('Cargo', { exact: true }).selectOption({ label: jobName });
  await page.getByLabel('Funcionário').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Associar cargo', exact: true }).click();
  await expect(page.getByText(jobName, { exact: true }).first()).toBeVisible();
});

test('Grupo D — Competência customizada [group-d]', async ({ page }) => {
  await openPeople(page);
  const competencyName = `Competência E2E ${Date.now()}`;
  const competencyForm = page.locator('.people-tools form').last();
  await competencyForm.getByRole('textbox', { name: 'Competência', exact: true }).fill(competencyName);
  await competencyForm.getByRole('combobox').selectOption('TECNICA');
  await page.getByRole('button', { name: 'Criar competência personalizada', exact: true }).click();
  await expect(page.getByText(competencyName, { exact: true })).toBeVisible();
});
