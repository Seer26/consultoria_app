import { useState } from 'react';
import type { Evidence, History, Member, Task } from './api';
import { label, priorities, shortDate } from './api';

type Save = (body: Record<string, unknown>) => Promise<boolean>;
function describe(value: unknown): string {
  if (value === null) return '—';
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return String(v.title ?? v.content ?? v.type ?? 'Registro criado');
  }
  return typeof value === 'string' ? label(value) : String(value);
}
export function TaskDetail({ task, evidence, history, members, manager, planStatus, busy, save, addEvidence, close }: {
  task: Task; evidence: Evidence[]; history: History[]; members: Member[]; manager: boolean;
  planStatus: string; busy: boolean; save: Save; addEvidence: Save; close: () => void;
}) {
  const [progress, setProgress] = useState(task.progress);
  const [notes, setNotes] = useState(task.notes);
  const [type, setType] = useState('COMENTARIO');
  const [content, setContent] = useState('');
  const terminal = ['CONCLUIDA','CANCELADA'].includes(task.status);
  const editable = planStatus !== 'CANCELADO' && planStatus !== 'CONCLUIDO' && (manager || !terminal && planStatus === 'ATIVO');
  async function changeStatus(status: Task['status']) {
    if (await save({status})) {
      if (status === 'CONCLUIDA') setProgress(100);
      else if (terminal && status === 'EM_ANDAMENTO') setProgress(0);
    }
  }
  const canEvidence = planStatus !== 'CANCELADO' && (manager || editable);
  return <section className="panel task-detail" aria-label="Detalhe da tarefa">
    <div className="panel-header"><div><h3>Detalhe da tarefa</h3><h4>{task.title}</h4></div><button type="button" onClick={close}>Fechar detalhe</button></div>
    <p>{task.description || 'Sem descrição.'}</p>
    <dl className="monitor-grid">
      <div><dt>Responsável</dt><dd>{task.responsibleUserName ?? 'Sem responsável'}</dd></div>
      <div><dt>Prioridade</dt><dd>{label(task.priority)}</dd></div>
      <div><dt>Início</dt><dd>{shortDate(task.startDate)}</dd></div>
      <div><dt>Prazo</dt><dd>{shortDate(task.dueDate)}</dd></div>
      <div><dt>Status</dt><dd>{label(task.status)} {task.overdue && <strong className="overdue">Atrasada</strong>}</dd></div>
      <div><dt>Progresso</dt><dd>{task.progress}%</dd></div>
      {task.completedAt && <div><dt>Conclusão</dt><dd>{shortDate(task.completedAt)}</dd></div>}
    </dl>
    {editable ? <form className="monitor-form" onSubmit={async e => {
      e.preventDefault(); const f = new FormData(e.currentTarget);
      await save({ progress, notes, ...(manager ? { title: f.get('title'), description: f.get('description'), responsibleUserId: f.get('responsible') || null, priority: f.get('priority'), startDate: f.get('start') || null, dueDate: f.get('due') || null } : {}) });
    }}>
      {manager && <>
        <label>Título da tarefa<input name="title" defaultValue={task.title} required maxLength={200} /></label>
        <label>Descrição da tarefa<textarea name="description" defaultValue={task.description} maxLength={4000} /></label>
        <div className="monitor-grid">
          <label>Responsável da tarefa<select name="responsible" defaultValue={task.responsibleUserId ?? ''}><option value="">Sem responsável</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          <label>Prioridade da tarefa<select name="priority" defaultValue={task.priority}>{priorities.map(p => <option key={p} value={p}>{label(p)}</option>)}</select></label>
          <label>Início da tarefa<input name="start" type="date" defaultValue={task.startDate?.slice(0,10)} /></label>
          <label>Prazo da tarefa<input name="due" type="date" defaultValue={task.dueDate?.slice(0,10)} /></label>
        </div>
      </>}
      <label>Progresso da tarefa<input type="number" min={0} max={100} step={1} required value={progress} onChange={e => setProgress(e.target.valueAsNumber)} /></label>
      <label>Observações da tarefa<textarea maxLength={4000} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      <button disabled={busy}>Salvar execução</button>
    </form> : <p>Observações: {task.notes || 'Nenhuma observação.'}</p>}
    <div className="monitor-actions">
      {editable && !terminal && <>
        {task.status === 'PENDENTE' && <button disabled={busy} onClick={() => void changeStatus('EM_ANDAMENTO')}>Iniciar</button>}
        {task.status !== 'AGUARDANDO_VALIDACAO' && <button disabled={busy} onClick={() => void changeStatus('AGUARDANDO_VALIDACAO')}>Enviar para validação</button>}
        {manager && <><button disabled={busy} onClick={() => void changeStatus('CONCLUIDA')}>Concluir</button><button disabled={busy} onClick={() => void changeStatus('CANCELADA')}>Cancelar ação</button></>}
      </>}
      {manager && terminal && planStatus !== 'CANCELADO' && <button disabled={busy} onClick={() => void changeStatus('EM_ANDAMENTO')}>Reabrir</button>}
    </div>
    <h4>Evidências</h4>
    <ul className="monitor-list">{evidence.map(e => <li key={e.id}>
      {e.type === 'LINK' ? <a href={e.content} target="_blank" rel="noopener noreferrer">{e.content}</a> : <p>{e.content}</p>}
      <small>{e.actorName ?? e.createdBy} · {new Date(e.createdAt).toLocaleString('pt-BR')}</small>
    </li>)}</ul>
    {!evidence.length && <p>Nenhuma evidência adicionada.</p>}
    {canEvidence && <form className="monitor-form" onSubmit={async e => { e.preventDefault(); if (await addEvidence({ type, content })) setContent(current => current === content ? '' : current); }}>
      <label>Tipo de evidência<select value={type} onChange={e => setType(e.target.value)}><option value="COMENTARIO">Comentário</option><option value="LINK">Link</option></select></label>
      <label>Conteúdo da evidência<textarea required maxLength={4000} value={content} onChange={e => setContent(e.target.value)} /></label>
      <button disabled={busy}>Adicionar evidência</button>
    </form>}
    <h4>Histórico</h4>
    <ol className="monitor-list">{history.map(h => <li key={h.id}><strong>{label(h.event)}</strong><p>{describe(h.oldValue)} → {describe(h.newValue)}</p><small>{h.actorName} · {new Date(h.createdAt).toLocaleString('pt-BR')}</small></li>)}</ol>
  </section>;
}
