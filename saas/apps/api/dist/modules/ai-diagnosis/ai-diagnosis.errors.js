export class AiDiagnosisError extends Error {
    constructor(code, statusCode, message) {
        super(message ?? code);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AiDiagnosisError';
    }
}
export function isAiDiagnosisError(error) {
    return error instanceof AiDiagnosisError;
}
