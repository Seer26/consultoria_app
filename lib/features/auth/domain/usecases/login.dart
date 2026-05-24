import '../entities/user.dart';
import '../repositories/auth_repository.dart';

class Login {
  const Login(this.repository);

  final AuthRepository repository;

  Future<User> call(String email, String password) {
    return repository.login(email: email, password: password);
  }
}
