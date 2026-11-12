import 'package:dio/dio.dart';

import '../constants/app_constants.dart';
import 'token_storage.dart';

class DioClient {
  DioClient({Dio? dio, required this.tokenStorage})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: AppConstants.baseUrl,
              connectTimeout: const Duration(seconds: 20),
              receiveTimeout: const Duration(seconds: 20),
            ),
          ) {
    _dio.interceptors.add(_AuthInterceptor(tokenStorage: tokenStorage));
  }

  final Dio _dio;
  final TokenStorage tokenStorage;

  Dio get client => _dio;
}

class _AuthInterceptor extends Interceptor {
  _AuthInterceptor({required this.tokenStorage});

  final TokenStorage tokenStorage;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await tokenStorage.readAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      await tokenStorage.clear();
    }
    handler.next(err);
  }
}
