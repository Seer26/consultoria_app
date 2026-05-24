enum CompanyAccountStatus { active, inactive }

class CompanyAccount {
  const CompanyAccount({
    required this.id,
    required this.name,
    required this.slug,
    required this.status,
    required this.userCount,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final String slug;
  final CompanyAccountStatus status;
  final int userCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  CompanyAccount copyWith({
    String? id,
    String? name,
    String? slug,
    CompanyAccountStatus? status,
    int? userCount,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return CompanyAccount(
      id: id ?? this.id,
      name: name ?? this.name,
      slug: slug ?? this.slug,
      status: status ?? this.status,
      userCount: userCount ?? this.userCount,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
