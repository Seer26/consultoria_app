import '../entities/user.dart';

abstract class AuthRepository {
  Future<User> login({required String email, required String password});

  Future<void> logout();
  Future<void> requestPasswordReset({required String email});
  Future<void> resetPassword({
    required String token,
    required String newPassword,
  });
  Future<User?> loadSession();
}
