import '../../../../core/errors/failure.dart';
import '../../../../core/errors/api_error_presenter.dart';
import '../../../../core/http/token_storage.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_data_source.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl({
    required this.remoteDataSource,
    required this.tokenStorage,
  });

  final AuthRemoteDataSource remoteDataSource;
  final TokenStorage tokenStorage;

  @override
  Future<User> login({required String email, required String password}) async {
    try {
      final dto = await remoteDataSource.login(
        email: email,
        password: password,
      );
      await tokenStorage.saveToken(dto.accessToken);
      await tokenStorage.saveSessionUser(dto.user);
      return dto.user;
    } on AuthFailure {
      rethrow;
    } catch (e) {
      throw AuthFailure(
        userFriendlyError(
          e,
          fallback: 'Nao foi possivel iniciar sessao. Tente novamente.',
        ),
      );
    }
  }

  @override
  Future<void> logout() async {
    await tokenStorage.clear();
  }

  @override
  Future<void> requestPasswordReset({required String email}) {
    return remoteDataSource.requestPasswordReset(email: email);
  }

  @override
  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) {
    return remoteDataSource.resetPassword(
      token: token,
      newPassword: newPassword,
    );
  }

  @override
  Future<User?> loadSession() async {
    final token = await tokenStorage.readAccessToken();
    if (token == null) return null;
    final cachedUser = await tokenStorage.readSessionUser();
    if (cachedUser != null) {
      return cachedUser;
    }
    return null;
  }
}
