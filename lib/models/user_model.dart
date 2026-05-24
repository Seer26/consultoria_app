/// DTO simples alinhado ao contrato de sessão (token + role + nome).
/// O app também usa [User] em `features/auth/domain/entities/user.dart`;
/// use este modelo quando precisar espelhar exatamente o JSON do backend legado.
class UserModel {
  const UserModel({
    required this.token,
    required this.role,
    required this.name,
  });

  final String token;
  final String role;
  final String name;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      token: json['token']?.toString() ?? '',
      role: json['role']?.toString() ?? 'EMPLOYEE',
      name: json['name']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'token': token,
        'role': role,
        'name': name,
      };
}
