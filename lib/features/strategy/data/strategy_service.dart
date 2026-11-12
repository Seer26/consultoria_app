import 'package:dio/dio.dart';
import '../../../core/errors/api_error_presenter.dart';

class StrategyService {
  StrategyService(this._dio);
  final Dio _dio;

  Future<Map<String, dynamic>> fetch({String? companyId}) async =>
      _get('/strategy', companyId);
  Future<List<Map<String, dynamic>>> assignees({String? companyId}) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/strategy/assignees',
        queryParameters: {if (companyId != null) 'companyId': companyId},
      );
      return (response.data ?? const [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (e) {
      throw Exception(userFriendlyError(e));
    }
  }

  Future<void> saveProfile(Map<String, dynamic> value) =>
      _send('PUT', '/strategy/profile', value);
  Future<void> createObjective(Map<String, dynamic> value) =>
      _send('POST', '/strategy/objectives', value);
  Future<void> updateObjective(String id, Map<String, dynamic> value) =>
      _send('PUT', '/strategy/objectives/$id', value);
  Future<void> createGoal(String objectiveId, Map<String, dynamic> value) =>
      _send('POST', '/strategy/objectives/$objectiveId/goals', value);
  Future<void> updateGoal(String id, Map<String, dynamic> value) =>
      _send('PUT', '/strategy/goals/$id', value);
  Future<void> createSwot(Map<String, dynamic> value) =>
      _send('POST', '/strategy/swot', value);
  Future<void> updateSwot(String id, Map<String, dynamic> value) =>
      _send('PUT', '/strategy/swot/$id', value);
  Future<void> deleteSwot(String id, {String? companyId}) async {
    try {
      await _dio.delete(
        '/strategy/swot/$id',
        queryParameters: {if (companyId != null) 'companyId': companyId},
      );
    } catch (e) {
      throw Exception(userFriendlyError(e));
    }
  }

  Future<Map<String, dynamic>> _get(String path, String? companyId) async {
    try {
      final r = await _dio.get<Map<String, dynamic>>(
        path,
        queryParameters: {if (companyId != null) 'companyId': companyId},
      );
      return r.data ?? {};
    } catch (e) {
      throw Exception(userFriendlyError(e));
    }
  }

  Future<void> _send(
    String method,
    String path,
    Map<String, dynamic> data,
  ) async {
    try {
      await _dio.request(
        path,
        data: data,
        options: Options(method: method),
      );
    } catch (e) {
      throw Exception(userFriendlyError(e));
    }
  }
}
