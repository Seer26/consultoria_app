import 'package:dio/dio.dart';

class DashboardService {
  DashboardService(this._dio);

  final Dio _dio;

  Future<Map<String, dynamic>> getAdminDashboard() async {
    return _get('/admin/overview');
  }

  Future<Map<String, dynamic>> getOwnerDashboard() async {
    return _get('/company/dashboard');
  }

  Future<Map<String, dynamic>> getEmployeeDashboard() async {
    return _get('/employee/dashboard');
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
      final message = error.response?.data?.toString() ?? error.message ?? 'Falha desconhecida';
      throw Exception('Falha ao carregar dashboard: $message');
    } catch (error) {
      throw Exception('Falha ao carregar dashboard: $error');
    }
  }
}
