import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../../core/constants/app_constants.dart';
import '../../domain/entities/user.dart';
import '../models/auth_response_dto.dart';

class AuthService {
  AuthService({http.Client? client, String? baseUrl})
    : _client = client ?? http.Client(),
      _baseUrl = baseUrl ?? AppConstants.baseUrl;

  final http.Client _client;
  final String _baseUrl;

  Future<AuthResponseDto> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _client.post(
        Uri.parse('$_baseUrl/auth/login'),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception(_messageFromErrorResponse(response.body));
      }

      final decoded = jsonDecode(response.body);

      if (decoded is! Map<String, dynamic>) {
        throw Exception('Resposta invalida do servidor.');
      }

      final userMap = decoded['user'];
      final token = decoded['token'];
      final companyMap = decoded['company'];

      if (userMap is! Map<String, dynamic> || token is! String) {
        throw Exception('Payload de autenticacao invalido.');
      }

      final normalizedUser = Map<String, dynamic>.from(userMap);
      if (companyMap is Map<String, dynamic>) {
        normalizedUser['company'] = companyMap;
      } else if (companyMap is Map) {
        normalizedUser['company'] = Map<String, dynamic>.from(companyMap);
      }

      return AuthResponseDto(
        user: User.fromMap(normalizedUser),
        accessToken: token,
      );
    } catch (error) {
      final raw = error.toString().replaceFirst('Exception: ', '');
      if (raw.contains('XMLHttpRequest') ||
          raw.contains('ClientException') ||
          raw.contains('SocketException')) {
        throw Exception(
          'API indisponivel. Verifique sua conexao ou tente novamente em instantes.',
        );
      }
      throw Exception(raw);
    }
  }

  Future<void> requestPasswordReset({required String email}) async {
    try {
      final response = await _client.post(
        Uri.parse('$_baseUrl/auth/password/forgot'),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception(
          'Nao foi possivel solicitar a recuperacao agora. Tente novamente.',
        );
      }
    } catch (error) {
      final raw = error.toString().replaceFirst('Exception: ', '');
      if (raw.contains('XMLHttpRequest') ||
          raw.contains('ClientException') ||
          raw.contains('SocketException')) {
        throw Exception(
          'API indisponivel. Verifique sua conexao e tente novamente.',
        );
      }
      throw Exception(raw);
    }
  }

  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    try {
      final response = await _client.post(
        Uri.parse('$_baseUrl/auth/password/reset'),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({'token': token, 'newPassword': newPassword}),
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        String code = '';
        try {
          final decoded = jsonDecode(response.body);
          if (decoded is Map) code = decoded['error']?.toString() ?? '';
        } catch (_) {
          // Usa mensagem generica abaixo.
        }
        if (code == 'WEAK_PASSWORD') {
          throw Exception(
            'Use ao menos 8 caracteres e evite somente numeros, seu email ou senhas comuns.',
          );
        }
        if (code == 'INVALID_OR_EXPIRED_RESET_TOKEN') {
          throw Exception('Este link e invalido, expirou ou ja foi utilizado.');
        }
        throw Exception(
          'Nao foi possivel redefinir a senha. Solicite um novo link.',
        );
      }
    } catch (error) {
      final raw = error.toString().replaceFirst('Exception: ', '');
      if (raw.contains('XMLHttpRequest') ||
          raw.contains('ClientException') ||
          raw.contains('SocketException')) {
        throw Exception(
          'API indisponivel. Verifique sua conexao e tente novamente.',
        );
      }
      throw Exception(raw);
    }
  }

  String _messageFromErrorResponse(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map && decoded['error'] != null) {
        switch (decoded['error'].toString()) {
          case 'INVALID_CREDENTIALS':
            return 'Email ou senha invalidos.';
          case 'INACTIVE_USER':
            return 'Seu usuario esta inativo. Fale com o administrador.';
          case 'INACTIVE_COMPANY':
            return 'Sua empresa esta inativa. Fale com o administrador.';
          case 'COMPANY_NOT_FOUND':
            return 'Empresa vinculada ao usuario nao foi encontrada.';
        }
      }
    } catch (_) {
      // Mantem fallback abaixo.
    }

    return 'Nao foi possivel iniciar sessao. Tente novamente.';
  }
}
