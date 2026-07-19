import 'package:dio/dio.dart';

import '../../../../core/http/plan_limit_error_mapper.dart';
import '../../../billing/data/services/current_plan_service.dart';
import '../../domain/entities/company_account.dart';
import '../../domain/entities/company_user_account.dart';

class SaasPlanOption {
  const SaasPlanOption({
    required this.id,
    required this.slug,
    required this.name,
    required this.description,
    required this.limits,
  });

  final String id;
  final String slug;
  final String name;
  final String? description;
  final Map<String, int> limits;
}

class SubscriptionPlanEvent {
  const SubscriptionPlanEvent({
    required this.id,
    required this.previousPlanName,
    required this.newPlanName,
    required this.actorUserName,
    required this.actorUserEmail,
    required this.origin,
    required this.reason,
    required this.createdAt,
  });

  final String id;
  final String? previousPlanName;
  final String newPlanName;
  final String? actorUserName;
  final String? actorUserEmail;
  final String origin;
  final String? reason;
  final DateTime? createdAt;
}

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

  Future<List<SaasPlanOption>> fetchPlans() async {
    final response = await _dio.get<List<dynamic>>('/billing/admin/plans');
    final data = response.data ?? const [];

    return data
        .whereType<Map>()
        .map((item) => _planFromMap(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<CurrentPlanSnapshot> fetchCompanyPlan(String companyId) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/billing/admin/companies/$companyId/current-plan',
    );

    return CurrentPlanSnapshot.fromMap(response.data ?? const {});
  }

  Future<CurrentPlanSnapshot> updateCompanyPlan({
    required String companyId,
    required String planSlug,
    String? reason,
  }) async {
    final response = await _dio.put<Map<String, dynamic>>(
      '/billing/admin/companies/$companyId/plan',
      data: {
        'planSlug': planSlug,
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    );

    return CurrentPlanSnapshot.fromMap(response.data ?? const {});
  }

  Future<List<SubscriptionPlanEvent>> fetchCompanyPlanEvents(
    String companyId,
  ) async {
    final response = await _dio.get<List<dynamic>>(
      '/billing/admin/companies/$companyId/plan-events',
    );
    final data = response.data ?? const [];

    return data
        .whereType<Map>()
        .map((item) => _planEventFromMap(Map<String, dynamic>.from(item)))
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

  Future<CompanyAccount> createCompanyWithOwner({
    required String companyName,
    String? slug,
    required String ownerName,
    required String ownerEmail,
    required String ownerPassword,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/companies/onboarding',
      data: {
        'company': {
          'name': companyName,
          if (slug != null && slug.trim().isNotEmpty) 'slug': slug.trim(),
        },
        'owner': {
          'name': ownerName,
          'email': ownerEmail,
          'password': ownerPassword,
        },
      },
    );

    final data = response.data ?? const {};
    return _companyFromMap(
      Map<String, dynamic>.from(data['company'] as Map? ?? const {}),
    );
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
      data: {'status': _companyStatusToApi(status)},
    );

    return _companyFromMap(response.data ?? const {});
  }

  Future<List<CompanyUserAccount>> fetchCompanyUsers(String companyId) async {
    final response = await _dio.get<List<dynamic>>(
      '/companies/$companyId/users',
    );
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
    try {
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
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao criar usuario.'),
      );
    }
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
        if (password != null && password.trim().isNotEmpty)
          'password': password.trim(),
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
      data: {'status': _userStatusToApi(status)},
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
      createdAt:
          DateTime.tryParse(map['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      updatedAt:
          DateTime.tryParse(map['updatedAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  SaasPlanOption _planFromMap(Map<String, dynamic> map) {
    final limits = map['limits'];
    final parsedLimits = <String, int>{};
    if (limits is Map) {
      for (final entry in limits.entries) {
        parsedLimits[entry.key.toString()] =
            (entry.value as num?)?.toInt() ?? 0;
      }
    }

    return SaasPlanOption(
      id: map['id']?.toString() ?? '',
      slug: map['slug']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      description: map['description']?.toString(),
      limits: parsedLimits,
    );
  }

  SubscriptionPlanEvent _planEventFromMap(Map<String, dynamic> map) {
    return SubscriptionPlanEvent(
      id: map['id']?.toString() ?? '',
      previousPlanName: map['previousPlanName']?.toString(),
      newPlanName: map['newPlanName']?.toString() ?? '',
      actorUserName: map['actorUserName']?.toString(),
      actorUserEmail: map['actorUserEmail']?.toString(),
      origin: map['origin']?.toString() ?? '',
      reason: map['reason']?.toString(),
      createdAt: DateTime.tryParse(map['createdAt']?.toString() ?? ''),
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
      createdAt:
          DateTime.tryParse(map['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      updatedAt:
          DateTime.tryParse(map['updatedAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  CompanyAccountStatus _companyStatusFromApi(String? value) {
    return value == 'INACTIVE'
        ? CompanyAccountStatus.inactive
        : CompanyAccountStatus.active;
  }

  CompanyUserStatus _userStatusFromApi(String? value) {
    return value == 'INACTIVE'
        ? CompanyUserStatus.inactive
        : CompanyUserStatus.active;
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

  String _extractError(DioException error, {required String fallback}) {
    final planLimitMessage = planLimitMessageFromResponseData(
      error.response?.data,
    );
    if (planLimitMessage != null) {
      return planLimitMessage;
    }

    final data = error.response?.data;
    if (data is Map && data['error'] != null) {
      return data['error'].toString();
    }

    return fallback;
  }
}
