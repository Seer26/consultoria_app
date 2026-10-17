import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError, label, priorities, shortDate, statuses } from './api';
import type { Employee, Evidence, History, Member, Metrics, Plan, Session, Task } from './api';
import { PlanForm, TaskForm } from './PlanForms';
import { TaskDetail } from './TaskDetail';
import './monitoring.css';

function storedSession(): Session | null {
  try {
    const value = JSON.parse(sessionStorage.getItem('monitoring-session') ?? 'null') as Session | null;
    return value?.token && value.user?.id ? value : null;
  } catch { return null; }
}
export function MonitoringPage() {
  const [session, setSession] = useState<Session | null>(storedSession);
  function changeSession(value: Session | null) {
    if (value) sessionStorage.setItem('monitoring-session', JSON.stringify(value));
    else sessionStorage.removeItem('monitoring-session');
    setSession(value);
  }
  return session ? <MonitoringWorkspace key={session.token} session={session} logout={() => changeSession(null)} /> : <Login onLogin={changeSession} />;
}
function Login({ onLogin }: { onLogin: (value: Session) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const data = new FormData(e.currentTarget); setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email:data.get('email'), password:data.get('password') }) });
      if (!response.ok) throw new Error('Não foi possível entrar. Verifique e-mail e senha.');
      const result = await response.json() as Session;
      onLogin(result);
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha de conexão.'); } finally { setBusy(false); }
  }
  return <section className="panel monitor-login monitor"><span className="eyebrow">Plano de ação</span><h2>Acompanhe a execução</h2><p>Entre para acessar os planos e tarefas da sua empresa.</p>
    {error && <p role="alert">{error}</p>}
    <form className="monitor-form" onSubmit={submit}>
      <label>E-mail<input type="email" name="email" autoComplete="username" required /></label>
      <label>Senha<input type="password" name="password" autoComplete="current-password" required /></label>
      <button disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
    </form>
  </section>;
}
function MonitoringWorkspace({ session, logout }: { session: Session; logout: () => void }) {
  const manager = session.user.role !== 'EMPLOYEE';
  const [companyId, setCompanyId] = useState(session.user.companyId ?? '');
  const [companies, setCompanies] = useState<{id:string;name:string}[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]), [planId, setPlanId] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]), [members, setMembers] = useState<Member[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]), [metrics, setMetrics] = useState<Metrics | null>(null);
  const [status, setStatus] = useState(''), [responsible, setResponsible] = useState(''), [priority, setPriority] = useState(''), [overdue, setOverdue] = useState(''), [completed, setCompleted] = useState('');
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0), [planForm, setPlanForm] = useState<Plan | null | undefined>(undefined), [taskForm, setTaskForm] = useState(false);
  const [taskId, setTaskId] = useState(''), [detail, setDetail] = useState<{task:Task;evidence:Evidence[];history:History[]} | null>(null);
  const request = useMemo(() => api(session, companyId), [session, companyId]);
  const selectedPlan = plans.find(p => p.id === planId);
  const reportError = useCallback((e: unknown) => {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    if (e instanceof ApiError && e.status === 401) { logout(); return; }
    setError(e instanceof Error ? e.message : 'Falha ao conectar à API.');
  }, [logout]);
  // The global administrator must select a company. Tenant-bound identities never choose a different tenant.
  useEffect(() => {
    if (session.user.companyId || session.user.role !== 'ADMIN') return;
    const controller = new AbortController();
    request<{id:string;name:string}[]>('/companies', 'GET', undefined, controller.signal).then(setCompanies).catch(reportError);
    return () => controller.abort();
  }, [session, request, reportError]);
  const taskQuery = useMemo(() => {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries({planId,status,responsibleUserId:responsible,priority,overdue,completed})) if (value) q.set(key,value);
    return q.toString();
  }, [planId,status,responsible,priority,overdue,completed]);
  useEffect(() => {
    if (!companyId) return;
    const controller = new AbortController(); setLoading(true); setError('');
    const planQuery = planId ? '?planId=' + encodeURIComponent(planId) : '';
    Promise.all([
      request<Plan[]>('/action-plan/plans', 'GET', undefined, controller.signal),
      request<Task[]>('/action-plan/tasks?' + taskQuery, 'GET', undefined, controller.signal),
      request<Metrics>('/action-plan/dashboard'+planQuery, 'GET', undefined, controller.signal),
      manager ? request<Member[]>('/action-plan/members', 'GET', undefined, controller.signal) : Promise.resolve([]),
      request<Employee[]>('/action-plan/employees'+planQuery, 'GET', undefined, controller.signal),
    ]).then(([p,t,m,u,e]) => { if (!controller.signal.aborted) { setPlans(p);setTasks(t);setMetrics(m);setMembers(u);setEmployees(e); } })
      .catch(reportError).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, planId, taskQuery, revision, manager, request, reportError]);
  useEffect(() => {
    if (!taskId || !companyId) return;
    const controller = new AbortController();
    Promise.all([
      request<Task>('/action-plan/tasks/'+taskId, 'GET', undefined, controller.signal),
      request<Evidence[]>('/action-plan/tasks/'+taskId+'/evidence', 'GET', undefined, controller.signal),
      request<History[]>('/action-plan/tasks/'+taskId+'/history', 'GET', undefined, controller.signal),
    ]).then(([task,evidence,history]) => { if (!controller.signal.aborted) setDetail({task,evidence,history}); }).catch(e => {
      if (!controller.signal.aborted) {
        // Keep same-task drafts on transient failures; revoke the view on an authoritative access denial.
        if (e instanceof ApiError && [401,403,404].includes(e.status)) setDetail(null);
        reportError(e);
      }
    });
    return () => controller.abort();
  }, [taskId, companyId, revision, request, reportError]);
  async function perform(work: () => Promise<void>): Promise<boolean> {
    if (busy) return false;
    setBusy(true);setError('');setNotice('');
    try { await work();setRevision(r => r+1);setNotice('Alteração salva.');return true; }
    catch (e) { reportError(e);return false; } finally { setBusy(false); }
  }
  function chooseCompany(id: string) {
    setCompanyId(id);setPlanId('');setTaskId('');setDetail(null);setPlans([]);setTasks([]);setMetrics(null);setEmployees([]);setMembers([]);setTaskForm(false);setPlanForm(undefined);setNotice('');setError('');
    setResponsible('');setStatus('');setPriority('');setOverdue('');setCompleted('');
  }
  return <div className="monitor page-stack">
    <section className="panel hero">
      <div className="panel-header"><div><span className="eyebrow">Monitoramento</span><h2>Plano de ação</h2><p>Responsabilidades claras, evidências e execução acompanhada.</p></div><button type="button" onClick={logout}>Sair</button></div>
      <p>{session.user.name} · {manager ? 'Gestão' : 'Minhas tarefas'}</p>
      {!session.user.companyId && <label>Empresa selecionada<select value={companyId} onChange={e => chooseCompany(e.target.value)}><option value="">Selecione uma empresa</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
      {companyId && <>
        <label>Plano selecionado<select value={planId} onChange={e => {setPlanId(e.target.value);setTaskId('');setTaskForm(false);setPlanForm(undefined);}}><option value="">Todos os planos</option>{plans.map(p => <option value={p.id} key={p.id}>{p.title} · {label(p.status)} · {p.progress}%</option>)}</select></label>
        {selectedPlan && <div><p>{selectedPlan.description}</p><p>Início: {shortDate(selectedPlan.startDate)} · Prazo: {shortDate(selectedPlan.dueDate)} · {label(selectedPlan.status)}</p><p>Progresso geral: {selectedPlan.progress}%</p><progress max={100} value={selectedPlan.progress} aria-label="Progresso geral do plano" /></div>}
        {manager && <div className="monitor-actions">
          <button disabled={busy} onClick={() => {setPlanForm(null);setTaskForm(false);}}>Novo plano</button>
          {selectedPlan && <button disabled={busy} onClick={() => {setPlanForm(selectedPlan);setTaskForm(false);}}>Editar plano</button>}
          {selectedPlan && !['CONCLUIDO','CANCELADO'].includes(selectedPlan.status) && <button disabled={busy} onClick={() => {setTaskForm(true);setPlanForm(undefined);}}>Nova tarefa</button>}
        </div>}
      </>}
    </section>
    {error && <div className="panel monitor-error" role="alert">{error}<button type="button" onClick={() => setRevision(r=>r+1)}>Tentar novamente</button></div>}
    {notice && <p role="status">{notice}</p>}
    {loading && <p role="status">Carregando dados…</p>}
    {!companyId && <p>Selecione uma empresa para acompanhar os planos.</p>}
    {companyId && <>
      {planForm !== undefined && <PlanForm key={planForm?.id ?? 'new'} plan={planForm} busy={busy} cancel={() => setPlanForm(undefined)} save={body => perform(async () => {
        const plan = await request<Plan>(planForm ? '/action-plan/plans/'+planForm.id : '/action-plan/plans', planForm ? 'PUT' : 'POST', body);
        setPlanForm(undefined);setPlanId(plan.id);
      })} />}
      {taskForm && selectedPlan && <TaskForm members={members} busy={busy} cancel={() => setTaskForm(false)} save={body => perform(async () => {await request('/action-plan/tasks', 'POST', {...body,planId:selectedPlan.id});setTaskForm(false);})} />}
      {metrics && <section aria-label="Indicadores de execução" className="monitor-stats">{[
        ['Total de tarefas',metrics.total],['Pendentes',metrics.pending],['Em andamento',metrics.inProgress],['Aguardando validação',metrics.awaitingValidation],['Concluídas',metrics.completed],['Atrasadas',metrics.overdue],['Execução geral',metrics.progress+'%'],
      ].map(([name,value]) => <div className="stat-card" key={name}><span>{name}</span><strong>{value}</strong></div>)}</section>}
      <section className="panel">
        <h3>{manager ? 'Tarefas do plano' : 'Tarefas atribuídas a mim'}</h3>
        <div className="monitor-filters">
          <label>Filtrar status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos</option>{statuses.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label>
          {manager && <label>Filtrar responsável<select value={responsible} onChange={e=>setResponsible(e.target.value)}><option value="">Todos</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
          <label>Filtrar prioridade<select value={priority} onChange={e=>setPriority(e.target.value)}><option value="">Todas</option>{priorities.map(p=><option key={p} value={p}>{label(p)}</option>)}</select></label>
          <label>Filtrar atraso<select value={overdue} onChange={e=>setOverdue(e.target.value)}><option value="">Todas</option><option value="true">Apenas atrasadas</option><option value="false">Sem atraso</option></select></label>
          <label>Filtrar concluídas<select value={completed} onChange={e=>setCompleted(e.target.value)}><option value="">Todas</option><option value="true">Apenas concluídas</option><option value="false">Não concluídas</option></select></label>
        </div>
        {!tasks.length && !loading && <p>Nenhuma tarefa encontrada para estes filtros.</p>}
        <ul className="task-cards">{tasks.map(t=><li className="task-card" key={t.id}>
          <h4>{t.title}</h4><p>{t.responsibleUserName ?? 'Sem responsável'}</p>
          <dl><div><dt>Prioridade</dt><dd>{label(t.priority)}</dd></div><div><dt>Prazo</dt><dd>{shortDate(t.dueDate)}</dd></div><div><dt>Status</dt><dd>{label(t.status)}</dd></div></dl>
          {t.overdue && <strong className="overdue">Atrasada</strong>}
          <progress max={100} value={t.progress} aria-label={'Progresso de '+t.title} /><span>{t.progress}%</span>
          <button type="button" aria-label={'Abrir '+t.title} onClick={()=>{setTaskId(t.id);setNotice('');}}>Abrir tarefa</button>
        </li>)}</ul>
      </section>
      {detail && detail.task.id === taskId && <TaskDetail key={detail.task.id} {...detail} members={members} manager={manager} planStatus={plans.find(p=>p.id===detail.task.planId)?.status ?? 'RASCUNHO'} busy={busy} close={()=>setTaskId('')} save={body=>perform(async()=>{await request('/action-plan/tasks/'+detail.task.id,'PUT',body);})} addEvidence={body=>perform(async()=>{await request('/action-plan/tasks/'+detail.task.id+'/evidence','POST',body);})} />}
      <section className="panel"><h3>{manager ? 'Execução por funcionário' : 'Minha execução'}</h3><p>Acompanhamento das tarefas atribuídas.</p>
        {!employees.length && <p>Nenhum funcionário ativo encontrado.</p>}
        <ul className="task-cards">{employees.map(e=><li className="task-card" key={e.id}><h4>{e.name}</h4><p>Atribuídas: {e.total} · Concluídas: {e.completed}</p><p>Em andamento: {e.inProgress} · Atrasadas: {e.overdue}</p><strong>Execução: {e.progress}%</strong><progress max={100} value={e.progress} aria-label={'Execução de '+e.name} /></li>)}</ul>
      </section>
    </>}
  </div>;
}
