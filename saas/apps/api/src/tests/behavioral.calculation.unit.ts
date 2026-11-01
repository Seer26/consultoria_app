import assert from 'node:assert/strict';
import type { BehavioralQuestion } from '../modules/behavioral/behavioral.types';

process.env.NODE_ENV = 'test';
process.env.ENABLE_DEMO_SEED = 'false';
process.env.JWT_SECRET = 'behavioral-calculation-unit-test-secret';
const { calculateBehavioralResult } = await import('../modules/behavioral/behavioral.service');

const dimensions = ['EXECUTOR', 'COMUNICADOR', 'PLANEJADOR', 'ANALITICO'] as const;
const questions: BehavioralQuestion[] = dimensions.flatMap((dimension, d) =>
  Array.from({ length: 5 }, (_, i) => ({
    id: `question-${d}-${i}`, questionnaireVersion: 1, dimension, text: `Item ${d}-${i}`,
    isReverse: i === 2, position: d * 5 + i + 1, active: true,
  })),
);
const answersFor = (adjusted: number) => questions.map((question) => ({
  questionId: question.id, value: question.isReverse ? 6 - adjusted : adjusted,
}));
assert.deepEqual(calculateBehavioralResult(questions, answersFor(1)), {
  executorScore: 0, comunicadorScore: 0, planejadorScore: 0, analiticoScore: 0, predominantDimension: null,
});
assert.deepEqual(calculateBehavioralResult(questions, answersFor(5)), {
  executorScore: 100, comunicadorScore: 100, planejadorScore: 100, analiticoScore: 100, predominantDimension: null,
});
// Raw values [1,1,1,1,1] have one inverted item: adjusted sum 9 => 20.
assert.equal(calculateBehavioralResult(questions, questions.map((q) => ({ questionId: q.id, value: 1 }))).executorScore, 20);
const unique = answersFor(3);
unique[0].value = 4; // executor adjusted sum 16 => round((16-5)/20*100) = 55.
assert.deepEqual(calculateBehavioralResult(questions, unique), {
  executorScore: 55, comunicadorScore: 50, planejadorScore: 50, analiticoScore: 50, predominantDimension: 'EXECUTOR',
});
unique[5].value = 4;
assert.equal(calculateBehavioralResult(questions, unique).predominantDimension, null);
assert.deepEqual(calculateBehavioralResult([...questions].reverse(), [...unique].reverse()), calculateBehavioralResult(questions, unique));
for (const value of [0, 6, 1.5, NaN, Infinity, '3', null]) {
  const invalid = answersFor(3);
  invalid[0] = { questionId: questions[0].id, value: value as number };
  assert.throws(() => calculateBehavioralResult(questions, invalid), /BEHAVIORAL_INVALID_ANSWER/);
}
assert.throws(() => calculateBehavioralResult(questions, answersFor(3).slice(1)), /BEHAVIORAL_INCOMPLETE_ANSWERS/);
assert.throws(() => calculateBehavioralResult(questions, [...answersFor(3), answersFor(3)[0]]), /BEHAVIORAL_INCOMPLETE_ANSWERS/);
const duplicate = answersFor(3); duplicate[1] = duplicate[0];
assert.throws(() => calculateBehavioralResult(questions, duplicate), /BEHAVIORAL_INVALID_ANSWERS/);
const foreign = answersFor(3); foreign[0].questionId = 'foreign-version-question';
assert.throws(() => calculateBehavioralResult(questions, foreign), /BEHAVIORAL_INVALID_ANSWERS/);
for (const invalid of [
  questions.slice(1),
  questions.map((q, i) => i === 0 ? { ...q, questionnaireVersion: 2 } : q),
  questions.map((q, i) => i === 0 ? { ...q, active: false } : q),
  questions.map((q, i) => i === 0 ? { ...q, dimension: 'ANALITICO' as const } : q),
  questions.map((q, i) => i === 0 ? questions[1] : q),
]) assert.throws(() => calculateBehavioralResult(invalid, answersFor(3)), /BEHAVIORAL_INVALID_CATALOG/);
console.log('Behavioral calculation unit tests passed');
