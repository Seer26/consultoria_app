import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../../../../core/errors/api_error_presenter.dart';
import '../../domain/entities/legal_document.dart';

abstract class LegalAcceptanceApi {
  Future<LegalAcceptanceStatusResult> getStatus();

  Future<void> acceptDocument(LegalDocument document);
}

class LegalAcceptanceService implements LegalAcceptanceApi {
  LegalAcceptanceService(this._dio);

  final Dio _dio;

  @override
  Future<LegalAcceptanceStatusResult> getStatus() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/legal/documents/pending',
      );
      final pending = response.data?['pending'];
      final enforcementRequired = response.data?['enforcementRequired'];
      if (pending is! List || enforcementRequired is! bool) {
        throw const FormatException('Resposta juridica invalida.');
      }

      final documents = pending
          .whereType<Map>()
          .map((item) => LegalDocument.fromMap(Map<String, dynamic>.from(item)))
          .toList();
      return LegalAcceptanceStatusResult(
        enforcementRequired: enforcementRequired,
        pendingDocuments: documents,
      );
    } on DioException catch (error) {
      throw Exception(_friendlyMessage(error));
    } on FormatException catch (error) {
      throw Exception(error.message);
    }
  }

  @override
  Future<void> acceptDocument(LegalDocument document) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/legal/acceptances',
        data: {
          'documentType': document.documentType,
          'documentVersion': document.version,
          'origin': kIsWeb ? 'FLUTTER_WEB' : 'FLUTTER_APP',
        },
      );
    } on DioException catch (error) {
      throw Exception(_friendlyMessage(error));
    }
  }

  String _friendlyMessage(DioException error) {
    final data = error.response?.data;
    final code = data is Map ? data['error']?.toString() : null;
    if (code == 'INVALID_LEGAL_DOCUMENT_VERSION') {
      return 'Este documento foi atualizado. Recarregue para revisar a versao mais recente.';
    }
    if (error.response?.statusCode == 401) {
      return 'Sua sessao expirou. Saia e entre novamente.';
    }
    return dioErrorMessage(
      error,
      fallback:
          'Nao foi possivel consultar ou registrar o aceite. Tente novamente.',
    );
  }
}
