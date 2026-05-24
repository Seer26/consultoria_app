import OpenAI from 'openai';
import { env } from '../../config/env';
import { buildNextQuestionPrompt } from './ai-question.prompt';
export class AiQuestionService {
    constructor(client = new OpenAI({
        apiKey: env.aiApiKey,
    })) {
        this.client = client;
    }
    async generateNextQuestion(answer) {
        const normalizedAnswer = answer.trim();
        if (!normalizedAnswer) {
            throw new Error('INVALID_ANSWER');
        }
        if (!env.aiApiKey) {
            throw new Error('AI_API_KEY_NOT_CONFIGURED');
        }
        const prompt = buildNextQuestionPrompt(normalizedAnswer);
        const response = await this.client.responses.create({
            model: env.aiQuestionModel,
            input: prompt,
        });
        const nextQuestion = response.output_text?.trim();
        if (!nextQuestion) {
            throw new Error('EMPTY_AI_RESPONSE');
        }
        return nextQuestion;
    }
}
