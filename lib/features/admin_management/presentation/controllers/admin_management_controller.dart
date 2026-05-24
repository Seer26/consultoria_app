import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/services/admin_management_service.dart';
import '../../domain/entities/company_account.dart';
import '../../domain/entities/company_user_account.dart';

class AdminManagementState {
  const AdminManagementState({
    this.companies = const [],
    this.selectedCompanyId,
    this.companyUsers = const [],
    this.isLoadingCompanies = false,
    this.isLoadingUsers = false,
    this.isSaving = false,
    this.error,
  });

  final List<CompanyAccount> companies;
  final String? selectedCompanyId;
  final List<CompanyUserAccount> companyUsers;
  final bool isLoadingCompanies;
  final bool isLoadingUsers;
  final bool isSaving;
  final String? error;

  CompanyAccount? get selectedCompany {
    if (selectedCompanyId == null) {
      return null;
    }

    for (final company in companies) {
      if (company.id == selectedCompanyId) {
        return company;
      }
    }

    return null;
  }

  AdminManagementState copyWith({
    List<CompanyAccount>? companies,
    String? selectedCompanyId,
    bool clearSelectedCompanyId = false,
    List<CompanyUserAccount>? companyUsers,
    bool? isLoadingCompanies,
    bool? isLoadingUsers,
    bool? isSaving,
    String? error,
    bool clearError = false,
  }) {
    return AdminManagementState(
      companies: companies ?? this.companies,
      selectedCompanyId: clearSelectedCompanyId
          ? null
          : selectedCompanyId ?? this.selectedCompanyId,
      companyUsers: companyUsers ?? this.companyUsers,
      isLoadingCompanies: isLoadingCompanies ?? this.isLoadingCompanies,
      isLoadingUsers: isLoadingUsers ?? this.isLoadingUsers,
      isSaving: isSaving ?? this.isSaving,
      error: clearError ? null : error ?? this.error,
    );
  }
}

class AdminManagementController extends StateNotifier<AdminManagementState> {
  AdminManagementController(this._service)
      : super(const AdminManagementState(isLoadingCompanies: true)) {
    loadCompanies();
  }

  final AdminManagementService _service;

  Future<void> loadCompanies({String? selectCompanyId}) async {
    state = state.copyWith(
      isLoadingCompanies: true,
      clearError: true,
    );

    try {
      final companies = await _service.fetchCompanies();
      final selectedId = _resolveSelectedCompanyId(companies, selectCompanyId);

      state = state.copyWith(
        companies: companies,
        selectedCompanyId: selectedId,
        companyUsers: selectedId == state.selectedCompanyId ? state.companyUsers : const [],
        isLoadingCompanies: false,
      );

      if (selectedId != null) {
        await loadUsers(selectedId);
      } else {
        state = state.copyWith(companyUsers: const []);
      }
    } catch (error) {
      state = state.copyWith(
        isLoadingCompanies: false,
        error: 'Falha ao carregar empresas: $error',
      );
    }
  }

  Future<void> selectCompany(String companyId) async {
    state = state.copyWith(
      selectedCompanyId: companyId,
      companyUsers: const [],
      isLoadingUsers: true,
      clearError: true,
    );
    await loadUsers(companyId);
  }

  Future<void> createCompany({
    required String name,
    String? slug,
  }) async {
    await _save(() async {
      final company = await _service.createCompany(name: name, slug: slug);
      await loadCompanies(selectCompanyId: company.id);
    });
  }

  Future<void> updateCompany({
    required String id,
    required String name,
    String? slug,
  }) async {
    await _save(() async {
      await _service.updateCompany(id: id, name: name, slug: slug);
      await loadCompanies(selectCompanyId: id);
    });
  }

  Future<void> toggleCompanyStatus(CompanyAccount company) async {
    await _save(() async {
      final nextStatus = company.status == CompanyAccountStatus.active
          ? CompanyAccountStatus.inactive
          : CompanyAccountStatus.active;
      await _service.updateCompanyStatus(id: company.id, status: nextStatus);
      await loadCompanies(selectCompanyId: company.id);
    });
  }

  Future<void> createUser({
    required String companyId,
    required String name,
    required String email,
    required String password,
    required CompanyUserRole role,
  }) async {
    await _save(() async {
      await _service.createCompanyUser(
        companyId: companyId,
        name: name,
        email: email,
        password: password,
        role: role,
      );
      await loadCompanies(selectCompanyId: companyId);
    });
  }

  Future<void> updateUser({
    required String userId,
    required String name,
    required String email,
    required CompanyUserRole role,
    String? password,
  }) async {
    await _save(() async {
      await _service.updateUser(
        userId: userId,
        name: name,
        email: email,
        role: role,
        password: password,
      );
      final companyId = state.selectedCompanyId;
      if (companyId != null) {
        await loadCompanies(selectCompanyId: companyId);
      }
    });
  }

  Future<void> toggleUserStatus(CompanyUserAccount user) async {
    await _save(() async {
      final nextStatus = user.status == CompanyUserStatus.active
          ? CompanyUserStatus.inactive
          : CompanyUserStatus.active;
      await _service.updateUserStatus(userId: user.id, status: nextStatus);
      final companyId = state.selectedCompanyId;
      if (companyId != null) {
        await loadCompanies(selectCompanyId: companyId);
      }
    });
  }

  Future<void> loadUsers(String companyId) async {
    state = state.copyWith(
      isLoadingUsers: true,
      clearError: true,
    );

    try {
      final users = await _service.fetchCompanyUsers(companyId);
      state = state.copyWith(
        companyUsers: users,
        isLoadingUsers: false,
      );
    } catch (error) {
      state = state.copyWith(
        companyUsers: const [],
        isLoadingUsers: false,
        error: 'Falha ao carregar usuarios: $error',
      );
    }
  }

  Future<void> _save(Future<void> Function() action) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      await action();
      state = state.copyWith(isSaving: false);
    } catch (error) {
      state = state.copyWith(
        isSaving: false,
        error: '$error',
      );
      rethrow;
    }
  }

  String? _resolveSelectedCompanyId(
    List<CompanyAccount> companies,
    String? preferredId,
  ) {
    if (companies.isEmpty) {
      return null;
    }

    final candidate = preferredId ?? state.selectedCompanyId;
    if (candidate != null) {
      for (final company in companies) {
        if (company.id == candidate) {
          return candidate;
        }
      }
    }

    return companies.first.id;
  }
}
