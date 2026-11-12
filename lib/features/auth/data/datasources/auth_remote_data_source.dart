import '../models/auth_response_dto.dart';
import '../services/auth_service.dart';

class AuthRemoteDataSource {
  AuthRemoteDataSource({AuthService? authService})
    : _authService = authService ?? AuthService();

  final AuthService _authService;

  Future<AuthResponseDto> login({
    required String email,
    required String password,
  }) {
    return _authService.login(email: email, password: password);
  }

  Future<void> requestPasswordReset({required String email}) {
    return _authService.requestPasswordReset(email: email);
  }

  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) {
    return _authService.resetPassword(token: token, newPassword: newPassword);
  }
}
