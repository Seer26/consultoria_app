import 'package:dio/dio.dart';

class ChangePasswordService {
  ChangePasswordService(this._dio);

  final Dio _dio;

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await _dio.put<Map<String, dynamic>>(
        '/auth/password',
        data: {'currentPassword': currentPassword, 'newPassword': newPassword},
      );
    } on DioException catch (error) {
      final data = error.response?.data;
      final code = data is Map ? data['error']?.toString() : null;
      switch (code) {
        case 'CURRENT_PASSWORD_INVALID':
          throw Exception('A senha atual informada esta incorreta.');
        case 'WEAK_PASSWORD':
          throw Exception(
            'Use ao menos 8 caracteres e evite somente numeros, seu email ou senhas comuns.',
          );
        case 'PASSWORD_UNCHANGED':
          throw Exception('A nova senha deve ser diferente da senha atual.');
        case 'INACTIVE_USER':
          throw Exception(
            'Seu usuario esta inativo. Fale com o administrador.',
          );
        case 'LEGAL_ACCEPTANCE_REQUIRED':
          throw Exception(
            'Conclua o aceite dos documentos obrigatorios antes de continuar.',
          );
      }
      if (error.response?.statusCode == 401) {
        throw Exception('Sua sessao expirou. Entre novamente.');
      }
      if (error.response == null) {
        throw Exception(
          'API indisponivel. Verifique sua conexao e tente novamente.',
        );
      }
      throw Exception('Nao foi possivel alterar a senha. Tente novamente.');
    }
  }
}
