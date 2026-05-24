export class AiDiagnosisError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AiDiagnosisError';
  }
}

export function isAiDiagnosisError(error: unknown): error is AiDiagnosisError {
  return error instanceof AiDiagnosisError;
}
