import 'package:dio/dio.dart';

import '../../../../core/errors/api_error_presenter.dart';

class TeamMember {
  const TeamMember({
    required this.id,
    required this.name,
    required this.email,
    required this.status,
    required this.department,
    required this.jobFunction,
  });
  final String id;
  final String name;
  final String email;
  final String status;
  final String department;
  final String jobFunction;

  factory TeamMember.fromMap(Map<String, dynamic> map) => TeamMember(
    id: map['id']?.toString() ?? '',
    name: map['name']?.toString() ?? '',
    email: map['email']?.toString() ?? '',
    status: map['status']?.toString() ?? 'INACTIVE',
    department: map['department']?.toString() ?? '',
    jobFunction: map['jobFunction']?.toString() ?? '',
  );
}

class TeamService {
  TeamService(this._dio);
  final Dio _dio;

  Future<List<TeamMember>> list() async {
    try {
      final response = await _dio.get<List<dynamic>>('/company/team');
      return (response.data ?? const [])
          .whereType<Map>()
          .map((item) => TeamMember.fromMap(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw Exception(_message(error));
    }
  }

  Future<void> create(Map<String, dynamic> data) async {
    try {
      await _dio.post('/company/team', data: data);
    } on DioException catch (error) {
      throw Exception(_message(error));
    }
  }

  Future<void> update(String id, Map<String, dynamic> data) async {
    try {
      await _dio.put('/company/team/$id', data: data);
    } on DioException catch (error) {
      throw Exception(_message(error));
    }
  }

  Future<void> setStatus(String id, String status) async {
    try {
      await _dio.patch('/company/team/$id/status', data: {'status': status});
    } on DioException catch (error) {
      throw Exception(_message(error));
    }
  }

  String _message(DioException error) {
    final data = error.response?.data;
    final code = data is Map ? data['error']?.toString() : null;
    return switch (code) {
      'EMAIL_ALREADY_IN_USE' => 'Este e-mail ja esta em uso.',
      'EMPLOYEE_PROFILE_REQUIRED' =>
        'Preencha nome, e-mail, departamento e funcao.',
      'WEAK_PASSWORD' ||
      'PASSWORD_TOO_SHORT' => 'A senha nao atende a politica de seguranca.',
      'PLAN_LIMIT_REACHED' => 'O limite de usuarios do plano foi atingido.',
      'FORBIDDEN' => 'Apenas o OWNER pode gerenciar a propria equipe.',
      _ => dioErrorMessage(
        error,
        fallback: 'Nao foi possivel concluir a operacao da equipe.',
      ),
    };
  }
}
