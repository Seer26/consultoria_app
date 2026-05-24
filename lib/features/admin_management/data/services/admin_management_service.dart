import 'package:dio/dio.dart';

import '../../domain/entities/company_account.dart';
import '../../domain/entities/company_user_account.dart';

class AdminManagementService {
  AdminManagementService(this._dio);

  final Dio _dio;

  Future<List<CompanyAccount>> fetchCompanies() async {
    final response = await _dio.get<List<dynamic>>('/companies');
    final data = response.data ?? const [];

    return data
        .whereType<Map>()
        .map((item) => _companyFromMap(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<CompanyAccount> createCompany({
    required String name,
    String? slug,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/companies',
      data: {
        'name': name,
        if (slug != null && slug.trim().isNotEmpty) 'slug': slug.trim(),
      },
    );

    return _companyFromMap(response.data ?? const {});
  }

  Future<CompanyAccount> updateCompany({
    required String id,
    required String name,
    String? slug,
  }) async {
    final response = await _dio.put<Map<String, dynamic>>(
      '/companies/$id',
      data: {
        'name': name,
        if (slug != null && slug.trim().isNotEmpty) 'slug': slug.trim(),
      },
    );

    return _companyFromMap(response.data ?? const {});
  }

  Future<CompanyAccount> updateCompanyStatus({
    required String id,
    required CompanyAccountStatus status,
  }) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      '/companies/$id/status',
      data: {
        'status': _companyStatusToApi(status),
      },
    );

    return _companyFromMap(response.data ?? const {});
  }

  Future<List<CompanyUserAccount>> fetchCompanyUsers(String companyId) async {
    final response = await _dio.get<List<dynamic>>('/companies/$companyId/users');
    final data = response.data ?? const [];

    return data
        .whereType<Map>()
        .map((item) => _userFromMap(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<CompanyUserAccount> createCompanyUser({
    required String companyId,
    required String name,
    required String email,
    required String password,
    required CompanyUserRole role,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/companies/$companyId/users',
      data: {
        'name': name,
        'email': email,
        'password': password,
        'role': _userRoleToApi(role),
      },
    );

    return _userFromMap(response.data ?? const {});
  }

  Future<CompanyUserAccount> updateUser({
    required String userId,
    required String name,
    required String email,
    required CompanyUserRole role,
    String? password,
  }) async {
    final response = await _dio.put<Map<String, dynamic>>(
      '/users/$userId',
      data: {
        'name': name,
        'email': email,
        'role': _userRoleToApi(role),
        if (password != null && password.trim().isNotEmpty) 'password': password.trim(),
      },
    );

    return _userFromMap(response.data ?? const {});
  }

  Future<CompanyUserAccount> updateUserStatus({
    required String userId,
    required CompanyUserStatus status,
  }) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      '/users/$userId/status',
      data: {
        'status': _userStatusToApi(status),
      },
    );

    return _userFromMap(response.data ?? const {});
  }

  CompanyAccount _companyFromMap(Map<String, dynamic> map) {
    return CompanyAccount(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      slug: map['slug']?.toString() ?? '',
      status: _companyStatusFromApi(map['status']?.toString()),
      userCount: (map['userCount'] as num?)?.toInt() ?? 0,
      createdAt: DateTime.tryParse(map['createdAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(map['updatedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  CompanyUserAccount _userFromMap(Map<String, dynamic> map) {
    return CompanyUserAccount(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      email: map['email']?.toString() ?? '',
      role: _userRoleFromApi(map['role']?.toString()),
      companyId: map['companyId']?.toString() ?? '',
      status: _userStatusFromApi(map['status']?.toString()),
      createdAt: DateTime.tryParse(map['createdAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(map['updatedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  CompanyAccountStatus _companyStatusFromApi(String? value) {
    return value == 'INACTIVE'
        ? CompanyAccountStatus.inactive
        : CompanyAccountStatus.active;
  }

  CompanyUserStatus _userStatusFromApi(String? value) {
    return value == 'INACTIVE' ? CompanyUserStatus.inactive : CompanyUserStatus.active;
  }

  CompanyUserRole _userRoleFromApi(String? value) {
    return value == 'OWNER' ? CompanyUserRole.owner : CompanyUserRole.employee;
  }

  String _companyStatusToApi(CompanyAccountStatus status) {
    return status == CompanyAccountStatus.active ? 'ACTIVE' : 'INACTIVE';
  }

  String _userStatusToApi(CompanyUserStatus status) {
    return status == CompanyUserStatus.active ? 'ACTIVE' : 'INACTIVE';
  }

  String _userRoleToApi(CompanyUserRole role) {
    return role == CompanyUserRole.owner ? 'OWNER' : 'EMPLOYEE';
  }
}
