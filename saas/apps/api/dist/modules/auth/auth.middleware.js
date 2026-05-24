import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
const repository = new AuthRepository();
const service = new AuthService(repository);
export function authenticate(request, response, next) {
    const authorizationHeader = request.headers.authorization;
    if (!authorizationHeader?.startsWith('Bearer ')) {
        response.status(401).json({ error: 'TOKEN_REQUIRED' });
        return;
    }
    const token = authorizationHeader.slice('Bearer '.length);
    try {
        const payload = service.verifyToken(token);
        request.auth = payload;
        next();
    }
    catch {
        response.status(401).json({ error: 'INVALID_TOKEN' });
    }
}
export function authorize(...roles) {
    return (request, response, next) => {
        if (!request.auth) {
            response.status(401).json({ error: 'TOKEN_REQUIRED' });
            return;
        }
        if (!roles.includes(request.auth.role)) {
            response.status(403).json({ error: 'FORBIDDEN' });
            return;
        }
        next();
    };
}
