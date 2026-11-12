import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../features/auth/domain/entities/user.dart';

abstract class SecureTokenStore {
  Future<void> write(String key, String value);
  Future<String?> read(String key);
  Future<void> delete(String key);
}

class FlutterSecureTokenStore implements SecureTokenStore {
  FlutterSecureTokenStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);

  @override
  Future<String?> read(String key) => _storage.read(key: key);

  @override
  Future<void> delete(String key) => _storage.delete(key: key);
}

class TokenStorage {
  TokenStorage({SecureTokenStore? secureStore})
    : _secureStore = secureStore ?? FlutterSecureTokenStore();

  static const _accessTokenKey = 'access_token';
  static const _sessionUserKey = 'session_user';
  static const _roleKey = 'user_role';
  static const _companyIdKey = 'company_id';
  static const _companyKey = 'company_data';
  final SecureTokenStore _secureStore;

  Future<void> saveToken(String accessToken) async {
    final prefs = await SharedPreferences.getInstance();
    try {
      await _secureStore.write(_accessTokenKey, accessToken);
      await prefs.remove(_accessTokenKey);
    } catch (_) {
      // Fallback controlado para plataformas sem suporte ao armazenamento seguro.
      await prefs.setString(_accessTokenKey, accessToken);
    }
  }

  Future<String?> readAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final secureToken = await _secureStore.read(_accessTokenKey);
      if (secureToken != null && secureToken.isNotEmpty) {
        return secureToken;
      }
    } catch (_) {
      // Continua para o token legado quando a plataforma nao oferece suporte.
    }

    final legacyToken = prefs.getString(_accessTokenKey);
    if (legacyToken == null || legacyToken.isEmpty) {
      return null;
    }

    try {
      await _secureStore.write(_accessTokenKey, legacyToken);
      await prefs.remove(_accessTokenKey);
    } catch (_) {
      // Preserva a sessao legada ate existir armazenamento seguro disponivel.
    }
    return legacyToken;
  }

  Future<void> saveSessionUser(User user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_sessionUserKey, user.toJson());
    await prefs.setString(_roleKey, user.role);

    if (user.companyId != null && user.companyId!.isNotEmpty) {
      await prefs.setString(_companyIdKey, user.companyId!);
    } else {
      await prefs.remove(_companyIdKey);
    }

    if (user.company != null) {
      await prefs.setString(_companyKey, jsonEncode(user.company));
    } else {
      await prefs.remove(_companyKey);
    }
  }

  Future<User?> readSessionUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_sessionUserKey);

    if (raw == null || raw.isEmpty) {
      return null;
    }

    return User.fromJson(raw);
  }

  Future<String?> readRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_roleKey);
  }

  Future<String?> readCompanyId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_companyIdKey);
  }

  Future<Map<String, dynamic>?> readCompany() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_companyKey);

    if (raw == null || raw.isEmpty) {
      return null;
    }

    final decoded = jsonDecode(raw);
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }
    if (decoded is Map) {
      return Map<String, dynamic>.from(decoded);
    }
    return null;
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      await _secureStore.delete(_accessTokenKey);
    } catch (_) {
      // A limpeza do armazenamento legado continua abaixo.
    }
    await prefs.remove(_accessTokenKey);
    await prefs.remove(_sessionUserKey);
    await prefs.remove(_roleKey);
    await prefs.remove(_companyIdKey);
    await prefs.remove(_companyKey);
  }
}
