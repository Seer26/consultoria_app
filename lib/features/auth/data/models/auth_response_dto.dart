import '../../domain/entities/user.dart';

class AuthResponseDto {
  AuthResponseDto({required this.user, required this.accessToken});

  final User user;
  final String accessToken;
}
