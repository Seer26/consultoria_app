class AppConstants {
  static const String environment = String.fromEnvironment(
    'APP_ENV',
    defaultValue: String.fromEnvironment('ENV', defaultValue: 'development'),
  );

  // API
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:3000',
  );
  static const String apiTimeout = '30s';

  static const bool _showDemoCredentialsFlag = bool.fromEnvironment(
    'SHOW_DEMO_CREDENTIALS',
    defaultValue: false,
  );

  static bool get showDemoCredentials =>
      (environment == 'development' || environment == 'demo') &&
      _showDemoCredentialsFlag;

  // Storage Keys
  static const String tokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'user_data';
  static const String companyKey = 'company_data';

  // App Info
  static const String appName = 'Consultoria Empresarial';
  static const String appVersion = '1.0.0';

  // Colors
  static const int primaryColor = 0xFF283593;
  static const int secondaryColor = 0xFF1976D2;
  static const int accentColor = 0xFF00ACC1;

  // Pagination
  static const int itemsPerPage = 20;

  // Date Formats
  static const String dateFormat = 'dd/MM/yyyy';
  static const String dateTimeFormat = 'dd/MM/yyyy HH:mm';
  static const String timeFormat = 'HH:mm';
}
