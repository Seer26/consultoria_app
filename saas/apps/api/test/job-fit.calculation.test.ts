import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateJobFit } from '../src/modules/job-fit/job-fit.calculation';

const expectedBehavior = { EXECUTOR: 70, COMUNICADOR: 80, PLANEJADOR: 60, ANALITICO: 65 };
const actualBehavior = { EXECUTOR: 72, COMUNICADOR: 65, PLANEJADOR: 75, ANALITICO: 70 };

test('calculates deterministic weighted adherence, classification, gaps and strengths', () => {
  const result = calculateJobFit({
    expectedBehavior, actualBehavior, behavioralWeight: 40, competencyWeight: 60,
    requirements: [
      { id: 'sales', name: 'Negociação', expected: 5, weight: 3, actual: 3 },
      { id: 'communication', name: 'Comunicação', expected: 4, weight: 2, actual: 5 },
      { id: 'organization', name: 'Organização', expected: 3, weight: 1, actual: 3 },
    ],
  });
  assert.equal(result.behavioralScore, 90.8);
  assert.equal(result.competencyScore, 80);
  assert.equal(result.overallScore, 84.3);
  assert.equal(result.classification, 'ADERENCIA_ALTA');
  assert.deepEqual(result.gaps.map(gap => [gap.id, gap.difference, gap.criticality]), [['sales', 2, 'ALTA']]);
  assert.deepEqual(result.strengths.map(strength => strength.id), ['communication', 'organization']);
});

test('does not penalize competency above expected and treats zero expected safely', () => {
  const result = calculateJobFit({
    expectedBehavior, actualBehavior: expectedBehavior, behavioralWeight: 50, competencyWeight: 50,
    requirements: [{ id: 'optional', name: 'Opcional', expected: 0, weight: 1, actual: 0 }, { id: 'above', name: 'Acima', expected: 3, weight: 2, actual: 5 }],
  });
  assert.equal(result.competencyScore, 100);
  assert.equal(result.overallScore, 100);
  assert.equal(result.classification, 'ADERENCIA_MUITO_ALTA');
});

test('rejects invalid general and requirement weights', () => {
  assert.throws(() => calculateJobFit({ expectedBehavior, actualBehavior, behavioralWeight: 30, competencyWeight: 60, requirements: [] }), /FIT_WEIGHTS_INVALID/);
  assert.throws(() => calculateJobFit({ expectedBehavior, actualBehavior, behavioralWeight: 50, competencyWeight: 50, requirements: [{ id: 'bad', name: 'Ruim', expected: 3, weight: 0, actual: 1 }] }), /FIT_REQUIREMENT_INVALID/);
});
