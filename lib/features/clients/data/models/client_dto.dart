import '../../domain/entities/client.dart';

class ClientDto {
  ClientDto({
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

  Client toDomain() => Client(
    id: id,
    name: name,
    segment: segment,
    progress: progress,
    status: status,
    nextStep: nextStep,
    score: score,
    lastUpdatedAt: lastUpdatedAt,
    owner: owner,
    contactEmail: contactEmail,
    notes: notes,
  );
}
