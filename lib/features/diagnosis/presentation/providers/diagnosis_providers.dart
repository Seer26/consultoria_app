import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/datasources/diagnosis_remote_data_source.dart';
import '../../data/repositories/diagnosis_repository_impl.dart';
import '../../domain/entities/diagnosis_question.dart';
import '../../domain/repositories/diagnosis_repository.dart';
import '../../domain/usecases/get_questions.dart';
import '../../domain/usecases/submit_diagnosis.dart';
import '../controllers/diagnosis_controller.dart';

final diagnosisRepositoryProvider = Provider<DiagnosisRepository>((ref) {
  return DiagnosisRepositoryImpl(DiagnosisRemoteDataSource());
});

final getQuestionsProvider = Provider<GetQuestions>((ref) {
  return GetQuestions(ref.read(diagnosisRepositoryProvider));
});

final submitDiagnosisProvider = Provider<SubmitDiagnosis>((ref) {
  return SubmitDiagnosis(ref.read(diagnosisRepositoryProvider));
});

final diagnosisControllerProvider = StateNotifierProvider<DiagnosisController, AsyncValue<List<DiagnosisQuestion>>>(
  (ref) {
    return DiagnosisController(
      ref.read(getQuestionsProvider),
      ref.read(submitDiagnosisProvider),
    );
  },
);
