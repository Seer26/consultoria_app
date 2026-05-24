import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/failure.dart';
import '../../domain/entities/diagnosis_question.dart';
import '../../domain/repositories/diagnosis_repository.dart';
import '../datasources/diagnosis_remote_data_source.dart';

class DiagnosisRepositoryImpl implements DiagnosisRepository {
  DiagnosisRepositoryImpl(this.remoteDataSource);

  final DiagnosisRemoteDataSource remoteDataSource;

  @override
  Future<List<DiagnosisQuestion>> fetchQuestions() async {
    try {
      return remoteDataSource.fetchQuestions();
    } catch (e) {
      throw ServerFailure('Falha ao carregar diagnostico: $e');
    }
  }

  @override
  Future<void> submitAnswers(Map<String, dynamic> payload) {
    return remoteDataSource.submitAnswers(payload);
  }
}

final diagnosisRepositoryProvider = Provider<DiagnosisRepository>((ref) {
  return DiagnosisRepositoryImpl(DiagnosisRemoteDataSource());
});
