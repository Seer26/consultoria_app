import '../models/auth_response_dto.dart';
import '../services/auth_service.dart';

class AuthRemoteDataSource {
  AuthRemoteDataSource({
    AuthService? authService,
  }) : _authService = authService ?? AuthService();

  final AuthService _authService;

  Future<AuthResponseDto> login({
    required String email,
    required String password,
  }) {
    return _authService.login(email: email, password: password);
  }
}
