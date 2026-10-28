import { useEffect, useMemo, useState } from 'react';

type Session = { token: string };
type Job = { id: string; name: string };
type Version = { id: string; version_number: number; status: string; created_at: string; created_by?: string | null; behavioral_weight: number; competency_weight: number };
type Detail = Version & { executor: number; comunicador: number; planejador: number; analitico: number; requirements: { id: string; name: string; expected_level: number; weight: number }[] };

export function JobProfileVersions({ session, refreshKey = 0, selectedJobId }: { session: Session; refreshKey?: number; selectedJobId?: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [job, setJob] = useState('');
  const [versions, setVersions] = useState<Version[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const headers = useMemo(() => ({ Authorization: `Bearer ${session.token}` }), [session.token]);

  useEffect(() => {
    fetch('/api/people-development/jobs', { headers }).then(response => response.ok ? response.json() : Promise.reject()).then(setJobs).catch(() => setError('Não foi possível carregar cargos.'));
  }, [headers]);
  useEffect(() => { if (selectedJobId) setJob(selectedJobId); }, [selectedJobId]);
  useEffect(() => {
    if (!job) { setVersions([]); setDetail(null); return; }
    setError('');
    fetch(`/api/people-development/jobs/${job}/profile/versions`, { headers }).then(response => response.ok ? response.json() : Promise.reject()).then(setVersions).catch(() => setError('Não foi possível carregar versões.'));
  }, [headers, job, refreshKey]);
  async function open(version: Version) {
    try {
      const response = await fetch(`/api/people-development/jobs/${job}/profile/versions/${version.id}`, { headers });
      if (!response.ok) throw new Error();
      setDetail(await response.json());
    } catch { setError('Não foi possível abrir esta versão.'); }
  }

  return <section className="job-profile-versions"><h3>Versões do perfil</h3><label>Cargo<select value={job} onChange={event => setJob(event.target.value)}><option value="">Selecione</option>{jobs.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>{error && <p role="alert">{error}</p>}{versions.length ? <div className="versions-list">{versions.map(version => <article className={version.status === 'ACTIVE' ? 'active-version' : ''} key={version.id}><strong>Versão {version.version_number}</strong> · {version.status === 'ACTIVE' ? 'Ativa' : 'Histórica'}<small>Criada em {new Date(version.created_at).toLocaleDateString('pt-BR')} · {version.created_by ?? 'Criador não disponível'}</small><small>Pesos: comportamento {version.behavioral_weight}% · competências {version.competency_weight}%</small><button type="button" onClick={() => open(version)}>Abrir somente leitura</button></article>)}</div> : job && !error && <p>Nenhuma versão configurada.</p>}{detail && <article className="version-detail" aria-label="Detalhe da versão somente leitura"><h4>Versão {detail.version_number} — somente leitura</h4><p>Comportamento: Executor {detail.executor}, Comunicador {detail.comunicador}, Planejador {detail.planejador}, Analítico {detail.analitico}</p><p>Pesos: comportamento {detail.behavioral_weight}% · competências {detail.competency_weight}%</p><ul>{detail.requirements.map(requirement => <li key={requirement.id}>{requirement.name}: nível {requirement.expected_level}, peso {requirement.weight}</li>)}</ul></article>}</section>;
}
