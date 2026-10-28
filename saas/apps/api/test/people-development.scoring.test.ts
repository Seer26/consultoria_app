import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateBehavioralResult } from '../src/modules/people-development/people-development.scoring';

test('normalizes Likert answers and preserves a predominant-dimension tie', () => {
  const result = calculateBehavioralResult([
    { dimension: 'EXECUTOR', value: 5, weight: 1, reversed: false },
    { dimension: 'COMUNICADOR', value: 1, weight: 1, reversed: true },
    { dimension: 'PLANEJADOR', value: 3, weight: 1, reversed: false },
    { dimension: 'ANALITICO', value: 4, weight: 1, reversed: false },
  ]);
  assert.deepEqual(result.scores, { EXECUTOR: 100, COMUNICADOR: 100, PLANEJADOR: 50, ANALITICO: 75 });
  assert.equal(result.predominant, 'EXECUTOR / COMUNICADOR');
  assert.equal(result.secondary, 'ANALITICO');
});

test('rejects empty and out-of-range answers', () => {
  assert.throws(() => calculateBehavioralResult([]), /BEHAVIORAL_ANSWERS_REQUIRED/);
  assert.throws(() => calculateBehavioralResult([{ dimension: 'EXECUTOR', value: 6, weight: 1, reversed: false }]), /BEHAVIORAL_ANSWER_INVALID/);
});
