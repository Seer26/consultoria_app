/// Consultation DTOs are separate from the respondent's score-free payloads.
class BehavioralAdminAssessment {
  const BehavioralAdminAssessment({
    required this.id,
    required this.userId,
    required this.userName,
    required this.userRole,
    required this.status,
    required this.startedAt,
    this.completedAt,
  });
  final String id;
  final String userId;
  final String userName;
  final String userRole;
  final String status;
  final DateTime startedAt;
  final DateTime? completedAt;
  bool get isCompleted => status == 'COMPLETED';
  factory BehavioralAdminAssessment.fromMap(Map<String, dynamic> map) =>
      BehavioralAdminAssessment(
        id: map['id'] as String,
        userId: map['userId'] as String,
        userName: map['userName'] as String,
        userRole: map['userRole'] as String,
        status: map['status'] as String,
        startedAt: DateTime.parse(map['startedAt'] as String),
        completedAt: map['completedAt'] == null
            ? null
            : DateTime.parse(map['completedAt'] as String),
      );
}

class BehavioralScores {
  const BehavioralScores({
    required this.executor,
    required this.comunicador,
    required this.planejador,
    required this.analitico,
    this.predominantDimension,
  });
  final int executor;
  final int comunicador;
  final int planejador;
  final int analitico;
  final String? predominantDimension;
  List<int> get values => [executor, comunicador, planejador, analitico];
  static const labels = ['Executor', 'Comunicador', 'Planejador', 'Analítico'];
  static const dimensionLabels = {
    'EXECUTOR': 'Executor',
    'COMUNICADOR': 'Comunicador',
    'PLANEJADOR': 'Planejador',
    'ANALITICO': 'Analítico',
  };
  factory BehavioralScores.fromMap(Map<String, dynamic> map) =>
      BehavioralScores(
        executor: map['executorScore'] as int,
        comunicador: map['comunicadorScore'] as int,
        planejador: map['planejadorScore'] as int,
        analitico: map['analiticoScore'] as int,
        predominantDimension: map['predominantDimension'] as String?,
      );
}

class BehavioralAdminResult {
  const BehavioralAdminResult({required this.assessment, required this.scores});
  final BehavioralAdminAssessment assessment;
  final BehavioralScores scores;
  factory BehavioralAdminResult.fromMap(Map<String, dynamic> map) {
    final user = Map<String, dynamic>.from(map['user'] as Map);
    return BehavioralAdminResult(
      assessment: BehavioralAdminAssessment.fromMap({
        ...Map<String, dynamic>.from(map['assessment'] as Map),
        'userName': user['name'],
        'userRole': user['role'],
      }),
      scores: BehavioralScores.fromMap(
        Map<String, dynamic>.from(map['result'] as Map),
      ),
    );
  }
}
