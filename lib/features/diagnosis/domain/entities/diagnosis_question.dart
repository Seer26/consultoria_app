enum QuestionType { text, choice, score }

class DiagnosisQuestion {
  const DiagnosisQuestion({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    this.options = const [],
  });

  final String id;
  final String title;
  final String description;
  final QuestionType type;
  final List<String> options;
}
