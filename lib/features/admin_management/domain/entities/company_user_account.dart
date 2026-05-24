enum CompanyUserRole { owner, employee }
enum CompanyUserStatus { active, inactive }

class CompanyUserAccount {
  const CompanyUserAccount({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.companyId,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final String email;
  final CompanyUserRole role;
  final String companyId;
  final CompanyUserStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;

  CompanyUserAccount copyWith({
    String? id,
    String? name,
    String? email,
    CompanyUserRole? role,
    String? companyId,
    CompanyUserStatus? status,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return CompanyUserAccount(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role ?? this.role,
      companyId: companyId ?? this.companyId,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
