import { randomUUID } from 'node:crypto';
import { database } from '../../db/database';
import { calculateJobFit, type BehavioralDimension } from './job-fit.calculation';

type RequirementInput={competencyId:string;expectedLevel:number;weight:number};
const dimensions=['EXECUTOR','COMUNICADOR','PLANEJADOR','ANALITICO'] as const;
const iso=()=>new Date().toISOString();
export function activeProfile(companyId:string, jobRoleId:string){return database.prepare("SELECT * FROM job_profile_versions WHERE company_id=? AND job_role_id=? AND status='ACTIVE'").get(companyId,jobRoleId);}
export function profileRequirements(companyId:string,versionId:string){return database.prepare('SELECT r.*,c.name FROM job_profile_requirements r JOIN competencies c ON c.id=r.competency_id WHERE r.company_id=? AND r.profile_version_id=? ORDER BY c.name').all(companyId,versionId);}
export function profileVersion(companyId: string, jobRoleId: string, versionId: string) {
  const profile = database.prepare('SELECT * FROM job_profile_versions WHERE id=? AND company_id=? AND job_role_id=?').get(versionId, companyId, jobRoleId) as { id: string } | undefined;
  return profile ? { ...profile, requirements: profileRequirements(companyId, profile.id) } : undefined;
}
export function createProfile(companyId:string,userId:string,jobRoleId:string,input:{behavior:Record<BehavioralDimension,number>;behavioralWeight:number;competencyWeight:number;requirements:RequirementInput[]}){
  const job=database.prepare('SELECT id FROM job_roles WHERE id=? AND company_id=?').get(jobRoleId,companyId); if(!job)throw new Error('JOB_NOT_FOUND');
  if(!Number.isInteger(input.behavioralWeight)||!Number.isInteger(input.competencyWeight)||input.behavioralWeight<0||input.competencyWeight<0||input.behavioralWeight+input.competencyWeight!==100)throw new Error('FIT_WEIGHTS_INVALID');
  for(const d of dimensions)if(!Number.isInteger(input.behavior[d])||input.behavior[d]<0||input.behavior[d]>100)throw new Error('FIT_BEHAVIOR_INVALID');
  const ids=new Set<string>();for(const r of input.requirements){if(!r.competencyId||ids.has(r.competencyId)||!Number.isInteger(r.expectedLevel)||r.expectedLevel<0||r.expectedLevel>5||!Number.isInteger(r.weight)||r.weight<=0)throw new Error('FIT_REQUIREMENT_INVALID');ids.add(r.competencyId);if(!database.prepare('SELECT id FROM competencies WHERE id=? AND active=1 AND (is_default=1 OR company_id=?)').get(r.competencyId,companyId))throw new Error('COMPETENCY_NOT_FOUND');}
  const previous=activeProfile(companyId,jobRoleId) as {version_number:number}|undefined;const id=randomUUID(),at=iso(),version=(previous?.version_number??0)+1;
  database.transaction(()=>{if(previous)database.prepare("UPDATE job_profile_versions SET status='SUPERSEDED' WHERE company_id=? AND job_role_id=? AND status='ACTIVE'").run(companyId,jobRoleId);database.prepare('INSERT INTO job_profile_versions(id,company_id,job_role_id,version_number,executor,comunicador,planejador,analitico,behavioral_weight,competency_weight,status,created_by,created_at,activated_at) VALUES(?,?,?,?,?,?,?,?,?,?,\'ACTIVE\',?,?,?)').run(id,companyId,jobRoleId,version,input.behavior.EXECUTOR,input.behavior.COMUNICADOR,input.behavior.PLANEJADOR,input.behavior.ANALITICO,input.behavioralWeight,input.competencyWeight,userId,at,at);const statement=database.prepare('INSERT INTO job_profile_requirements(id,company_id,profile_version_id,competency_id,expected_level,weight,created_at) VALUES(?,?,?,?,?,?,?)');for(const r of input.requirements)statement.run(randomUUID(),companyId,id,r.competencyId,r.expectedLevel,r.weight,at);})();
  return { ...(activeProfile(companyId,jobRoleId) as object), requirements:profileRequirements(companyId,id) };
}
export function analyze(companyId:string,userId:string,employeeId:string){
  const assignment=database.prepare('SELECT job_role_id FROM employee_job_roles WHERE company_id=? AND employee_id=?').get(companyId,employeeId) as {job_role_id:string}|undefined;if(!assignment)return {state:'NO_JOB_ROLE'};
  const profile=activeProfile(companyId,assignment.job_role_id) as Record<string,unknown>|undefined;if(!profile)return {state:'NO_JOB_PROFILE'};
  const behavior=database.prepare("SELECT c.id,s.executor,s.comunicador,s.planejador,s.analitico FROM assessment_cycles c JOIN behavioral_scores s ON s.cycle_id=c.id WHERE c.company_id=? AND c.employee_id=? AND c.status='CONCLUIDA' ORDER BY c.completed_at DESC LIMIT 1").get(companyId,employeeId) as Record<string,unknown>|undefined;if(!behavior)return {state:'NO_BEHAVIORAL_ASSESSMENT'};
  const competency=database.prepare("SELECT c.id FROM assessment_cycles c JOIN competency_assessment_items i ON i.cycle_id=c.id WHERE c.company_id=? AND c.employee_id=? AND c.status='CONCLUIDA' GROUP BY c.id ORDER BY c.completed_at DESC LIMIT 1").get(companyId,employeeId) as {id:string}|undefined;if(!competency)return {state:'NO_COMPETENCY_ASSESSMENT'};
  const requirements=profileRequirements(companyId,String(profile.id)) as Array<{competency_id:string;name:string;expected_level:number;weight:number}>;const scores=database.prepare('SELECT competency_id,score FROM competency_assessment_items WHERE company_id=? AND cycle_id=?').all(companyId,competency.id) as Array<{competency_id:string;score:number}>;const actual=new Map(scores.map(x=>[x.competency_id,x.score]));if(requirements.some(r=>!actual.has(r.competency_id)))return {state:'INCOMPLETE_COMPETENCY_ASSESSMENT'};
  const result=calculateJobFit({expectedBehavior:{EXECUTOR:Number(profile.executor),COMUNICADOR:Number(profile.comunicador),PLANEJADOR:Number(profile.planejador),ANALITICO:Number(profile.analitico)},actualBehavior:{EXECUTOR:Number(behavior.executor),COMUNICADOR:Number(behavior.comunicador),PLANEJADOR:Number(behavior.planejador),ANALITICO:Number(behavior.analitico)},behavioralWeight:Number(profile.behavioral_weight),competencyWeight:Number(profile.competency_weight),requirements:requirements.map(r=>({id:r.competency_id,name:r.name,expected:r.expected_level,weight:r.weight,actual:actual.get(r.competency_id)!}))});const id=randomUUID(),at=iso();database.prepare('INSERT INTO job_fit_analyses(id,company_id,employee_id,job_role_id,profile_version_id,behavioral_cycle_id,competency_cycle_id,behavioral_score,competency_score,overall_score,classification,snapshot_json,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,companyId,employeeId,assignment.job_role_id,profile.id,behavior.id,competency.id,result.behavioralScore,result.competencyScore,result.overallScore,result.classification,JSON.stringify(result),userId,at);return {id,state:'AVAILABLE',...result,createdAt:at};
}
export function analyses(companyId:string,employeeId:string){return database.prepare('SELECT id,behavioral_score,competency_score,overall_score,classification,created_at FROM job_fit_analyses WHERE company_id=? AND employee_id=? ORDER BY created_at DESC').all(companyId,employeeId);}

export function dashboard(companyId: string) {
  const totalEmployees = (database.prepare("SELECT COUNT(*) AS count FROM users WHERE company_id=? AND role='EMPLOYEE' AND status='ACTIVE'").get(companyId) as { count: number }).count;
  const latestAnalyses = database.prepare(`
    SELECT employee_id, overall_score, classification, snapshot_json
    FROM (
      SELECT employee_id, overall_score, classification, snapshot_json,
        ROW_NUMBER() OVER (PARTITION BY employee_id ORDER BY created_at DESC, rowid DESC) AS position
      FROM job_fit_analyses
      WHERE company_id=?
    )
    WHERE position=1
  `).all(companyId) as { employee_id: string; overall_score: number; classification: string; snapshot_json: string }[];
  const averageFit = latestAnalyses.length ? Math.round((latestAnalyses.reduce((total, item) => total + Number(item.overall_score), 0) / latestAnalyses.length) * 10) / 10 : null;
  const classifications = new Map<string, number>();
  const gaps = new Map<string, { name: string; count: number }>();
  for (const analysis of latestAnalyses) {
    classifications.set(analysis.classification, (classifications.get(analysis.classification) ?? 0) + 1);
    try {
      const snapshot = JSON.parse(analysis.snapshot_json) as { gaps?: { id: string; name: string }[] };
      for (const gap of snapshot.gaps ?? []) {
        const current = gaps.get(gap.id) ?? { name: gap.name, count: 0 };
        current.count += 1;
        gaps.set(gap.id, current);
      }
    } catch { /* snapshots are immutable; malformed legacy data is simply not aggregated */ }
  }
  const jobCoverage = database.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN active_profile.id IS NOT NULL THEN 1 ELSE 0 END) AS with_active_profile
    FROM job_roles job
    LEFT JOIN job_profile_versions active_profile
      ON active_profile.company_id=job.company_id AND active_profile.job_role_id=job.id AND active_profile.status='ACTIVE'
    WHERE job.company_id=? AND job.active=1
  `).get(companyId) as { total: number; with_active_profile: number | null };
  const withActiveProfile = Number(jobCoverage.with_active_profile ?? 0);
  return {
    totalEmployees,
    analyzedEmployees: latestAnalyses.length,
    insufficientDataEmployees: totalEmployees - latestAnalyses.length,
    averageFit,
    classificationDistribution: [...classifications.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([classification, count]) => ({ classification, count })),
    jobCoverage: { total: Number(jobCoverage.total), withActiveProfile, withoutActiveProfile: Number(jobCoverage.total) - withActiveProfile },
    frequentGaps: [...gaps.entries()].map(([competencyId, item]) => ({ competencyId, name: item.name, count: item.count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}
