enum EvidenceStatus {
  notObserved('NOT_OBSERVED'),
  rated('RATED');

  const EvidenceStatus(this.apiValue);
  final String apiValue;
  static EvidenceStatus parse(String value) =>
      values.firstWhere((status) => status.apiValue == value);
}

const competencyLevelLabels = <int, String>{
  1: 'Muito abaixo do esperado',
  2: 'Abaixo do esperado',
  3: 'Adequado',
  4: 'Acima do esperado',
  5: 'Referência / domínio elevado',
};

class CompetencyAssessment {
  const CompetencyAssessment({
    required this.id,
    required this.companyId,
    required this.subjectUserId,
    required this.subjectName,
    required this.startedByName,
    required this.status,
    required this.startedAt,
    this.completedAt,
    this.completedByName,
  });
  final String id, companyId, subjectUserId, subjectName, startedByName, status;
  final String? completedByName;
  final DateTime startedAt;
  final DateTime? completedAt;
  bool get isCompleted => status == 'COMPLETED';
  factory CompetencyAssessment.fromMap(Map<String, dynamic> map) =>
      CompetencyAssessment(
        id: map['id'] as String,
        companyId: map['companyId'] as String,
        subjectUserId: map['subjectUserId'] as String,
        subjectName: map['subjectNameSnapshot'] as String,
        startedByName: map['startedByNameSnapshot'] as String,
        completedByName: map['completedByNameSnapshot'] as String?,
        status: map['status'] as String,
        startedAt: DateTime.parse(map['startedAt'] as String),
        completedAt: DateTime.tryParse(map['completedAt'] as String? ?? ''),
      );
}

class CompetencyItem {
  const CompetencyItem({
    required this.competencyId,
    required this.version,
    required this.name,
    required this.description,
    required this.evidenceStatus,
    required this.level,
    this.observation,
    this.category,
  });
  final String competencyId, name, description;
  final String version;
  final String? observation, category;
  final EvidenceStatus evidenceStatus;
  final int? level;
  factory CompetencyItem.fromMap(Map<String, dynamic> map) => CompetencyItem(
    version: '${map['id'] as String}:${map['updatedAt'] as String}',
    competencyId: map['competencyId'] as String,
    name: map['competencyNameSnapshot'] as String,
    description: map['competencyDescriptionSnapshot'] as String,
    category: map['competencyCategorySnapshot'] as String?,
    evidenceStatus: EvidenceStatus.parse(map['evidenceStatus'] as String),
    level: (map['level'] as num?)?.toInt(),
    observation: map['observation'] as String?,
  );
}

/// Technical response exclusively consumed by the ADMIN flow.
class AdminCompetencyAssessment {
  const AdminCompetencyAssessment({
    required this.assessment,
    required this.items,
    required this.insufficientEvidence,
  });
  final CompetencyAssessment assessment;
  final List<CompetencyItem> items;
  final bool insufficientEvidence;
  factory AdminCompetencyAssessment.fromMap(Map<String, dynamic> map) =>
      AdminCompetencyAssessment(
        assessment: CompetencyAssessment.fromMap(
          Map<String, dynamic>.from(map['assessment'] as Map),
        ),
        items: (map['items'] as List)
            .map(
              (item) => CompetencyItem.fromMap(
                Map<String, dynamic>.from(item as Map),
              ),
            )
            .toList(),
        insufficientEvidence: map['insufficientEvidence'] == true,
      );
}
