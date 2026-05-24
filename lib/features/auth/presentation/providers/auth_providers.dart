import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../data/datasources/auth_remote_data_source.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/usecases/login.dart';
import '../controllers/auth_controller.dart';
import '../state/auth_state.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final storage = ref.read(tokenStorageProvider);
  return AuthRepositoryImpl(
    remoteDataSource: AuthRemoteDataSource(),
    tokenStorage: storage,
  );
});

final loginUseCaseProvider = Provider<Login>((ref) {
  return Login(ref.read(authRepositoryProvider));
});

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(
    ref.read(loginUseCaseProvider),
    ref.read(authRepositoryProvider),
  );
});
