import '../../domain/entities/legal_document.dart';

enum LegalAcceptanceStatus {
  unknown,
  loading,
  required,
  clear,
  submitting,
  error,
}

class LegalAcceptanceState {
  const LegalAcceptanceState({
    required this.status,
    this.enforcementRequired = false,
    this.pendingDocuments = const [],
    this.error,
  });

  final LegalAcceptanceStatus status;
  final bool enforcementRequired;
  final List<LegalDocument> pendingDocuments;
  final String? error;

  bool get isChecking =>
      status == LegalAcceptanceStatus.unknown ||
      status == LegalAcceptanceStatus.loading;

  bool get blocksApp =>
      status == LegalAcceptanceStatus.required ||
      status == LegalAcceptanceStatus.submitting ||
      status == LegalAcceptanceStatus.error;

  bool get isSubmitting => status == LegalAcceptanceStatus.submitting;

  factory LegalAcceptanceState.initial() =>
      const LegalAcceptanceState(status: LegalAcceptanceStatus.unknown);
}
