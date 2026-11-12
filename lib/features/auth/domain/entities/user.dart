import 'dart:convert';

class User {
  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.companyId,
    this.company,
    this.department,
    this.jobFunction,
  });

  final String id;
  final String name;
  final String email;
  final String role;
  final String? companyId;
  final Map<String, dynamic>? company;
  final String? department;
  final String? jobFunction;

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'companyId': companyId,
      'company': company,
      'department': department,
      'jobFunction': jobFunction,
    };
  }

  factory User.fromMap(Map<String, dynamic> map) {
    return User(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      email: map['email']?.toString() ?? '',
      role: map['role']?.toString() ?? 'EMPLOYEE',
      companyId: map['companyId']?.toString(),
      department: map['department']?.toString(),
      jobFunction: map['jobFunction']?.toString(),
      company: map['company'] is Map<String, dynamic>
          ? map['company'] as Map<String, dynamic>
          : map['company'] is Map
          ? Map<String, dynamic>.from(map['company'] as Map)
          : null,
    );
  }

  String toJson() => jsonEncode(toMap());

  factory User.fromJson(String source) =>
      User.fromMap(jsonDecode(source) as Map<String, dynamic>);
}
