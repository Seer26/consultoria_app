class AppException implements Exception {
  final String message;
  final int? statusCode;

  AppException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

class NetworkException extends AppException {
  NetworkException(super.message, [super.statusCode]);
}

class AuthenticationException extends AppException {
  AuthenticationException(super.message, [super.statusCode]);
}

class ValidationException extends AppException {
  ValidationException(super.message);
}

class ServerException extends AppException {
  ServerException(super.message, [super.statusCode]);
}

