import '../entities/diagnosis_question.dart';

abstract class DiagnosisRepository {
  Future<List<DiagnosisQuestion>> fetchQuestions();
  Future<void> submitAnswers(Map<String, dynamic> payload);
}
