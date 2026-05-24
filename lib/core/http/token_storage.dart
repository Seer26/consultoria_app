import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

import '../../features/auth/domain/entities/user.dart';

class TokenStorage {
  static const _accessTokenKey = 'access_token';
  static const _sessionUserKey = 'session_user';
  static const _roleKey = 'user_role';
  static const _companyIdKey = 'company_id';
  static const _companyKey = 'company_data';

  Future<void> saveToken(String accessToken) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accessTokenKey, accessToken);
  }

  Future<String?> readAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_accessTokenKey);
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
    await prefs.remove(_accessTokenKey);
    await prefs.remove(_sessionUserKey);
    await prefs.remove(_roleKey);
    await prefs.remove(_companyIdKey);
    await prefs.remove(_companyKey);
  }
}
