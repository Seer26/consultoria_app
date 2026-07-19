import '../constants/app_constants.dart';

class AppConfig {
  static const String environment = String.fromEnvironment(
    'ENV',
    defaultValue: 'development',
  );

  static bool get isDevelopment => environment == 'development';
  static bool get isProduction => environment == 'production';
  static bool get isStaging => environment == 'staging';

  // Mantido por compatibilidade. O fluxo principal usa AppConstants.baseUrl,
  // configurado por --dart-define=API_BASE_URL.
  static String get baseUrl => AppConstants.baseUrl;

  // Feature Flags
  static const bool enableAnalytics = true;
  static const bool enableCrashReporting = true;
  static const bool enablePushNotifications = true;
}
