import { useEffect, useMemo, useState } from 'react';

type Session = { token: string };
type Dashboard = { totalEmployees: number; analyzedEmployees: number; insufficientDataEmployees: number; averageFit: number | null; classificationDistribution: { classification: string; count: number }[]; jobCoverage: { total: number; withActiveProfile: number; withoutActiveProfile: number }; frequentGaps: { competencyId: string; name: string; count: number }[] };
const labels: Record<string, string> = { ADERENCIA_MUITO_ALTA: 'Muito alta', ADERENCIA_ALTA: 'Alta', ADERENCIA_MODERADA: 'Moderada', ADERENCIA_BAIXA: 'Baixa', ADERENCIA_MUITO_BAIXA: 'Muito baixa' };

export function JobFitDashboard({ session, refreshKey = 0 }: { session: Session; refreshKey?: number }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const headers = useMemo(() => ({ Authorization: `Bearer ${session.token}` }), [session.token]);
  useEffect(() => {
    let current = true;
    setError('');
    fetch('/api/people-development/job-fit/dashboard', { headers }).then(async response => {
      if (!response.ok) throw new Error();
      return response.json() as Promise<Dashboard>;
    }).then(result => current && setData(result)).catch(() => current && setError('Não foi possível carregar o dashboard de aderência.'));
    return () => { current = false; };
  }, [headers, refreshKey]);
  if (error) return <section className="job-fit-dashboard"><h3>Dashboard de aderência</h3><p role="alert">{error}</p></section>;
  if (!data) return <section className="job-fit-dashboard" aria-busy="true"><h3>Dashboard de aderência</h3><p>Carregando indicadores…</p></section>;
  return <section className="job-fit-dashboard"><h3>Dashboard de aderência</h3><div className="job-fit-metrics"><article><small>Funcionários</small><strong>{data.totalEmployees}</strong></article><article><small>Analisados</small><strong>{data.analyzedEmployees}</strong></article><article><small>Sem dados suficientes</small><strong>{data.insufficientDataEmployees}</strong></article><article><small>Aderência média</small><strong>{data.averageFit === null ? 'Sem dados' : `${data.averageFit}%`}</strong></article></div><div className="job-fit-dashboard-sections"><article><h4>Distribuição por classificação</h4>{data.classificationDistribution.length ? <ul>{data.classificationDistribution.map(item => <li key={item.classification}>{labels[item.classification] ?? item.classification}: <strong>{item.count}</strong></li>)}</ul> : <p>Sem análises válidas.</p>}</article><article><h4>Cobertura dos cargos</h4><p>Total: <strong>{data.jobCoverage.total}</strong></p><p>Com perfil esperado: <strong>{data.jobCoverage.withActiveProfile}</strong></p><p>Sem perfil esperado: <strong>{data.jobCoverage.withoutActiveProfile}</strong></p>{data.jobCoverage.withoutActiveProfile > 0 && <a href="#job-profile-config">Configurar perfis esperados</a>}</article><article><h4>Gaps mais frequentes</h4>{data.frequentGaps.length ? <ol>{data.frequentGaps.map(gap => <li key={gap.competencyId}>{gap.name}: <strong>{gap.count}</strong></li>)}</ol> : <p>Sem gaps recorrentes nas análises atuais.</p>}</article></div></section>;
}
