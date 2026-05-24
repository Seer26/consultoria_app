import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/repositories/auth_repository.dart';
import '../../domain/usecases/login.dart';
import '../state/auth_state.dart';

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._login, this._repository) : super(AuthState.initial()) {
    _bootstrap();
  }

  final Login _login;
  final AuthRepository _repository;

  Future<void> _bootstrap() async {
    final user = await _repository.loadSession();
    if (user != null) {
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: user,
        isLoading: false,
      );
    } else {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        isLoading: false,
      );
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final user = await _login(email, password);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: user,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        error: e.toString(),
        isLoading: false,
      );
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = AuthState.initial().copyWith(status: AuthStatus.unauthenticated);
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}
