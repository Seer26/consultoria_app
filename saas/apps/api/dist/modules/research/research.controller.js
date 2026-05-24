export class ResearchController {
    constructor(service) {
        this.service = service;
        this.createSubmission = async (request, response) => {
            try {
                const result = await this.service.createSubmission(request.auth, request.body);
                response.status(201).json(result);
            }
            catch (error) {
                this.handleError(error, response);
            }
        };
        this.addAnswer = async (request, response) => {
            try {
                const result = await this.service.addAnswer(request.auth, this.getParam(request, 'id'), request.body);
                response.status(201).json(result);
            }
            catch (error) {
                this.handleError(error, response);
            }
        };
        this.completeSubmission = async (request, response) => {
            try {
                const result = await this.service.completeSubmission(request.auth, this.getParam(request, 'id'), request.body ?? {});
                response.status(200).json(result);
            }
            catch (error) {
                this.handleError(error, response);
            }
        };
        this.listSubmissions = (request, response) => {
            try {
                const companyId = Array.isArray(request.query.companyId)
                    ? request.query.companyId[0]
                    : request.query.companyId;
                const result = this.service.listSubmissions(request.auth, {
                    companyId: typeof companyId === 'string' ? companyId : undefined,
                });
                response.status(200).json(result);
            }
            catch (error) {
                this.handleError(error, response);
            }
        };
        this.getSubmissionById = (request, response) => {
            try {
                const result = this.service.getSubmissionById(request.auth, this.getParam(request, 'id'));
                response.status(200).json(result);
            }
            catch (error) {
                this.handleError(error, response);
            }
        };
    }
    getParam(request, key) {
        const value = request.params[key];
        return Array.isArray(value) ? value[0] : value;
    }
    handleError(error, response) {
        const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        const statusCode = (() => {
            switch (code) {
                case 'INVALID_RESEARCH_SUBMISSION_PAYLOAD':
                case 'INVALID_RESEARCH_ANSWER_PAYLOAD':
                case 'COMPANY_ID_REQUIRED':
                case 'RESEARCH_ALREADY_COMPLETED':
                case 'RESEARCH_ANSWERS_REQUIRED':
                case 'USER_COMPANY_MISMATCH':
                    return 400;
                case 'FORBIDDEN':
                    return 403;
                case 'USER_NOT_FOUND':
                case 'COMPANY_NOT_FOUND':
                case 'RESEARCH_SUBMISSION_NOT_FOUND':
                    return 404;
                case 'INACTIVE_USER':
                    return 409;
                default:
                    return 500;
            }
        })();
        response.status(statusCode).json({ error: code });
    }
}
