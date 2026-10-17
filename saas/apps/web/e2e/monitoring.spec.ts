import { test, expect } from '@playwright/test';

test('manager and employee execute real operational monitoring workflow', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('E-mail').fill('owner@teste.com');
  await page.getByLabel('Senha', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Novo plano', exact: true }).click();
  const title='Plano E2E '+Date.now();
  await page.getByLabel('Título do plano').fill(title);
  await page.getByLabel('Status do plano').selectOption('ATIVO');
  await page.getByRole('button', { name: 'Salvar plano', exact: true }).click();
  await expect(page.getByLabel('Plano selecionado')).toHaveValue(/.+/);
  await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click();
  await page.getByLabel('Título da tarefa').fill('Entrega E2E');
  await page.getByLabel('Responsável da tarefa').selectOption('user-employee-teste');
  await page.getByLabel('Prazo da tarefa').fill('2020-01-01');
  await page.getByRole('button', { name: 'Criar tarefa', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir Entrega E2E', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Detalhe da tarefa' })).toBeVisible();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await page.getByLabel('E-mail').fill('employee@teste.com');
  await page.getByLabel('Senha', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir Entrega E2E', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
  await page.getByLabel('Progresso da tarefa').fill('55');
  await page.getByLabel('Observações da tarefa').fill('Etapa verificada pelo funcionário');
  await page.getByRole('button', { name: 'Salvar execução', exact: true }).click();
  await expect(page.getByLabel('Progresso da tarefa')).toHaveValue('55');
  await page.getByLabel('Conteúdo da evidência').fill('Comentário de entrega E2E');
  await page.getByRole('button', { name: 'Adicionar evidência', exact: true }).click();
  await expect(page.getByText('Comentário de entrega E2E', { exact: true })).toBeVisible();
  await page.getByLabel('Tipo de evidência').selectOption('LINK');
  await page.getByLabel('Conteúdo da evidência').fill('https://example.com/e2e');
  await page.getByRole('button', { name: 'Adicionar evidência', exact: true }).click();
  await expect(page.getByRole('link', { name: 'https://example.com/e2e' })).toBeVisible();
  await page.getByRole('button', { name: 'Enviar para validação', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Concluir', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await page.getByLabel('E-mail').fill('owner@teste.com');
  await page.getByLabel('Senha', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir Entrega E2E', exact: true }).click();
  await page.getByRole('button', { name: 'Concluir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reabrir', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reabrir', exact: true }).click();
  await expect(page.getByLabel('Progresso da tarefa')).toHaveValue('0');
  await expect(page.getByText('Reabertura', { exact: true })).toBeVisible();
});

for (const width of [1440,1024,768,390]) {
  test(`responsive forms and detail at ${width}px`, async ({ page }) => {
    const login = await page.request.post('/api/auth/login', {data:{email:'owner@teste.com',password:'123456'}});
    expect(login.ok()).toBe(true);
    const session = await login.json();
    const headers = { Authorization: `Bearer ${session.token}` };
    const planResponse = await page.request.post('/api/action-plan/plans', {headers, data:{title:`Plano responsivo ${width}`,status:'ATIVO'}});
    expect(planResponse.status()).toBe(201);
    const plan = await planResponse.json();
    const taskResponse = await page.request.post('/api/action-plan/tasks', {headers, data:{planId:plan.id,title:`Responsividade ${width}`,responsibleUserId:'user-employee-teste',dueDate:'2020-01-01'}});
    expect(taskResponse.status()).toBe(201);
    const task = await taskResponse.json();
    const evidenceResponse = await page.request.post(`/api/action-plan/tasks/${task.id}/evidence`, {headers,data:{type:'LINK',content:'https://example.com/'+ 'evidencia-longa-'.repeat(20)}});
    expect(evidenceResponse.status()).toBe(201);
    await page.setViewportSize({width,height:1000});
    await page.goto('/');
    await page.getByLabel('E-mail').fill('owner@teste.com');
    await page.getByLabel('Senha', { exact: true }).fill('123456');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByLabel('Plano selecionado').selectOption(plan.id);
    await page.getByRole('button', { name: 'Novo plano', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Salvar plano', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar edição do plano', exact: true }).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.getByRole('button', {name:'Nova tarefa',exact:true}).click();
    await expect(page.getByLabel('Título da tarefa')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.getByRole('button',{name:'Cancelar tarefa',exact:true}).click();
    await page.getByRole('button', { name: `Abrir Responsividade ${width}`, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Detalhe da tarefa' })).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    for(const button of await page.getByRole('button').all()) {
      if(await button.isVisible()) {
        const b=await button.boundingBox();expect(b!.x).toBeGreaterThanOrEqual(0);expect(b!.x+b!.width).toBeLessThanOrEqual(width+1);
      }
    }
    await page.screenshot({path:`test-results/monitoring-${width}.png`,fullPage:true});
  });
}

test('global administrator selects a company before accessing monitoring',async({page})=>{
  await page.goto('/');
  await page.getByLabel('E-mail').fill('admin@teste.com');
  await page.getByLabel('Senha',{exact:true}).fill('123456');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page.getByRole('button',{name:'Novo plano',exact:true})).toHaveCount(0);
  await page.getByLabel('Empresa selecionada').selectOption('company-demo');
  await expect(page.getByRole('button',{name:'Novo plano',exact:true})).toBeVisible();
});
test('preserves same-task drafts when adding evidence and changing status',async({page})=>{
  const login=await page.request.post('/api/auth/login',{data:{email:'owner@teste.com',password:'123456'}});
  const auth=await login.json();const headers={Authorization:`Bearer ${auth.token}`};
  const planResponse=await page.request.post('/api/action-plan/plans',{headers,data:{title:'Plano de rascunhos',status:'ATIVO'}});
  const plan=await planResponse.json();
  await page.request.post('/api/action-plan/tasks',{headers,data:{planId:plan.id,title:'Tarefa com rascunhos'}});
  await page.goto('/');await page.getByLabel('E-mail').fill('owner@teste.com');await page.getByLabel('Senha',{exact:true}).fill('123456');await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('button',{name:'Abrir Tarefa com rascunhos',exact:true}).click();
  await page.getByLabel('Progresso da tarefa').fill('37');
  await page.getByLabel('Observações da tarefa').fill('Rascunho não enviado');
  await page.getByLabel('Conteúdo da evidência').fill('Evidência enviada');
  await page.getByRole('button',{name:'Adicionar evidência',exact:true}).click();
  await expect(page.getByText('Evidência enviada',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Progresso da tarefa')).toHaveValue('37');
  await expect(page.getByLabel('Observações da tarefa')).toHaveValue('Rascunho não enviado');
  await page.getByLabel('Conteúdo da evidência').fill('Evidência ainda em rascunho');
  await page.getByRole('button',{name:'Iniciar',exact:true}).click();
  await expect(page.getByRole('button',{name:'Iniciar',exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Conteúdo da evidência')).toHaveValue('Evidência ainda em rascunho');
  await expect(page.getByLabel('Progresso da tarefa')).toHaveValue('37');
  // Inject a transient network failure only after a real evidence POST succeeds.
  await page.route(/\/api\/action-plan\/tasks\/[^/]+\/history/, route=>route.abort('failed'), {times:1});
  await page.getByRole('button',{name:'Adicionar evidência',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Progresso da tarefa')).toHaveValue('37');
  await expect(page.getByLabel('Observações da tarefa')).toHaveValue('Rascunho não enviado');
  await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('Progresso da tarefa')).toHaveValue('37');
});
