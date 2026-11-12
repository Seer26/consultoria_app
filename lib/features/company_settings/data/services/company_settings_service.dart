import 'package:dio/dio.dart';

class CompanySettings {
  const CompanySettings({
    required this.id,
    required this.name,
    required this.slug,
    required this.status,
    required this.sector,
    required this.size,
    required this.phone,
    required this.responsibleName,
    required this.notes,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final String slug;
  final String status;
  final String? sector;
  final String? size;
  final String? phone;
  final String? responsibleName;
  final String? notes;
  final DateTime? updatedAt;

  factory CompanySettings.fromMap(Map<String, dynamic> map) {
    return CompanySettings(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      slug: map['slug']?.toString() ?? '',
      status: map['status']?.toString() ?? '',
      sector: map['sector']?.toString(),
      size: map['size']?.toString(),
      phone: map['phone']?.toString(),
      responsibleName: map['responsibleName']?.toString(),
      notes: map['notes']?.toString(),
      updatedAt: DateTime.tryParse(map['updatedAt']?.toString() ?? ''),
    );
  }
}

class UpdateCompanySettingsInput {
  const UpdateCompanySettingsInput({
    required this.name,
    this.sector,
    this.size,
    this.phone,
    this.responsibleName,
    this.notes,
  });

  final String name;
  final String? sector;
  final String? size;
  final String? phone;
  final String? responsibleName;
  final String? notes;

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'sector': sector,
      'size': size,
      'phone': phone,
      'responsibleName': responsibleName,
      'notes': notes,
    };
  }
}

class CompanySettingsService {
  CompanySettingsService(this._dio);

  final Dio _dio;

  Future<CompanySettings> getSettings() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/company/settings',
      );
      return CompanySettings.fromMap(response.data ?? const {});
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao carregar configuracoes.'),
      );
    }
  }

  Future<CompanySettings> updateSettings(
    UpdateCompanySettingsInput input,
  ) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        '/company/settings',
        data: input.toMap(),
      );
      return CompanySettings.fromMap(response.data ?? const {});
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao salvar configuracoes.'),
      );
    }
  }

  String _extractError(DioException error, {required String fallback}) {
    final data = error.response?.data;
    if (data is Map && data['error'] != null) {
      switch (data['error'].toString()) {
        case 'INVALID_COMPANY_NAME':
          return 'Informe um nome fantasia valido.';
        case 'COMPANY_ID_REQUIRED':
          return 'Nao foi possivel identificar a empresa do usuario.';
        case 'COMPANY_NOT_FOUND':
          return 'Empresa nao encontrada.';
        case 'FORBIDDEN':
          return 'Apenas OWNER pode alterar estas configuracoes.';
      }
    }

    return fallback;
  }
}
