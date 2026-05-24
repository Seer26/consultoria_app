import '../repositories/diagnosis_repository.dart';

class SubmitDiagnosis {
  const SubmitDiagnosis(this.repository);

  final DiagnosisRepository repository;

  Future<void> call(Map<String, dynamic> payload) {
    return repository.submitAnswers(payload);
  }
}
