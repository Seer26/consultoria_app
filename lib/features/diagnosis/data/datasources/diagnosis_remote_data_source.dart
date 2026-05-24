import '../../domain/entities/diagnosis_question.dart';

class DiagnosisRemoteDataSource {
  Future<List<DiagnosisQuestion>> fetchQuestions() async {
    await Future.delayed(const Duration(milliseconds: 300));
    return const [
      DiagnosisQuestion(
        id: 'q1',
        title: 'Estrategia',
        description: 'Qual o nivel de clareza da estrategia atual?',
        type: QuestionType.score,
        options: ['1', '2', '3', '4', '5'],
      ),
      DiagnosisQuestion(
        id: 'q2',
        title: 'Processos',
        description: 'Existe padronizacao formal dos processos chave?',
        type: QuestionType.choice,
        options: ['Sim', 'Parcial', 'Nao'],
      ),
      DiagnosisQuestion(
        id: 'q3',
        title: 'Pessoas',
        description: 'Como voce descreveria a cultura da empresa?',
        type: QuestionType.text,
      ),
    ];
  }

  Future<void> submitAnswers(Map<String, dynamic> payload) async {
    await Future.delayed(const Duration(milliseconds: 400));
    // TODO: send to backend
  }
}
