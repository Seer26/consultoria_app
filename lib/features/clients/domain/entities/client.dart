enum ClientStatus { active, paused, closed }

class Client {
  const Client({
    required this.id,
    required this.name,
    required this.segment,
    required this.progress,
    required this.status,
    required this.nextStep,
    required this.score,
    required this.lastUpdatedAt,
    required this.owner,
    required this.contactEmail,
    this.notes = '',
  });

  final String id;
  final String name;
  final String segment;
  final double progress;
  final ClientStatus status;
  final String nextStep;
  final int score;
  final DateTime lastUpdatedAt;
  final String owner;
  final String contactEmail;
  final String notes;

  Client copyWith({
    String? id,
    String? name,
    String? segment,
    double? progress,
    ClientStatus? status,
    String? nextStep,
    int? score,
    DateTime? lastUpdatedAt,
    String? owner,
    String? contactEmail,
    String? notes,
  }) {
    return Client(
      id: id ?? this.id,
      name: name ?? this.name,
      segment: segment ?? this.segment,
      progress: progress ?? this.progress,
      status: status ?? this.status,
      nextStep: nextStep ?? this.nextStep,
      score: score ?? this.score,
      lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
      owner: owner ?? this.owner,
      contactEmail: contactEmail ?? this.contactEmail,
      notes: notes ?? this.notes,
    );
  }
}
