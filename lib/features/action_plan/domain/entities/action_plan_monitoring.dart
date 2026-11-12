import 'action_plan_task.dart';

class ActionPlanMonitoring {
  const ActionPlanMonitoring({
    required this.totalTasks,
    required this.pendingTasks,
    required this.inProgressTasks,
    required this.completedTasks,
    required this.overdueTasks,
    required this.dueSoonTasks,
    required this.responsibles,
  });

  factory ActionPlanMonitoring.fromTasks(List<ActionPlanTask> tasks) {
    final groupedTasks = <String, List<ActionPlanTask>>{};

    for (final task in tasks) {
      final userId = task.responsibleUserId?.trim();
      if (userId != null && userId.isNotEmpty) {
        groupedTasks.putIfAbsent(userId, () => []).add(task);
      }
    }

    final responsibles =
        groupedTasks.entries
            .map(
              (entry) => ActionPlanResponsibleMonitoring.fromTasks(
                userId: entry.key,
                tasks: entry.value,
              ),
            )
            .toList()
          ..sort((first, second) => first.name.compareTo(second.name));

    return ActionPlanMonitoring(
      totalTasks: tasks.length,
      pendingTasks: _countStatus(tasks, ActionPlanTaskStatus.todo),
      inProgressTasks: _countStatus(tasks, ActionPlanTaskStatus.inProgress),
      completedTasks: _countStatus(tasks, ActionPlanTaskStatus.done),
      overdueTasks: tasks.where((task) => task.isOverdue).length,
      dueSoonTasks: tasks.where((task) => task.isDueSoon).length,
      responsibles: responsibles,
    );
  }

  final int totalTasks;
  final int pendingTasks;
  final int inProgressTasks;
  final int completedTasks;
  final int overdueTasks;
  final int dueSoonTasks;
  final List<ActionPlanResponsibleMonitoring> responsibles;

  static int _countStatus(
    List<ActionPlanTask> tasks,
    ActionPlanTaskStatus status,
  ) {
    return tasks.where((task) => task.status == status).length;
  }
}

class ActionPlanResponsibleMonitoring {
  const ActionPlanResponsibleMonitoring({
    required this.userId,
    required this.name,
    required this.totalTasks,
    required this.pendingTasks,
    required this.inProgressTasks,
    required this.completedTasks,
    required this.overdueTasks,
  });

  factory ActionPlanResponsibleMonitoring.fromTasks({
    required String userId,
    required List<ActionPlanTask> tasks,
  }) {
    final firstTask = tasks.first;
    return ActionPlanResponsibleMonitoring(
      userId: userId,
      name: firstTask.responsibleUserName?.trim().isNotEmpty == true
          ? firstTask.responsibleUserName!.trim()
          : 'Responsável não informado',
      totalTasks: tasks.length,
      pendingTasks: ActionPlanMonitoring._countStatus(
        tasks,
        ActionPlanTaskStatus.todo,
      ),
      inProgressTasks: ActionPlanMonitoring._countStatus(
        tasks,
        ActionPlanTaskStatus.inProgress,
      ),
      completedTasks: ActionPlanMonitoring._countStatus(
        tasks,
        ActionPlanTaskStatus.done,
      ),
      overdueTasks: tasks.where((task) => task.isOverdue).length,
    );
  }

  final String userId;
  final String name;
  final int totalTasks;
  final int pendingTasks;
  final int inProgressTasks;
  final int completedTasks;
  final int overdueTasks;

  int get completionPercentage =>
      totalTasks == 0 ? 0 : ((completedTasks / totalTasks) * 100).round();
}
