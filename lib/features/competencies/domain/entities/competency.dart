class Competency {
  const Competency({
    required this.id,
    required this.name,
    required this.description,
    required this.scope,
    required this.status,
    this.companyId,
    this.category,
  });
  final String id, name, description, scope, status;
  final String? companyId, category;
  bool get isSystem => scope == 'SYSTEM';
  bool get isActive => status == 'ACTIVE';
  factory Competency.fromMap(Map<String, dynamic> map) => Competency(
    id: map['id'] as String,
    name: map['name'] as String,
    description: map['description'] as String,
    scope: map['scope'] as String,
    status: map['status'] as String,
    companyId: map['companyId'] as String?,
    category: map['category'] as String?,
  );
}
