export const aiDiagnosisJsonSchema = {
  name: 'ai_diagnosis_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['problems', 'questions', 'actions'],
    properties: {
      problems: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['area', 'title', 'description', 'severity'],
          properties: {
            area: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            severity: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
            },
          },
        },
      },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['area', 'question', 'reason'],
          properties: {
            area: { type: 'string' },
            question: { type: 'string' },
            reason: { type: 'string' },
          },
        },
      },
      actions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['area', 'title', 'description', 'priority'],
          properties: {
            area: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            priority: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
            },
          },
        },
      },
    },
  },
} as const;
