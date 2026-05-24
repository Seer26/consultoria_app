export class AiQuestionController {
    constructor(service) {
        this.service = service;
        this.create = async (request, response) => {
            try {
                const answer = request.body?.answer;
                if (typeof answer !== 'string') {
                    response.status(400).json({ error: 'INVALID_ANSWER' });
                    return;
                }
                const nextQuestion = await this.service.generateNextQuestion(answer);
                response.status(200).json({ nextQuestion });
            }
            catch (error) {
                const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
                const statusCode = code === 'INVALID_ANSWER' ? 400 : 500;
                response.status(statusCode).json({ error: code });
            }
        };
    }
}
