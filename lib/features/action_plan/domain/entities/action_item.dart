import '../enums/action_status.dart';

class ActionItem {
  const ActionItem({
    required this.id,
    required this.title,
    required this.client,
    required this.dueDate,
    required this.priority,
    required this.status,
    this.owner,
    this.description = '',
  });

  final String id;
  final String title;
  final String client;
  final DateTime dueDate;
  final String priority;
  final ActionStatus status;
  final String? owner;
  final String description;

  ActionItem copyWith({
    String? id,
    String? title,
    String? client,
    DateTime? dueDate,
    String? priority,
    ActionStatus? status,
    String? owner,
    String? description,
  }) {
    return ActionItem(
      id: id ?? this.id,
      title: title ?? this.title,
      client: client ?? this.client,
      dueDate: dueDate ?? this.dueDate,
      priority: priority ?? this.priority,
      status: status ?? this.status,
      owner: owner ?? this.owner,
      description: description ?? this.description,
    );
  }
}
