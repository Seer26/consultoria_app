class AppConfig {
  static const String environment = String.fromEnvironment(
    'ENV',
    defaultValue: 'development',
  );
  
  static bool get isDevelopment => environment == 'development';
  static bool get isProduction => environment == 'production';
  static bool get isStaging => environment == 'staging';
  
  // API URLs por ambiente
  static String get baseUrl {
    switch (environment) {
      case 'production':
        return 'https://api.consultoria.com/v1';
      case 'staging':
        return 'https://staging-api.consultoria.com/v1';
      default:
        return 'http://localhost:8000/v1';
    }
  }
  
  // Feature Flags
  static const bool enableAnalytics = true;
  static const bool enableCrashReporting = true;
  static const bool enablePushNotifications = true;
}

