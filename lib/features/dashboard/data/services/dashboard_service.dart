import 'package:dio/dio.dart';

import '../../../../core/errors/api_error_presenter.dart';

class DashboardService {
  DashboardService(this._dio);

  final Dio _dio;

  Future<Map<String, dynamic>> getAdminDashboard() async {
    return _get('/dashboard/admin');
  }

  Future<Map<String, dynamic>> getOwnerDashboard() async {
    return _get('/dashboard/company');
  }

  Future<Map<String, dynamic>> getEmployeeDashboard() async {
    return _get('/dashboard/employee');
  }

  Future<Map<String, dynamic>> _get(String path) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(path);
      final data = response.data;

      if (data == null) {
        throw Exception('Resposta vazia da API.');
      }

      return data;
    } on DioException catch (error) {
      throw Exception(
        dioErrorMessage(
          error,
          fallback: 'Nao foi possivel carregar o painel. Tente novamente.',
        ),
      );
    } catch (error) {
      throw Exception(
        userFriendlyError(
          error,
          fallback: 'Nao foi possivel carregar o painel. Tente novamente.',
        ),
      );
    }
  }
}
