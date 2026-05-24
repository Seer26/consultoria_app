export class AuthController {
    constructor(service) {
        this.service = service;
        this.register = async (request, response) => {
            try {
                const result = await this.service.register(request.body);
                response.status(201).json(result);
            }
            catch (error) {
                this.handleError(error, response);
            }
        };
        this.login = async (request, response) => {
            try {
                const result = await this.service.login(request.body);
                response.status(200).json(result);
            }
            catch (error) {
                this.handleError(error, response);
            }
        };
    }
    handleError(error, response) {
        const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        const statusCode = (() => {
            switch (code) {
                case 'INVALID_REGISTER_PAYLOAD':
                case 'PASSWORD_TOO_SHORT':
                case 'INVALID_ROLE':
                case 'COMPANY_ID_REQUIRED':
                    return 400;
                case 'EMAIL_ALREADY_IN_USE':
                    return 409;
                case 'INVALID_CREDENTIALS':
                    return 401;
                default:
                    return 500;
            }
        })();
        response.status(statusCode).json({ error: code });
    }
}
