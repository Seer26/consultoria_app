import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Member, Plan } from './api';
import { label, planStates, priorities } from './api';

type Save = (body: Record<string, unknown>) => Promise<boolean>;
export function PlanForm({ plan, busy, save, cancel }: { plan: Plan | null; busy: boolean; save: Save; cancel: () => void }) {
  const [title, setTitle] = useState(plan?.title ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [status, setStatus] = useState(plan?.status ?? 'RASCUNHO');
  const [start, setStart] = useState(plan?.startDate?.slice(0, 10) ?? '');
  const [due, setDue] = useState(plan?.dueDate?.slice(0, 10) ?? '');
  const [diagnosis, setDiagnosis] = useState(plan?.submissionId ?? '');
  async function submit(e: FormEvent) {
    e.preventDefault();
    await save({ title, description, status, startDate: start || null, dueDate: due || null, ...(!plan ? { submissionId: diagnosis || null } : {}) });
  }
  return <form className="panel monitor-form" onSubmit={submit}>
    <h3>{plan ? 'Editar plano' : 'Novo plano'}</h3>
    <label>Título do plano<input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label>
    <label>Descrição do plano<textarea maxLength={4000} value={description} onChange={e => setDescription(e.target.value)} /></label>
    <div className="monitor-grid">
      <label>Status do plano<select value={status} onChange={e => setStatus(e.target.value as Plan['status'])}>{planStates.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>
      <label>Início do plano<input type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
      <label>Prazo do plano<input type="date" min={start} value={due} onChange={e => setDue(e.target.value)} /></label>
    </div>
    {!plan && <label>Diagnóstico de origem (ID opcional)<input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} /></label>}
    <div className="monitor-actions"><button disabled={busy}>Salvar plano</button><button type="button" disabled={busy} onClick={cancel} aria-label="Cancelar edição do plano">Cancelar</button></div>
  </form>;
}
export function TaskForm({ members, busy, save, cancel }: { members: Member[]; busy: boolean; save: Save; cancel: () => void }) {
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    await save({ title: f.get('title'), description: f.get('description'), responsibleUserId: f.get('responsible') || null, priority: f.get('priority'), startDate: f.get('start') || null, dueDate: f.get('due') || null });
  }
  return <form className="panel monitor-form" onSubmit={submit}>
    <h3>Nova tarefa</h3>
    <label>Título da tarefa<input name="title" required maxLength={200} /></label>
    <label>Descrição da tarefa<textarea name="description" maxLength={4000} /></label>
    <div className="monitor-grid">
      <label>Responsável da tarefa<select name="responsible"><option value="">Sem responsável</option>{members.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
      <label>Prioridade da tarefa<select name="priority" defaultValue="MEDIA">{priorities.map(p => <option key={p} value={p}>{label(p)}</option>)}</select></label>
      <label>Início da tarefa<input name="start" type="date" /></label>
      <label>Prazo da tarefa<input name="due" type="date" /></label>
    </div>
    <div className="monitor-actions"><button disabled={busy}>Criar tarefa</button><button type="button" disabled={busy} onClick={cancel}>Cancelar tarefa</button></div>
  </form>;
}
