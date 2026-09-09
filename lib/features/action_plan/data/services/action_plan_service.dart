import 'package:dio/dio.dart';

import '../../../../core/http/plan_limit_error_mapper.dart';
import '../../domain/entities/action_plan_task.dart';

class CreateActionPlanTaskPayload {
  const CreateActionPlanTaskPayload({
    required this.title,
    required this.priority,
    this.companyId,
    this.description,
    this.dueDate,
    this.pillar,
    this.planVersionId,
    this.status,
    this.responsibleUserId,
  });

  final String? companyId;
  final String title;
  final String? description;
  final ActionPlanTaskPriority priority;
  final DateTime? dueDate;
  final String? pillar;
  final String? planVersionId;
  final ActionPlanTaskStatus? status;
  final String? responsibleUserId;
}

class UpdateActionPlanTaskPayload {
  const UpdateActionPlanTaskPayload({
    required this.title,
    required this.description,
    required this.priority,
    this.pillar,
    this.status,
    this.dueDate,
    this.responsibleUserId,
  });

  final String title;
  final String description;
  final String? pillar;
  final ActionPlanTaskPriority priority;
  final ActionPlanTaskStatus? status;
  final DateTime? dueDate;
  final String? responsibleUserId;
}

class ActionPlanService {
  ActionPlanService(this._dio);

  final Dio _dio;

  Future<List<ActionPlanTask>> listTasks({
    String? companyId,
    String? submissionId,
    String? planVersionId,
    ActionPlanTaskScope scope = ActionPlanTaskScope.all,
    String? search,
  }) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/action-plan/tasks',
        queryParameters: {
          if (companyId != null && companyId.trim().isNotEmpty)
            'companyId': companyId,
          if (submissionId != null && submissionId.trim().isNotEmpty)
            'submissionId': submissionId,
          if (planVersionId != null && planVersionId.trim().isNotEmpty)
            'planVersionId': planVersionId,
          'scope': _scopeToApi(scope),
          if (search != null && search.trim().isNotEmpty)
            'search': search.trim(),
        },
      );

      return (response.data ?? const [])
          .whereType<Map>()
          .map((item) => _taskFromMap(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao carregar o plano de acao.'),
      );
    }
  }

  Future<List<ActionPlanAssignee>> listAssignees({String? companyId}) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/action-plan/assignees',
        queryParameters: {
          if (companyId != null && companyId.trim().isNotEmpty)
            'companyId': companyId,
        },
      );

      return (response.data ?? const [])
          .whereType<Map>()
          .map(
            (item) => ActionPlanAssignee(
              id: item['id']?.toString() ?? '',
              name: item['name']?.toString() ?? '',
              email: item['email']?.toString() ?? '',
              role: item['role']?.toString() ?? '',
              jobRole: item['jobRole']?.toString() ?? '',
              department: item['department']?.toString() ?? '',
              companyId: item['companyId']?.toString() ?? '',
            ),
          )
          .where((item) => item.id.isNotEmpty)
          .toList();
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao carregar responsáveis.'),
      );
    }
  }

  Future<ActionPlanTask> createTask(CreateActionPlanTaskPayload input) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/action-plan/tasks',
        data: {
          if (input.companyId != null && input.companyId!.trim().isNotEmpty)
            'companyId': input.companyId,
          'title': input.title,
          'description': input.description ?? '',
          'priority': _priorityToApi(input.priority),
          if (input.pillar != null) 'pillar': input.pillar,
          if (input.planVersionId != null) 'planVersionId': input.planVersionId,
          if (input.status != null) 'status': _statusToApi(input.status!),
          'responsibleUserId': input.responsibleUserId,
          if (input.dueDate != null)
            'dueDate': input.dueDate!.toIso8601String(),
        },
      );

      return _taskFromMap(response.data ?? const {});
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao criar a tarefa.'),
      );
    }
  }

  Future<ActionPlanTask> updateTask(
    String taskId,
    UpdateActionPlanTaskPayload input,
  ) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        '/action-plan/tasks/$taskId',
        data: {
          'title': input.title,
          'description': input.description,
          'pillar': input.pillar,
          'priority': _priorityToApi(input.priority),
          if (input.status != null) 'status': _statusToApi(input.status!),
          'dueDate': input.dueDate?.toIso8601String(),
          'responsibleUserId': input.responsibleUserId,
        },
      );

      return _taskFromMap(response.data ?? const {});
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao atualizar a tarefa.'),
      );
    }
  }

  Future<ActionPlanTask> updateTaskStatus(
    String taskId,
    ActionPlanTaskStatus status,
  ) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        '/action-plan/tasks/$taskId/status',
        data: {'status': _statusToApi(status)},
      );

      return _taskFromMap(response.data ?? const {});
    } on DioException catch (error) {
      throw Exception(
        _extractError(
          error,
          fallback: 'Falha ao atualizar o status da tarefa.',
        ),
      );
    }
  }

  Future<ActionPlanGenerationResult> generateActionPlan(
    String submissionId,
  ) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/research/submissions/$submissionId/generate-action-plan',
      );

      final data = response.data ?? const {};
      return ActionPlanGenerationResult(
        submissionId: data['submissionId']?.toString() ?? submissionId,
        companyId: data['companyId']?.toString() ?? '',
        alreadyGenerated: data['alreadyGenerated'] == true,
        planVersion: _readPlanVersion(data['planVersion']),
        createdCount: (data['createdCount'] as num?)?.toInt() ?? 0,
        tasks: _readTasks(data['tasks']),
      );
    } on DioException catch (error) {
      throw Exception(
        _extractError(
          error,
          fallback: 'Falha ao gerar o plano de acao da pesquisa.',
        ),
      );
    }
  }

  List<ActionPlanTask> _readTasks(dynamic value) {
    if (value is! List) {
      return const [];
    }

    return value
        .whereType<Map>()
        .map((item) => _taskFromMap(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<List<ActionPlanVersionSummary>> listPlanVersions({
    String? companyId,
    String? submissionId,
  }) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/action-plan/versions',
        queryParameters: {
          if (companyId != null && companyId.trim().isNotEmpty)
            'companyId': companyId,
          if (submissionId != null && submissionId.trim().isNotEmpty)
            'submissionId': submissionId,
        },
      );
      return (response.data ?? const [])
          .whereType<Map>()
          .map((item) => _readPlanVersion(Map<String, dynamic>.from(item)))
          .whereType<ActionPlanVersionSummary>()
          .toList();
    } on DioException catch (error) {
      throw Exception(
        _extractError(
          error,
          fallback: 'Falha ao carregar o histórico do plano.',
        ),
      );
    }
  }

  ActionPlanTask _taskFromMap(Map<String, dynamic> map) {
    return ActionPlanTask(
      id: map['id']?.toString() ?? '',
      companyId: map['companyId']?.toString() ?? '',
      companyName: map['companyName']?.toString(),
      submissionId: map['submissionId']?.toString(),
      planVersionId: map['planVersionId']?.toString(),
      title: map['title']?.toString() ?? '',
      description: map['description']?.toString() ?? '',
      pillar: map['pillar']?.toString(),
      priority: _priorityFromApi(map['priority']?.toString()),
      status: _statusFromApi(map['status']?.toString()),
      dueDate: _parseDate(map['dueDate']),
      responsibleUserId: map['responsibleUserId']?.toString(),
      responsibleUserName: map['responsibleUserName']?.toString(),
      responsibleUserEmail: map['responsibleUserEmail']?.toString(),
      source: _sourceFromApi(map['source']?.toString()),
      createdAt: _parseDate(map['createdAt']) ?? DateTime.now(),
      updatedAt: _parseDate(map['updatedAt']) ?? DateTime.now(),
      completedAt: _parseDate(map['completedAt']),
      isOverdue: map['isOverdue'] == true,
      daysOverdue: (map['daysOverdue'] as num?)?.toInt() ?? 0,
      isDueSoon: map['isDueSoon'] == true,
    );
  }

  ActionPlanVersionSummary? _readPlanVersion(dynamic value) {
    if (value is! Map) return null;
    final map = Map<String, dynamic>.from(value);
    final id = map['id']?.toString() ?? '';
    if (id.isEmpty) return null;
    return ActionPlanVersionSummary(
      id: id,
      companyId: map['companyId']?.toString() ?? '',
      submissionId: map['submissionId']?.toString() ?? '',
      versionNumber: (map['versionNumber'] as num?)?.toInt() ?? 1,
      status: _versionStatusFromApi(map['status']?.toString()),
      source: map['source']?.toString() == 'MANUAL'
          ? ActionPlanVersionSource.manual
          : ActionPlanVersionSource.ai,
      generatedByUserId: map['generatedByUserId']?.toString(),
      generatedByUserName: map['generatedByUserName']?.toString(),
      createdAt: _parseDate(map['createdAt']) ?? DateTime.now(),
      updatedAt: _parseDate(map['updatedAt']) ?? DateTime.now(),
      archivedAt: _parseDate(map['archivedAt']),
      tasksCount: (map['tasksCount'] as num?)?.toInt() ?? 0,
    );
  }

  ActionPlanVersionStatus _versionStatusFromApi(String? value) {
    switch (value) {
      case 'DRAFT':
        return ActionPlanVersionStatus.draft;
      case 'COMPLETED':
        return ActionPlanVersionStatus.completed;
      case 'ARCHIVED':
        return ActionPlanVersionStatus.archived;
      case 'ACTIVE':
      default:
        return ActionPlanVersionStatus.active;
    }
  }

  String _scopeToApi(ActionPlanTaskScope scope) {
    switch (scope) {
      case ActionPlanTaskScope.all:
        return 'all';
      case ActionPlanTaskScope.mine:
        return 'mine';
      case ActionPlanTaskScope.overdue:
        return 'overdue';
      case ActionPlanTaskScope.dueSoon:
        return 'dueSoon';
      case ActionPlanTaskScope.critical:
        return 'critical';
      case ActionPlanTaskScope.completed:
        return 'completed';
    }
  }

  DateTime? _parseDate(dynamic value) {
    final raw = value?.toString();
    if (raw == null || raw.isEmpty) {
      return null;
    }

    return DateTime.tryParse(raw);
  }

  ActionPlanTaskPriority _priorityFromApi(String? value) {
    switch (value) {
      case 'LOW':
        return ActionPlanTaskPriority.low;
      case 'HIGH':
        return ActionPlanTaskPriority.high;
      case 'CRITICAL':
        return ActionPlanTaskPriority.critical;
      case 'MEDIUM':
      default:
        return ActionPlanTaskPriority.medium;
    }
  }

  String _priorityToApi(ActionPlanTaskPriority value) {
    switch (value) {
      case ActionPlanTaskPriority.low:
        return 'LOW';
      case ActionPlanTaskPriority.medium:
        return 'MEDIUM';
      case ActionPlanTaskPriority.high:
        return 'HIGH';
      case ActionPlanTaskPriority.critical:
        return 'CRITICAL';
    }
  }

  ActionPlanTaskStatus _statusFromApi(String? value) {
    switch (value) {
      case 'IN_PROGRESS':
        return ActionPlanTaskStatus.inProgress;
      case 'DONE':
        return ActionPlanTaskStatus.done;
      case 'CANCELED':
        return ActionPlanTaskStatus.canceled;
      case 'TODO':
      default:
        return ActionPlanTaskStatus.todo;
    }
  }

  String _statusToApi(ActionPlanTaskStatus value) {
    switch (value) {
      case ActionPlanTaskStatus.todo:
        return 'TODO';
      case ActionPlanTaskStatus.inProgress:
        return 'IN_PROGRESS';
      case ActionPlanTaskStatus.done:
        return 'DONE';
      case ActionPlanTaskStatus.canceled:
        return 'CANCELED';
    }
  }

  ActionPlanTaskSource _sourceFromApi(String? value) {
    switch (value) {
      case 'RESEARCH_RECOMMENDATION':
        return ActionPlanTaskSource.researchRecommendation;
      case 'AI':
        return ActionPlanTaskSource.ai;
      case 'MANUAL':
      default:
        return ActionPlanTaskSource.manual;
    }
  }

  String _extractError(DioException error, {required String fallback}) {
    final data = error.response?.data;
    final planLimitMessage = planLimitMessageFromResponseData(data);
    if (planLimitMessage != null) {
      return planLimitMessage;
    }

    if (data is Map && data['error'] != null) {
      final code = data['error'].toString();
      switch (code) {
        case 'COMPANY_ID_REQUIRED':
          return 'Empresa obrigatoria para esta operacao.';
        case 'ACTION_PLAN_TITLE_REQUIRED':
          return 'Informe um titulo para a tarefa.';
        case 'INVALID_ACTION_PLAN_PRIORITY':
          return 'Prioridade invalida.';
        case 'INVALID_ACTION_PLAN_STATUS':
          return 'Status invalido.';
        case 'INVALID_ACTION_PLAN_DUE_DATE':
          return 'Prazo invalido.';
        case 'RESPONSIBLE_USER_COMPANY_MISMATCH':
          return 'O responsavel informado nao pertence a empresa.';
        case 'RESPONSIBLE_USER_NOT_FOUND':
          return 'Responsavel nao encontrado.';
        case 'RESPONSIBLE_USER_INACTIVE':
          return 'O responsável selecionado está inativo.';
        case 'RESPONSIBLE_USER_ROLE_NOT_ALLOWED':
          return 'Selecione um colaborador ativo da empresa como responsável.';
        case 'EMPLOYEE_TASK_FIELDS_FORBIDDEN':
          return 'Como colaborador, você pode atualizar somente o andamento das tarefas atribuídas a você.';
        case 'EMPLOYEE_TASK_STATUS_TRANSITION_FORBIDDEN':
          return 'Avance a tarefa na ordem: Pendente, Em andamento e Concluída.';
        case 'RESEARCH_SUBMISSION_NOT_FOUND':
          return 'Pesquisa nao encontrada.';
        case 'ACTION_PLAN_SUBMISSION_NOT_COMPLETED':
          return 'Finalize a pesquisa antes de gerar o plano de acao.';
        case 'FORBIDDEN':
          return 'Voce nao tem permissao para acessar este plano de acao.';
      }
    }

    return fallback;
  }
}
