import '../entities/diagnosis_question.dart';
import '../repositories/diagnosis_repository.dart';

class GetQuestions {
  const GetQuestions(this.repository);

  final DiagnosisRepository repository;

  Future<List<DiagnosisQuestion>> call() => repository.fetchQuestions();
}
