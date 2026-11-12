/// Respondent DTOs contain no scores or processed dimensions.
class BehavioralAssessment {
  const BehavioralAssessment({
    required this.id,
    required this.status,
    required this.questionnaireVersion,
    required this.answeredCount,
    required this.totalQuestions,
  });
  final String id;
  final String status;
  final int questionnaireVersion;
  final int answeredCount;
  final int totalQuestions;
  bool get isCompleted => status == 'COMPLETED';
  factory BehavioralAssessment.fromMap(Map<String, dynamic> map) =>
      BehavioralAssessment(
        id: map['id'] as String,
        status: map['status'] as String,
        questionnaireVersion: map['questionnaireVersion'] as int,
        answeredCount: map['answeredCount'] as int,
        totalQuestions: map['totalQuestions'] as int,
      );
}

class BehavioralQuestion {
  const BehavioralQuestion({
    required this.id,
    required this.text,
    required this.position,
  });
  final String id;
  final String text;
  final int position;
  factory BehavioralQuestion.fromMap(Map<String, dynamic> map) =>
      BehavioralQuestion(
        id: map['id'] as String,
        text: map['text'] as String,
        position: map['position'] as int,
      );
}

class BehavioralQuestionnaire {
  const BehavioralQuestionnaire({
    required this.assessment,
    required this.questions,
    required this.answers,
  });
  final BehavioralAssessment assessment;
  final List<BehavioralQuestion> questions;
  final Map<String, int> answers;
  factory BehavioralQuestionnaire.fromMap(Map<String, dynamic> map) {
    final questions =
        (map['questions'] as List)
            .map(
              (q) => BehavioralQuestion.fromMap(
                Map<String, dynamic>.from(q as Map),
              ),
            )
            .toList()
          ..sort((a, b) => a.position.compareTo(b.position));
    return BehavioralQuestionnaire(
      assessment: BehavioralAssessment.fromMap(
        Map<String, dynamic>.from(map['assessment'] as Map),
      ),
      questions: List.unmodifiable(questions),
      answers: Map.unmodifiable({
        for (final answer in map['answers'] as List)
          (answer as Map)['questionId'] as String: answer['value'] as int,
      }),
    );
  }
}

class BehavioralCompletion {
  const BehavioralCompletion({required this.id, required this.completedAt});
  final String id;
  final DateTime completedAt;
  factory BehavioralCompletion.fromMap(Map<String, dynamic> map) {
    if (map['status'] != 'COMPLETED') {
      throw const FormatException('Invalid completion');
    }
    return BehavioralCompletion(
      id: map['id'] as String,
      completedAt: DateTime.parse(map['completedAt'] as String),
    );
  }
}
