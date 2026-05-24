import { isAiDiagnosisError } from './ai-diagnosis.errors';
export class AiDiagnosisController {
    constructor(service) {
        this.service = service;
        this.create = async (request, response) => {
            try {
                const result = await this.service.execute(request.body);
                response.status(200).json(result);
            }
            catch (error) {
                if (isAiDiagnosisError(error)) {
                    response.status(error.statusCode).json({
                        error: error.code,
                        message: error.message,
                    });
                    return;
                }
                response.status(500).json({
                    error: 'UNKNOWN_ERROR',
                    message: 'Erro inesperado ao processar o diagnostico.',
                });
            }
        };
    }
}
