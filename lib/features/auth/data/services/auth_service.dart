import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../domain/entities/user.dart';
import '../models/auth_response_dto.dart';

class AuthService {
  AuthService({
    http.Client? client,
    String? baseUrl,
  })  : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? 'http://127.0.0.1:3000';

  final http.Client _client;
  final String _baseUrl;

  Future<AuthResponseDto> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _client.post(
        Uri.parse('$_baseUrl/auth/login'),
        headers: const {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception('Login falhou: ${response.body}');
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
      throw Exception('Nao foi possivel autenticar: $error');
    }
  }
}
