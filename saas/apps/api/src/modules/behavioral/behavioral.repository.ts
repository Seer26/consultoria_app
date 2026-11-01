import { dataSource, type DataSource } from '../../database/data-source';
import type {
  BehavioralAnswer, BehavioralAssessment, BehavioralListFilters, BehavioralListItem,
  BehavioralQuestion, BehavioralStoredResult, BehavioralUser,
} from './behavioral.types';

type BehavioralDataSource = Pick<DataSource, 'one' | 'many' | 'execute' | 'transaction'>;
type AssessmentRow = {
  id: string; company_id: string; user_id: string; status: BehavioralAssessment['status'];
  questionnaire_version: number; started_at: string; completed_at: string | null; created_at: string;
};
const mapAssessment = (row: AssessmentRow): BehavioralAssessment => ({
  id: row.id, companyId: row.company_id, userId: row.user_id, status: row.status,
  questionnaireVersion: row.questionnaire_version, startedAt: row.started_at,
  completedAt: row.completed_at, createdAt: row.created_at,
});

export class BehavioralRepository {
  constructor(private readonly source: BehavioralDataSource = dataSource) {}

  transaction<T>(operation: () => Promise<T>): Promise<T> { return this.source.transaction(operation); }

  async findUser(id: string, lock = false): Promise<BehavioralUser | null> {
    // Serialize starts and membership changes on the same user, including PostgreSQL.
    if (lock) await this.source.execute('UPDATE users SET id = id WHERE id = ?', [id]);
    const row = await this.source.one<{ id: string; name: string; role: BehavioralUser['role']; company_id: string | null; status: BehavioralUser['status'] }>(
      'SELECT id, name, role, company_id, status FROM users WHERE id = ?', [id],
    );
    return row ? { id: row.id, name: row.name, role: row.role, companyId: row.company_id, status: row.status } : null;
  }

  async companyExists(id: string): Promise<boolean> {
    return Boolean(await this.source.one('SELECT id FROM companies WHERE id = ?', [id]));
  }

  async findCurrent(userId: string): Promise<BehavioralAssessment | null> {
    const row = await this.source.one<AssessmentRow>("SELECT * FROM behavioral_assessments WHERE user_id = ? AND status = 'IN_PROGRESS'", [userId]);
    return row ? mapAssessment(row) : null;
  }

  async findAssessment(id: string, lock = false): Promise<BehavioralAssessment | null> {
    // Both saving and completing acquire this lock before reading answers/status.
    if (lock) await this.source.execute('UPDATE behavioral_assessments SET status = status WHERE id = ?', [id]);
    const row = await this.source.one<AssessmentRow>('SELECT * FROM behavioral_assessments WHERE id = ?', [id]);
    return row ? mapAssessment(row) : null;
  }

  async activeVersion(): Promise<number | null> {
    const row = await this.source.one<{ version: number }>('SELECT version FROM behavioral_questionnaires WHERE active = TRUE ORDER BY version DESC LIMIT 1');
    return row?.version ?? null;
  }

  async questions(version: number, activeOnly = true): Promise<BehavioralQuestion[]> {
    const rows = await this.source.many<{
      id: string; questionnaire_version: number; dimension: BehavioralQuestion['dimension'];
      text: string; is_reverse: boolean | number; position: number; active: boolean | number;
    }>(`SELECT * FROM behavioral_questions WHERE questionnaire_version = ? ${activeOnly ? 'AND active = TRUE' : ''} ORDER BY position`, [version]);
    return rows.map((row) => ({
      id: row.id, questionnaireVersion: row.questionnaire_version, dimension: row.dimension,
      text: row.text, isReverse: Boolean(row.is_reverse), position: row.position, active: Boolean(row.active),
    }));
  }

  async createAssessment(input: BehavioralAssessment): Promise<void> {
    await this.source.execute(`INSERT INTO behavioral_assessments
      (id, company_id, user_id, status, questionnaire_version, started_at, completed_at, created_at)
      VALUES (@id, @companyId, @userId, @status, @questionnaireVersion, @startedAt, @completedAt, @createdAt)`, input);
  }

  async answers(assessmentId: string): Promise<BehavioralAnswer[]> {
    const rows = await this.source.many<{
      id: string; assessment_id: string; question_id: string; value: number; created_at: string; updated_at: string;
    }>('SELECT * FROM behavioral_answers WHERE assessment_id = ? ORDER BY question_id', [assessmentId]);
    return rows.map((row) => ({ id: row.id, assessmentId: row.assessment_id, questionId: row.question_id,
      value: row.value, createdAt: row.created_at, updatedAt: row.updated_at }));
  }

  async saveAnswer(input: BehavioralAnswer): Promise<void> {
    const result = await this.source.execute(`INSERT INTO behavioral_answers
      (id, assessment_id, question_id, value, created_at, updated_at)
      SELECT @id, @assessmentId, @questionId, @value, @createdAt, @updatedAt
      FROM behavioral_assessments WHERE id = @assessmentId AND status = 'IN_PROGRESS'
      ON CONFLICT (assessment_id, question_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, input);
    if (result.changes !== 1) throw new Error('BEHAVIORAL_ASSESSMENT_COMPLETED');
  }

  async storeCompletion(result: BehavioralStoredResult): Promise<void> {
    await this.source.execute(`INSERT INTO behavioral_results
      (assessment_id, executor_score, comunicador_score, planejador_score, analitico_score, predominant_dimension, calculated_at)
      VALUES (@assessmentId, @executorScore, @comunicadorScore, @planejadorScore, @analiticoScore, @predominantDimension, @calculatedAt)`, result);
    const update = await this.source.execute(`UPDATE behavioral_assessments SET status = 'COMPLETED', completed_at = ?
      WHERE id = ? AND status = 'IN_PROGRESS'`, [result.calculatedAt, result.assessmentId]);
    if (update.changes !== 1) throw new Error('BEHAVIORAL_ASSESSMENT_COMPLETED');
  }

  async result(assessmentId: string): Promise<BehavioralStoredResult | null> {
    const row = await this.source.one<{
      assessment_id: string; executor_score: number; comunicador_score: number; planejador_score: number;
      analitico_score: number; predominant_dimension: BehavioralStoredResult['predominantDimension']; calculated_at: string;
    }>('SELECT * FROM behavioral_results WHERE assessment_id = ?', [assessmentId]);
    return row ? { assessmentId: row.assessment_id, executorScore: row.executor_score, comunicadorScore: row.comunicador_score,
      planejadorScore: row.planejador_score, analiticoScore: row.analitico_score,
      predominantDimension: row.predominant_dimension, calculatedAt: row.calculated_at } : null;
  }

  async list(companyId: string, filters: BehavioralListFilters = {}): Promise<BehavioralListItem[]> {
    const params: string[] = [companyId];
    const conditions = ['a.company_id = ?', 'u.company_id = a.company_id'];
    if (filters.userId) { conditions.push('a.user_id = ?'); params.push(filters.userId); }
    if (filters.status) { conditions.push('a.status = ?'); params.push(filters.status); }
    const rows = await this.source.many<AssessmentRow & {
      user_name: string; user_role: BehavioralUser['role']; answered_count: number; total_questions: number;
    }>(`SELECT a.*, u.name AS user_name, u.role AS user_role,
      (SELECT COUNT(*) FROM behavioral_answers ba WHERE ba.assessment_id = a.id) AS answered_count,
      (SELECT COUNT(*) FROM behavioral_questions bq WHERE bq.questionnaire_version = a.questionnaire_version AND bq.active = TRUE) AS total_questions
      FROM behavioral_assessments a JOIN users u ON u.id = a.user_id
      WHERE ${conditions.join(' AND ')} ORDER BY a.created_at DESC, a.id DESC`, params);
    return rows.map((row) => ({ ...mapAssessment(row), userName: row.user_name, userRole: row.user_role,
      answeredCount: Number(row.answered_count), totalQuestions: Number(row.total_questions) }));
  }
}
