import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/auth/role_guard.dart';
import '../../../../core/errors/api_error_presenter.dart';
import '../../../../core/di/providers.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../admin_management/data/services/admin_management_service.dart';
import '../../../admin_management/domain/entities/company_account.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/services/action_plan_service.dart';
import '../../domain/entities/action_plan_task.dart';
import '../action_plan_labels.dart';
import '../providers/action_plan_providers.dart';

class ActionPlanPage extends ConsumerStatefulWidget {
  const ActionPlanPage({
    super.key,
    this.initialScope = ActionPlanTaskScope.all,
  });

  final ActionPlanTaskScope initialScope;

  @override
  ConsumerState<ActionPlanPage> createState() => _ActionPlanPageState();
}

class _ActionPlanPageState extends ConsumerState<ActionPlanPage> {
  static const _allCompaniesValue = '__all_companies__';

  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;
  String? _selectedCompanyId;
  late ActionPlanTaskScope _scope;
  String _sort = 'attention';
  final TextEditingController _searchController = TextEditingController();
  List<ActionPlanTask> _tasks = const [];
  List<ActionPlanAssignee> _assignees = const [];
  List<CompanyAccount> _companies = const [];
  List<ActionPlanVersionSummary> _versions = const [];

  @override
  void initState() {
    super.initState();
    _scope = widget.initialScope;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadInitialData();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    final authUser = ref.read(authControllerProvider).user;
    if (authUser == null) {
      return;
    }

    final role = RoleGuard.normalizeRole(authUser.role);
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      if (role == RoleGuard.admin) {
        final companyService = AdminManagementService(ref.read(dioProvider));
        final companies = await companyService.fetchCompanies();
        if (!mounted) {
          return;
        }
        _companies = companies;
      }

      final companyId = role == RoleGuard.admin
          ? _selectedCompanyId
          : authUser.companyId;
      final service = ref.read(actionPlanServiceProvider);
      final tasks = await service.listTasks(
        companyId: companyId,
        scope: _scope,
        search: _searchController.text,
      );
      final versions = role == RoleGuard.employee
          ? const <ActionPlanVersionSummary>[]
          : await service.listPlanVersions(companyId: companyId);
      final assignees = companyId == null || role == RoleGuard.employee
          ? const <ActionPlanAssignee>[]
          : await service.listAssignees(companyId: companyId);

      if (!mounted) {
        return;
      }

      setState(() {
        _tasks = _sortTasks(tasks);
        _versions = versions;
        _assignees = assignees;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _error = userFriendlyError(error);
        _isLoading = false;
      });
    }
  }

  Future<void> _updateStatus(
    ActionPlanTask task,
    ActionPlanTaskStatus status,
  ) async {
    if (status == ActionPlanTaskStatus.canceled) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Cancelar tarefa?'),
          content: const Text(
            'A tarefa permanecerá no histórico com o status cancelado.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Voltar'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Confirmar cancelamento'),
            ),
          ],
        ),
      );
      if (confirmed != true) return;
    }

    setState(() => _isSaving = true);

    try {
      final updated = await ref
          .read(actionPlanServiceProvider)
          .updateTaskStatus(task.id, status);
      if (!mounted) {
        return;
      }

      setState(() {
        _tasks = _tasks
            .map((item) => item.id == updated.id ? updated : item)
            .toList();
      });
      _showMessage('Status atualizado com sucesso.');
    } catch (error) {
      if (!mounted) {
        return;
      }
      _showMessage(userFriendlyError(error), isError: true);
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  List<ActionPlanTask> _sortTasks(List<ActionPlanTask> tasks) {
    final sorted = [...tasks];
    int statusWeight(ActionPlanTask task) {
      if (task.isOverdue) return 0;
      if (task.priority == ActionPlanTaskPriority.critical) return 1;
      if (task.isDueSoon) return 2;
      if (task.status == ActionPlanTaskStatus.inProgress) return 3;
      if (task.status == ActionPlanTaskStatus.todo) return 4;
      return 5;
    }

    sorted.sort((left, right) {
      switch (_sort) {
        case 'due':
          final leftDate = left.dueDate ?? DateTime(9999);
          final rightDate = right.dueDate ?? DateTime(9999);
          return leftDate.compareTo(rightDate);
        case 'updated':
          return right.updatedAt.compareTo(left.updatedAt);
        case 'attention':
        default:
          final comparison = statusWeight(left).compareTo(statusWeight(right));
          return comparison != 0
              ? comparison
              : right.updatedAt.compareTo(left.updatedAt);
      }
    });
    return sorted;
  }

  Future<void> _openTaskDialog({ActionPlanTask? task}) async {
    final authUser = ref.read(authControllerProvider).user;
    if (authUser == null) {
      return;
    }

    final isAdmin = RoleGuard.normalizeRole(authUser.role) == RoleGuard.admin;
    final companyId =
        task?.companyId ?? _selectedCompanyId ?? authUser.companyId;
    if (isAdmin && companyId == null) {
      _showMessage(
        'Selecione uma empresa antes de criar ou editar uma tarefa.',
        isError: true,
      );
      return;
    }
    final service = ref.read(actionPlanServiceProvider);
    final assignees = _assignees.any((item) => item.companyId == companyId)
        ? _assignees.where((item) => item.companyId == companyId).toList()
        : await service.listAssignees(companyId: companyId);
    if (!mounted) return;

    final result = await showDialog<TaskFormResult>(
      context: context,
      builder: (context) => TaskFormDialog(
        task: task,
        companyId: companyId!,
        assignees: assignees,
      ),
    );

    if (result == null) {
      return;
    }

    setState(() => _isSaving = true);
    try {
      if (task == null) {
        await service.createTask(
          CreateActionPlanTaskPayload(
            companyId: companyId,
            title: result.title,
            description: result.description,
            pillar: result.pillar,
            priority: result.priority,
            status: result.status,
            dueDate: result.dueDate,
            responsibleUserId: result.responsibleUserId,
          ),
        );
      } else {
        await service.updateTask(
          task.id,
          UpdateActionPlanTaskPayload(
            title: result.title,
            description: result.description,
            pillar: result.pillar,
            priority: result.priority,
            status: result.status,
            dueDate: result.dueDate,
            responsibleUserId: result.responsibleUserId,
          ),
        );
      }
      await _loadInitialData();
      if (!mounted) {
        return;
      }
      _showMessage(
        task == null
            ? 'Tarefa criada com sucesso.'
            : 'Tarefa atualizada com sucesso.',
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      _showMessage(userFriendlyError(error), isError: true);
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  void _showMessage(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: isError ? AppColors.danger : AppColors.success,
        content: Text(message),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authUser = ref.watch(authControllerProvider).user;
    final role = RoleGuard.normalizeRole(authUser?.role);

    return AppPageScaffold(
      title: 'Plano de Ação',
      subtitle: role == RoleGuard.employee
          ? 'Acompanhe suas tarefas atribuídas e avance cada etapa até a conclusão.'
          : 'Acompanhe as tarefas geradas pela Pesquisa Empresarial e crie ações manuais quando necessário.',
      actions: [
        if (role == RoleGuard.admin && _companies.isNotEmpty)
          SizedBox(
            width: 280,
            child: DropdownButtonFormField<String>(
              initialValue: _selectedCompanyId ?? _allCompaniesValue,
              decoration: const InputDecoration(
                labelText: 'Filtrar empresa',
                border: OutlineInputBorder(),
              ),
              items: [
                const DropdownMenuItem<String>(
                  value: _allCompaniesValue,
                  child: Text('Todas as empresas'),
                ),
                ..._companies.map(
                  (company) => DropdownMenuItem<String>(
                    value: company.id,
                    child: Text(company.name),
                  ),
                ),
              ],
              onChanged: (value) {
                setState(
                  () => _selectedCompanyId = value == _allCompaniesValue
                      ? null
                      : value,
                );
                _loadInitialData();
              },
            ),
          ),
        OutlinedButton.icon(
          onPressed: _isLoading ? null : _loadInitialData,
          icon: const Icon(Icons.refresh),
          label: const Text('Atualizar'),
        ),
        if (role != RoleGuard.employee)
          FilledButton.icon(
            onPressed: _isSaving ? null : () => _openTaskDialog(),
            icon: const Icon(Icons.add_task),
            label: const Text('Nova tarefa'),
          ),
      ],
      child: Column(
        children: [
          if (role != RoleGuard.employee) ...[
            _ActionPlanReviewNotice(versions: _versions),
            const SizedBox(height: 16),
          ],
          _buildFilters(role),
          const SizedBox(height: 16),
          Expanded(child: _buildBody(role)),
        ],
      ),
    );
  }

  Widget _buildFilters(String role) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Wrap(
          spacing: 12,
          runSpacing: 12,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            SizedBox(
              width: 280,
              child: TextField(
                key: const ValueKey('task-search'),
                controller: _searchController,
                onSubmitted: (_) => _loadInitialData(),
                decoration: InputDecoration(
                  labelText: 'Buscar tarefa',
                  hintText: 'Título, pilar ou responsável',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: IconButton(
                    tooltip: 'Buscar',
                    onPressed: _loadInitialData,
                    icon: const Icon(Icons.arrow_forward),
                  ),
                ),
              ),
            ),
            SizedBox(
              width: 190,
              child: DropdownButtonFormField<ActionPlanTaskScope>(
                key: const ValueKey('task-scope-filter'),
                initialValue: _scope,
                decoration: const InputDecoration(labelText: 'Exibir'),
                items: ActionPlanTaskScope.values
                    .map(
                      (scope) => DropdownMenuItem(
                        value: scope,
                        child: Text(_scopeLabel(scope)),
                      ),
                    )
                    .toList(),
                onChanged: (value) {
                  if (value == null) return;
                  setState(() => _scope = value);
                  _loadInitialData();
                },
              ),
            ),
            SizedBox(
              width: 190,
              child: DropdownButtonFormField<String>(
                key: const ValueKey('task-sort'),
                initialValue: _sort,
                decoration: const InputDecoration(labelText: 'Ordenar'),
                items: const [
                  DropdownMenuItem(
                    value: 'attention',
                    child: Text('Mais urgentes'),
                  ),
                  DropdownMenuItem(value: 'due', child: Text('Prazo')),
                  DropdownMenuItem(
                    value: 'updated',
                    child: Text('Atualização'),
                  ),
                ],
                onChanged: (value) {
                  if (value == null) return;
                  setState(() {
                    _sort = value;
                    _tasks = _sortTasks(_tasks);
                  });
                },
              ),
            ),
            Text(
              '${_tasks.length} tarefa(s)',
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(String role) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.cloud_off_outlined,
              size: 48,
              color: AppColors.textMuted,
            ),
            const SizedBox(height: 12),
            Text(_error!),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _loadInitialData,
              icon: const Icon(Icons.refresh),
              label: const Text('Tentar novamente'),
            ),
          ],
        ),
      );
    }

    if (_tasks.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.task_alt_outlined, size: 48, color: AppColors.textMuted),
            SizedBox(height: 12),
            Text(
              role == RoleGuard.employee
                  ? 'Você não possui tarefas atribuídas no momento.'
                  : 'Nenhuma tarefa encontrada no Plano de Ação.',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            SizedBox(height: 8),
            Text(
              role == RoleGuard.employee
                  ? 'Quando uma tarefa for atribuída a você, ela aparecerá aqui.'
                  : 'Gere um plano a partir da Pesquisa Empresarial ou crie uma tarefa manual.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      itemCount: _tasks.length,
      separatorBuilder: (_, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final task = _tasks[index];
        return _TaskCard(
          task: task,
          showCompany: role == RoleGuard.admin,
          isSaving: _isSaving,
          isEmployee: role == RoleGuard.employee,
          onStatusChanged: (status) => _updateStatus(task, status),
          onEdit: () => _openTaskDialog(task: task),
        );
      },
    );
  }
}

class _ActionPlanReviewNotice extends StatelessWidget {
  const _ActionPlanReviewNotice({required this.versions});
  final List<ActionPlanVersionSummary> versions;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Plano gerado com apoio de IA. Revise antes de colocar em execução.',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
            if (versions.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final version in versions)
                    _MetaChip(
                      label:
                          'v${version.versionNumber} · ${_versionStatusLabel(version.status)} · ${version.tasksCount} ações',
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({
    required this.task,
    required this.showCompany,
    required this.isSaving,
    required this.isEmployee,
    required this.onStatusChanged,
    required this.onEdit,
  });

  final ActionPlanTask task;
  final bool showCompany;
  final bool isSaving;
  final bool isEmployee;
  final ValueChanged<ActionPlanTaskStatus> onStatusChanged;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final priorityStyle = _priorityStyle(task.priority);
    final statusStyle = _statusStyle(task.status);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (task.description.trim().isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        task.description,
                        style: const TextStyle(color: AppColors.textSecondary),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: priorityStyle.$2,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  priorityStyle.$1,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                  ),
                ),
              ),
              if (!isEmployee)
                IconButton(
                  key: ValueKey('edit-task-${task.id}'),
                  tooltip: 'Editar tarefa',
                  onPressed: isSaving ? null : onEdit,
                  icon: const Icon(Icons.edit_outlined),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _MetaChip(
                label: statusStyle.$1,
                color: statusStyle.$2,
                filled: true,
              ),
              _MetaChip(label: _sourceLabel(task.source)),
              _MetaChip(
                label: task.pillar?.trim().isNotEmpty == true
                    ? task.pillar!
                    : 'Sem pilar',
              ),
              if (task.dueDate != null)
                _MetaChip(
                  label:
                      'Prazo ${DateFormatter.formatDate(task.dueDate!.toLocal())}',
                ),
              if (task.isOverdue)
                _MetaChip(
                  label: 'ATRASADA · ${task.daysOverdue} dia(s)',
                  color: AppColors.danger,
                  filled: true,
                )
              else if (task.isDueSoon)
                _MetaChip(
                  label: 'VENCE EM BREVE',
                  color: AppColors.amber,
                  filled: true,
                ),
              if (task.responsibleUserName?.trim().isNotEmpty == true)
                _MetaChip(label: 'Resp. ${task.responsibleUserName}'),
              if (showCompany && task.companyName?.trim().isNotEmpty == true)
                _MetaChip(label: task.companyName!),
            ],
          ),
          const SizedBox(height: 14),
          if (!isEmployee || _employeeNextStatus(task.status) != null)
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<ActionPlanTaskStatus>(
                    initialValue: task.status,
                    decoration: const InputDecoration(
                      labelText: 'Status',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    items:
                        (isEmployee
                                ? [
                                    task.status,
                                    _employeeNextStatus(task.status)!,
                                  ]
                                : ActionPlanTaskStatus.values)
                            .map(
                              (status) =>
                                  DropdownMenuItem<ActionPlanTaskStatus>(
                                    value: status,
                                    child: Text(_statusStyle(status).$1),
                                  ),
                            )
                            .toList(),
                    onChanged: isSaving
                        ? null
                        : (value) {
                            if (value != null && value != task.status) {
                              onStatusChanged(value);
                            }
                          },
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label, this.color, this.filled = false});

  final String label;
  final Color? color;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final chipColor = color ?? AppColors.surfaceMuted;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: filled ? chipColor : chipColor.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: chipColor.withValues(alpha: filled ? 0 : 0.28),
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: filled ? Colors.white : AppColors.textSecondary,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
      ),
    );
  }
}

class TaskFormResult {
  const TaskFormResult({
    required this.title,
    required this.description,
    required this.pillar,
    required this.priority,
    required this.status,
    required this.dueDate,
    required this.responsibleUserId,
  });

  final String title;
  final String description;
  final String? pillar;
  final ActionPlanTaskPriority priority;
  final ActionPlanTaskStatus status;
  final DateTime? dueDate;
  final String? responsibleUserId;
}

class TaskFormDialog extends StatefulWidget {
  const TaskFormDialog({
    super.key,
    required this.companyId,
    required this.assignees,
    this.task,
  });

  final String companyId;
  final List<ActionPlanAssignee> assignees;
  final ActionPlanTask? task;

  @override
  State<TaskFormDialog> createState() => _TaskFormDialogState();
}

class _TaskFormDialogState extends State<TaskFormDialog> {
  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _pillarController;
  late ActionPlanTaskPriority _priority;
  late ActionPlanTaskStatus _status;
  DateTime? _dueDate;
  String? _responsibleUserId;
  String? _validationError;

  @override
  void initState() {
    super.initState();
    final task = widget.task;
    _titleController = TextEditingController(text: task?.title ?? '');
    _descriptionController = TextEditingController(
      text: task?.description ?? '',
    );
    _pillarController = TextEditingController(text: task?.pillar ?? '');
    _priority = task?.priority ?? ActionPlanTaskPriority.medium;
    _status = task?.status ?? ActionPlanTaskStatus.todo;
    _dueDate = task?.dueDate;
    _responsibleUserId = task?.responsibleUserId;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _pillarController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now().subtract(const Duration(days: 3650)),
      lastDate: DateTime.now().add(const Duration(days: 3650)),
    );
    if (picked != null) setState(() => _dueDate = picked);
  }

  void _submit() {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      setState(() => _validationError = 'Informe o título da tarefa.');
      return;
    }
    Navigator.of(context).pop(
      TaskFormResult(
        title: title,
        description: _descriptionController.text.trim(),
        pillar: _pillarController.text.trim().isEmpty
            ? null
            : _pillarController.text.trim(),
        priority: _priority,
        status: _status,
        dueDate: _dueDate,
        responsibleUserId: _responsibleUserId,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      key: const ValueKey('task-form-dialog'),
      title: Text(widget.task == null ? 'Nova tarefa' : 'Editar tarefa'),
      content: SizedBox(
        width: 560,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_validationError != null) ...[
                Text(
                  _validationError!,
                  style: const TextStyle(
                    color: AppColors.danger,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
              ],
              TextField(
                key: const ValueKey('task-title-field'),
                controller: _titleController,
                decoration: const InputDecoration(labelText: 'Título'),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const ValueKey('task-description-field'),
                controller: _descriptionController,
                minLines: 3,
                maxLines: 5,
                decoration: const InputDecoration(labelText: 'Descrição'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _pillarController,
                decoration: const InputDecoration(
                  labelText: 'Pilar',
                  hintText: 'Ex.: Estratégia, Pessoas ou Processos',
                ),
              ),
              const SizedBox(height: 12),
              LayoutBuilder(
                builder: (context, constraints) {
                  final fields = [
                    DropdownButtonFormField<ActionPlanTaskPriority>(
                      initialValue: _priority,
                      decoration: const InputDecoration(
                        labelText: 'Prioridade',
                      ),
                      items: ActionPlanTaskPriority.values
                          .map(
                            (priority) => DropdownMenuItem(
                              value: priority,
                              child: Text(_priorityStyle(priority).$1),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        if (value != null) setState(() => _priority = value);
                      },
                    ),
                    DropdownButtonFormField<ActionPlanTaskStatus>(
                      initialValue: _status,
                      decoration: const InputDecoration(labelText: 'Status'),
                      items: ActionPlanTaskStatus.values
                          .map(
                            (status) => DropdownMenuItem(
                              value: status,
                              child: Text(_statusStyle(status).$1),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        if (value != null) setState(() => _status = value);
                      },
                    ),
                  ];
                  if (constraints.maxWidth >= 480) {
                    return Row(
                      children: [
                        Expanded(child: fields[0]),
                        const SizedBox(width: 12),
                        Expanded(child: fields[1]),
                      ],
                    );
                  }
                  return Column(
                    children: [
                      fields[0],
                      const SizedBox(height: 12),
                      fields[1],
                    ],
                  );
                },
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String?>(
                key: const ValueKey('task-assignee-field'),
                initialValue: _responsibleUserId,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Responsável'),
                items: [
                  const DropdownMenuItem<String?>(
                    value: null,
                    child: Text('Sem responsável'),
                  ),
                  ...widget.assignees.map(
                    (assignee) => DropdownMenuItem<String?>(
                      value: assignee.id,
                      child: Text(
                        '${assignee.name} · ${assignee.jobRole} · ${assignee.department}',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                ],
                onChanged: (value) =>
                    setState(() => _responsibleUserId = value),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _dueDate == null
                          ? 'Prazo não definido'
                          : 'Prazo ${DateFormatter.formatDate(_dueDate!)}',
                    ),
                  ),
                  if (_dueDate != null)
                    TextButton(
                      onPressed: () => setState(() => _dueDate = null),
                      child: const Text('Limpar'),
                    ),
                  TextButton(
                    onPressed: _pickDate,
                    child: const Text('Selecionar prazo'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          key: const ValueKey('save-task'),
          onPressed: _submit,
          child: Text(widget.task == null ? 'Criar' : 'Salvar alterações'),
        ),
      ],
    );
  }
}

(String, Color) _priorityStyle(ActionPlanTaskPriority priority) {
  switch (priority) {
    case ActionPlanTaskPriority.low:
      return (actionPlanPriorityLabel(priority), AppColors.teal);
    case ActionPlanTaskPriority.medium:
      return (actionPlanPriorityLabel(priority), AppColors.amber);
    case ActionPlanTaskPriority.high:
      return (actionPlanPriorityLabel(priority), AppColors.danger);
    case ActionPlanTaskPriority.critical:
      return (actionPlanPriorityLabel(priority), const Color(0xFF7A1828));
  }
}

(String, Color) _statusStyle(ActionPlanTaskStatus status) {
  switch (status) {
    case ActionPlanTaskStatus.todo:
      return (actionPlanStatusLabel(status), AppColors.textMuted);
    case ActionPlanTaskStatus.inProgress:
      return (actionPlanStatusLabel(status), AppColors.indigo);
    case ActionPlanTaskStatus.done:
      return (actionPlanStatusLabel(status), AppColors.success);
    case ActionPlanTaskStatus.canceled:
      return (actionPlanStatusLabel(status), AppColors.danger);
  }
}

ActionPlanTaskStatus? _employeeNextStatus(ActionPlanTaskStatus status) {
  switch (status) {
    case ActionPlanTaskStatus.todo:
      return ActionPlanTaskStatus.inProgress;
    case ActionPlanTaskStatus.inProgress:
      return ActionPlanTaskStatus.done;
    case ActionPlanTaskStatus.done:
    case ActionPlanTaskStatus.canceled:
      return null;
  }
}

String _sourceLabel(ActionPlanTaskSource source) {
  return actionPlanSourceLabel(source);
}

String _versionStatusLabel(ActionPlanVersionStatus status) {
  switch (status) {
    case ActionPlanVersionStatus.draft:
      return 'Rascunho';
    case ActionPlanVersionStatus.active:
      return 'Ativo';
    case ActionPlanVersionStatus.completed:
      return 'Concluído';
    case ActionPlanVersionStatus.archived:
      return 'Arquivado';
  }
}

String _scopeLabel(ActionPlanTaskScope scope) {
  switch (scope) {
    case ActionPlanTaskScope.all:
      return 'Todas';
    case ActionPlanTaskScope.mine:
      return 'Minhas tarefas';
    case ActionPlanTaskScope.overdue:
      return 'Atrasadas';
    case ActionPlanTaskScope.dueSoon:
      return 'Vencem em breve';
    case ActionPlanTaskScope.critical:
      return 'Críticas';
    case ActionPlanTaskScope.completed:
      return 'Concluídas';
  }
}
