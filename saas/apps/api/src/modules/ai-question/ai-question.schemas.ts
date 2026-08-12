const shortString = { type: 'string', minLength: 1, maxLength: 600 } as const;

export const adaptiveQuestionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['question', 'pillar', 'reason', 'shouldContinue'],
  properties: {
    question: { type: 'string', minLength: 8, maxLength: 240 },
    pillar: { type: 'string', minLength: 2, maxLength: 80 },
    reason: { type: 'string', minLength: 4, maxLength: 300 },
    shouldContinue: { type: 'boolean' },
  },
} as const;

export const consultingAnalysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['executiveSummary', 'strengths', 'attentionPoints', 'recommendations'],
  properties: {
    executiveSummary: shortString,
    strengths: { type: 'array', minItems: 1, maxItems: 5, items: shortString },
    attentionPoints: { type: 'array', minItems: 1, maxItems: 5, items: shortString },
    recommendations: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'priority', 'pillar'],
        properties: {
          title: { type: 'string', minLength: 2, maxLength: 160 },
          description: shortString,
          priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          pillar: { type: 'string', minLength: 2, maxLength: 80 },
        },
      },
    },
  },
} as const;
