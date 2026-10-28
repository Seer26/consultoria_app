import { useEffect, useMemo, useState } from 'react';

type Session = { token: string };
type Job = { id: string; name: string };
type Competency = { id: string; name: string };
type Requirement = { competencyId: string; expectedLevel: number; weight: number };

export function JobProfileConfig({ session, onSaved }: { session: Session; onSaved?: (jobRoleId: string) => void }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [items, setItems] = useState<Competency[]>([]);
  const [job, setJob] = useState('');
  const [message, setMessage] = useState('');
  const [behavior, setBehavior] = useState({ EXECUTOR: 50, COMUNICADOR: 50, PLANEJADOR: 50, ANALITICO: 50 });
  const [behavioralWeight, setBehavioralWeight] = useState(50);
  const [competencyWeight, setCompetencyWeight] = useState(50);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const headers = useMemo(() => ({ Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' }), [session.token]);

  useEffect(() => {
    let current = true;
    Promise.all([fetch('/api/people-development/jobs', { headers }), fetch('/api/people-development/competencies', { headers })])
      .then(async ([jobsResponse, competenciesResponse]) => {
        if (!jobsResponse.ok || !competenciesResponse.ok) throw new Error();
        const [loadedJobs, loadedItems] = await Promise.all([jobsResponse.json(), competenciesResponse.json()]);
        if (current) { setJobs(loadedJobs); setItems(loadedItems); }
      })
      .catch(() => current && setMessage('Não foi possível carregar os dados do perfil.'));
    return () => { current = false; };
  }, [headers]);

  async function save() {
    if (!job) return setMessage('Selecione um cargo antes de salvar.');
    if (behavioralWeight + competencyWeight !== 100) return setMessage('Os pesos devem totalizar 100%.');
    setMessage('');
    try {
      const response = await fetch(`/api/people-development/jobs/${job}/profile/versions`, {
        method: 'POST', headers,
        body: JSON.stringify({ behavior, behavioralWeight, competencyWeight, requirements }),
      });
      if (!response.ok) throw new Error();
      setMessage('Nova versão criada com sucesso.');
      onSaved?.(job);
    } catch { setMessage('Não foi possível salvar a nova versão.'); }
  }

  return <section id="job-profile-config" className="job-profile-config">
    <h3>Configuração do perfil esperado</h3>
    <label>Cargo<select value={job} onChange={event => setJob(event.target.value)}><option value="">Selecione</option>{jobs.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    <fieldset><legend>Comportamento esperado</legend>{Object.entries(behavior).map(([name, value]) => <label key={name}>{name}<input type="number" min={0} max={100} value={value} onChange={event => setBehavior({ ...behavior, [name]: Number(event.target.value) })} /></label>)}</fieldset>
    <fieldset><legend>Pesos gerais</legend><label>Comportamento<input type="number" min={0} max={100} value={behavioralWeight} onChange={event => setBehavioralWeight(Number(event.target.value))} /></label><label>Competências<input type="number" min={0} max={100} value={competencyWeight} onChange={event => setCompetencyWeight(Number(event.target.value))} /></label></fieldset>
    <fieldset><legend>Competências esperadas</legend>{requirements.map((requirement, index) => <p key={`${requirement.competencyId}-${index}`}><select value={requirement.competencyId} onChange={event => setRequirements(requirements.map((item, position) => position === index ? { ...item, competencyId: event.target.value } : item))}>{items.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select><input aria-label="Nível esperado" type="number" min={0} max={5} value={requirement.expectedLevel} onChange={event => setRequirements(requirements.map((item, position) => position === index ? { ...item, expectedLevel: Number(event.target.value) } : item))}/><input aria-label="Peso da competência" type="number" min={1} value={requirement.weight} onChange={event => setRequirements(requirements.map((item, position) => position === index ? { ...item, weight: Number(event.target.value) } : item))}/><button type="button" onClick={() => setRequirements(requirements.filter((_, position) => position !== index))}>Remover</button></p>)}</fieldset>
    <button type="button" onClick={() => setRequirements([...requirements, { competencyId: items[0]?.id ?? '', expectedLevel: 3, weight: 1 }])} disabled={!items.length}>Adicionar competência</button>
    <button type="button" onClick={save} disabled={!job}>Salvar nova versão</button>
    {message && <p role="status">{message}</p>}
  </section>;
}
