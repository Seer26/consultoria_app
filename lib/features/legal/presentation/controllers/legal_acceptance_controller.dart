import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/services/legal_acceptance_service.dart';
import '../../domain/entities/legal_document.dart';
import '../state/legal_acceptance_state.dart';

class LegalAcceptanceController extends StateNotifier<LegalAcceptanceState> {
  LegalAcceptanceController(this._api) : super(LegalAcceptanceState.initial());

  final LegalAcceptanceApi _api;
  int _requestGeneration = 0;

  Future<void> checkPending() async {
    final generation = ++_requestGeneration;
    state = const LegalAcceptanceState(status: LegalAcceptanceStatus.loading);

    try {
      final result = await _api.getStatus();
      if (generation != _requestGeneration) return;
      state = LegalAcceptanceState(
        status: !result.enforcementRequired || result.pendingDocuments.isEmpty
            ? LegalAcceptanceStatus.clear
            : LegalAcceptanceStatus.required,
        enforcementRequired: result.enforcementRequired,
        pendingDocuments: result.pendingDocuments,
      );
    } catch (_) {
      if (generation != _requestGeneration) return;
      state = const LegalAcceptanceState(
        status: LegalAcceptanceStatus.error,
        error:
            'Nao foi possivel verificar os documentos obrigatorios. Tente novamente.',
      );
    }
  }

  Future<void> accept(LegalDocument document) async {
    final currentDocuments = state.pendingDocuments;
    final generation = ++_requestGeneration;
    state = LegalAcceptanceState(
      status: LegalAcceptanceStatus.submitting,
      enforcementRequired: state.enforcementRequired,
      pendingDocuments: currentDocuments,
    );

    try {
      await _api.acceptDocument(document);
      final result = await _api.getStatus();
      if (generation != _requestGeneration) return;
      state = LegalAcceptanceState(
        status: !result.enforcementRequired || result.pendingDocuments.isEmpty
            ? LegalAcceptanceStatus.clear
            : LegalAcceptanceStatus.required,
        enforcementRequired: result.enforcementRequired,
        pendingDocuments: result.pendingDocuments,
      );
    } catch (_) {
      if (generation != _requestGeneration) return;
      state = LegalAcceptanceState(
        status: LegalAcceptanceStatus.error,
        enforcementRequired: state.enforcementRequired,
        pendingDocuments: currentDocuments,
        error:
            'O aceite nao foi registrado. Voce continua nesta tela; tente novamente.',
      );
    }
  }

  void reset() {
    _requestGeneration += 1;
    state = LegalAcceptanceState.initial();
  }
}
