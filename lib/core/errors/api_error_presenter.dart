import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';

import '../http/plan_limit_error_mapper.dart';

/// Converte falhas tecnicas e codigos da API em mensagens seguras para a UI.
///
/// O erro original continua disponivel para logs, mas nunca deve ser exibido
/// diretamente ao usuario.
String userFriendlyError(
  Object error, {
  String fallback = 'Nao foi possivel concluir a operacao. Tente novamente.',
}) {
  if (error is DioException) {
    return dioErrorMessage(error, fallback: fallback);
  }

  if (error is TimeoutException) {
    return _timeoutMessage;
  }

  if (error is SocketException) {
    return _networkMessage;
  }

  final raw = error
      .toString()
      .replaceFirst(RegExp(r'^Exception:\s*'), '')
      .trim();
  if (_looksLikeNetworkError(raw)) return _networkMessage;
  if (_looksLikeTimeout(raw)) return _timeoutMessage;

  final mapped = apiCodeMessage(raw);
  if (mapped != null) return mapped;

  // Preserva mensagens de dominio ja traduzidas, mas bloqueia detalhes
  // reconhecidamente tecnicos, codigos internos e respostas HTTP brutas.
  if (raw.isNotEmpty && !_looksTechnical(raw)) return raw;
  return fallback;
}

String dioErrorMessage(
  DioException error, {
  String fallback = 'Nao foi possivel concluir a operacao. Tente novamente.',
  Map<String, String> codeMessages = const {},
}) {
  if (_isTimeout(error)) return _timeoutMessage;
  if (_isConnectionFailure(error)) return _networkMessage;

  final data = error.response?.data;
  final planLimit = planLimitMessageFromResponseData(data);
  if (planLimit != null) return planLimit;

  final code = _readApiCode(data);
  if (code != null) {
    final customMessage = codeMessages[code];
    if (customMessage != null) return customMessage;
    final mapped = apiCodeMessage(code);
    if (mapped != null) return mapped;
  }

  final statusCode = error.response?.statusCode;
  if (statusCode != null && statusCode >= 500) {
    return 'O servidor encontrou um problema. Tente novamente em instantes.';
  }

  return switch (statusCode) {
    400 || 422 => 'Revise os dados informados e tente novamente.',
    401 => 'Sua sessao expirou. Entre novamente.',
    403 => 'Voce nao tem permissao para realizar esta acao.',
    404 => 'O registro solicitado nao foi encontrado.',
    409 =>
      'Nao foi possivel concluir porque os dados foram alterados. Atualize a pagina e tente novamente.',
    429 =>
      'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.',
    _ => fallback,
  };
}

String? apiCodeMessage(String code) => _apiCodeMessages[code.trim()];

const _networkMessage =
    'Nao foi possivel conectar ao servidor. Verifique sua conexao e tente novamente.';
const _timeoutMessage =
    'A operacao demorou mais que o esperado. Tente novamente.';

const _apiCodeMessages = <String, String>{
  'INVALID_CREDENTIALS': 'E-mail ou senha invalidos.',
  'TOKEN_REQUIRED': 'Sua sessao expirou. Entre novamente.',
  'INVALID_TOKEN': 'Sua sessao expirou. Entre novamente.',
  'TOKEN_EXPIRED': 'Sua sessao expirou. Entre novamente.',
  'UNAUTHORIZED': 'Sua sessao expirou. Entre novamente.',
  'FORBIDDEN': 'Voce nao tem permissao para realizar esta acao.',
  'PLAN_LIMIT_REACHED': 'O limite disponivel no seu plano foi atingido.',
  'VALIDATION_ERROR': 'Revise os dados informados e tente novamente.',
  'BAD_REQUEST': 'Revise os dados informados e tente novamente.',
  'INTERNAL_ERROR':
      'O servidor encontrou um problema. Tente novamente em instantes.',
  'INTERNAL_SERVER_ERROR':
      'O servidor encontrou um problema. Tente novamente em instantes.',
  'INACTIVE_USER': 'Seu usuario esta inativo. Fale com o administrador.',
  'INACTIVE_COMPANY': 'Sua empresa esta inativa. Fale com o administrador.',
  'COMPANY_NOT_FOUND': 'A empresa solicitada nao foi encontrada.',
  'COMPANY_ID_REQUIRED': 'Nao foi possivel identificar a empresa do usuario.',
  'EMAIL_ALREADY_IN_USE': 'Este e-mail ja esta em uso.',
  'WEAK_PASSWORD': 'A senha nao atende aos requisitos de seguranca.',
  'PASSWORD_TOO_SHORT': 'A senha nao atende aos requisitos de seguranca.',
  'INVALID_OR_EXPIRED_RESET_TOKEN':
      'Este link e invalido, expirou ou ja foi utilizado.',
  'RESEARCH_SUBMISSION_NOT_FOUND': 'A pesquisa nao foi encontrada.',
  'REPORT_NOT_FOUND': 'O relatorio nao foi encontrado.',
  'PLAN_NOT_FOUND': 'O plano da empresa nao foi encontrado.',
};

String? _readApiCode(dynamic data) {
  if (data is Map) {
    return data['error']?.toString() ?? data['code']?.toString();
  }
  return null;
}

bool _isTimeout(DioException error) =>
    error.type == DioExceptionType.connectionTimeout ||
    error.type == DioExceptionType.sendTimeout ||
    error.type == DioExceptionType.receiveTimeout;

bool _isConnectionFailure(DioException error) =>
    error.type == DioExceptionType.connectionError ||
    error.error is SocketException ||
    _looksLikeNetworkError(error.message ?? '');

bool _looksLikeNetworkError(String value) {
  final lower = value.toLowerCase();
  return lower.contains('socketexception') ||
      lower.contains('clientexception') ||
      lower.contains('xmlhttprequest') ||
      lower.contains('connection refused') ||
      lower.contains('failed host lookup') ||
      lower.contains('network error');
}

bool _looksLikeTimeout(String value) {
  final lower = value.toLowerCase();
  return lower.contains('timeoutexception') || lower.contains('timed out');
}

bool _looksTechnical(String value) {
  final lower = value.toLowerCase();
  return RegExp(r'^[A-Z][A-Z0-9_]+$').hasMatch(value) ||
      lower.contains('dioexception') ||
      lower.contains('exception:') ||
      lower.contains('stack trace') ||
      lower.contains('statuscode') ||
      lower.contains('<!doctype') ||
      lower.contains('sql') ||
      lower.contains('/auth/') ||
      lower.contains('/api/');
}
