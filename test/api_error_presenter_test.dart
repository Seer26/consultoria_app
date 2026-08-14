import 'package:consultoria_app/core/errors/api_error_presenter.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('apresentacao centralizada de erros', () {
    test('traduz codigos conhecidos sem expo-los', () {
      final error = DioException(
        requestOptions: RequestOptions(path: '/auth/login'),
        response: Response<dynamic>(
          requestOptions: RequestOptions(path: '/auth/login'),
          statusCode: 401,
          data: const {'error': 'INVALID_CREDENTIALS'},
        ),
      );

      final message = userFriendlyError(error);
      expect(message, 'E-mail ou senha invalidos.');
      expect(message, isNot(contains('INVALID_CREDENTIALS')));
    });

    test('traduz falha de conexao', () {
      final error = DioException.connectionError(
        requestOptions: RequestOptions(path: '/dashboard/company'),
        reason: 'Network Error',
      );

      expect(userFriendlyError(error), contains('Verifique sua conexao'));
    });

    test('preserva mensagem de dominio e bloqueia detalhe tecnico', () {
      expect(
        userFriendlyError(Exception('A pesquisa ja foi finalizada.')),
        'A pesquisa ja foi finalizada.',
      );
      expect(
        userFriendlyError(Exception('DioException: statusCode 500')),
        'Nao foi possivel concluir a operacao. Tente novamente.',
      );
    });
  });
}
