import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../../../core/widgets/section_header.dart';
import '../../domain/enums/action_status.dart';
import '../../../clients/domain/entities/client.dart';
import '../../../clients/presentation/providers/client_providers.dart';
import '../../domain/entities/action_item.dart';
import '../providers/action_plan_providers.dart';

class PlanTemplate {
  const PlanTemplate({
    required this.name,
    required this.objective,
    required this.area,
    required this.steps,
    required this.priority,
    required this.estimatedDays,
  });

  final String name;
  final String objective;
  final String area;
  final List<String> steps;
  final String priority;
  final int estimatedDays;
}

const _planTemplates = <PlanTemplate>[
  PlanTemplate(
    name: 'Melhoria de atendimento',
    objective: 'Elevar padrao de resposta ao cliente e reduzir retrabalho.',
    area: 'Atendimento',
    steps: ['Mapear jornada', 'Criar script base', 'Treinar time', 'Medir NPS'],
    priority: 'Alta',
    estimatedDays: 30,
  ),
  PlanTemplate(
    name: 'Padronizacao de processos',
    objective: 'Documentar rotinas e definir donos para operacao critica.',
    area: 'Processos',
    steps: ['Mapear fluxos', 'Padronizar etapas', 'Definir indicadores', 'Acompanhar adesao'],
    priority: 'Alta',
    estimatedDays: 45,
  ),
  PlanTemplate(
    name: 'Organizacao financeira basica',
    objective: 'Trazer visibilidade de caixa e rotina minima de controle.',
    area: 'Financeiro',
    steps: ['Classificar contas', 'Fechar fluxo de caixa', 'Criar rotina semanal'],
    priority: 'Media',
    estimatedDays: 21,
  ),
  PlanTemplate(
    name: 'Treinamento da equipe',
    objective: 'Alinhar equipe em rotina, meta e qualidade de entrega.',
    area: 'Pessoas',
    steps: ['Definir gaps', 'Montar agenda', 'Aplicar treinamentos', 'Revisar performance'],
    priority: 'Media',
    estimatedDays: 20,
  ),
  PlanTemplate(
    name: 'Melhoria comercial',
    objective: 'Organizar funil e aumentar previsibilidade de conversao.',
    area: 'Comercial',
    steps: ['Revisar CRM', 'Padronizar pipeline', 'Criar ritos comerciais', 'Acompanhar metas'],
    priority: 'Alta',
    estimatedDays: 35,
  ),
  PlanTemplate(
    name: 'Organizacao do estoque',
    objective: 'Reduzir rupturas e melhorar giro de itens prioritarios.',
    area: 'Operacoes',
    steps: ['Classificar itens', 'Definir minimo', 'Revisar compras', 'Monitorar giro'],
    priority: 'Media',
    estimatedDays: 25,
  ),
];

class ActionPlanPage extends ConsumerWidget {
  const ActionPlanPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plans = ref.watch(actionPlanControllerProvider);

    return AppPageScaffold(
      title: 'Planos de acao',
      subtitle:
          'Modelos prontos e planos personalizados para as empresas acompanhadas pelo consultor.',
      actions: [
        FilledButton.icon(
          onPressed: () => _openPlanDialog(context, ref),
          icon: const Icon(Icons.add),
          label: const Text('Novo plano personalizado'),
        ),
      ],
      child: ListView(
        children: [
          const SectionHeader(
            title: 'Modelos prontos',
            subtitle:
                'Modelos base para aplicar rapidamente em uma empresa e demonstrar a metodologia.',
          ),
          LayoutBuilder(
            builder: (context, constraints) {
              final columns = constraints.maxWidth >= 1180
                  ? 3
                  : constraints.maxWidth >= 760
                      ? 2
                      : 1;
              final spacing = 16.0;
              final width = columns == 1
                  ? constraints.maxWidth
                  : (constraints.maxWidth - (spacing * (columns - 1))) / columns;
              return Wrap(
                spacing: spacing,
                runSpacing: spacing,
                children: [
                  for (final template in _planTemplates)
                    SizedBox(
                      width: width,
                      child: _TemplateCard(
                        template: template,
                        onApply: () => _applyTemplate(context, ref, template),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: 20),
          const SectionHeader(
            title: 'Planos em andamento',
            subtitle:
                'Planos ativos vinculados a empresas, com prioridade, prazo e proxima acao.',
          ),
          const SizedBox(height: 8),
          if (plans.isEmpty)
            const AppEmptyState(
              title: 'Nenhum plano em andamento',
              message: 'Aplique um modelo pronto ou crie um plano personalizado.',
              icon: Icons.task_alt_outlined,
            )
          else
            ...plans.map(
              (plan) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _ActivePlanCard(
                  plan: plan,
                  onEdit: () => _openPlanDialog(context, ref, plan: plan),
                  onStatusChanged: (status) => ref
                      .read(actionPlanControllerProvider.notifier)
                      .updateStatus(plan.id, status),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _applyTemplate(
    BuildContext context,
    WidgetRef ref,
    PlanTemplate template,
  ) async {
    final companies = ref.read(clientsControllerProvider).valueOrNull ?? const <Client>[];
    if (companies.isEmpty) {
      return;
    }
    final company = await showDialog<Client>(
      context: context,
      builder: (_) => _CompanySelectionDialog(companies: companies),
    );
    if (company == null) {
      return;
    }
    ref.read(actionPlanControllerProvider.notifier).addItem(
          ActionItem(
            id: 'a-${DateTime.now().microsecondsSinceEpoch}',
            title: template.name,
            client: company.name,
            dueDate: DateTime.now().add(Duration(days: template.estimatedDays)),
            priority: template.priority,
            status: ActionStatus.pending,
            owner: 'Consultor responsavel',
            description: template.steps.first,
          ),
        );
    AppFeedback.showSnackBar(
      context,
      message: 'Modelo aplicado em ${company.name}.',
      type: AppFeedbackType.success,
    );
  }

  Future<void> _openPlanDialog(
    BuildContext context,
    WidgetRef ref, {
    ActionItem? plan,
  }) async {
    final result = await showDialog<ActionItem>(
      context: context,
      builder: (_) => _PlanEditorDialog(plan: plan),
    );
    if (result == null) {
      return;
    }
    if (plan == null) {
      ref.read(actionPlanControllerProvider.notifier).addItem(result);
    } else {
      ref.read(actionPlanControllerProvider.notifier).updateItem(result);
    }
  }
}

class _TemplateCard extends StatelessWidget {
  const _TemplateCard({
    required this.template,
    required this.onApply,
  });

  final PlanTemplate template;
  final VoidCallback onApply;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              template.name,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 8),
            Text(template.objective),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(label: Text(template.area)),
                Chip(label: Text('Prioridade ${template.priority}')),
                Chip(label: Text('Prazo ${template.estimatedDays} dias')),
              ],
            ),
            const SizedBox(height: 12),
            ...template.steps.map(
              (step) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.check_circle_outline, size: 18),
                    const SizedBox(width: 8),
                    Expanded(child: Text(step)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onApply,
                icon: const Icon(Icons.playlist_add_check_circle_outlined),
                label: const Text('Aplicar a uma empresa'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActivePlanCard extends StatelessWidget {
  const _ActivePlanCard({
    required this.plan,
    required this.onEdit,
    required this.onStatusChanged,
  });

  final ActionItem plan;
  final VoidCallback onEdit;
  final ValueChanged<ActionStatus> onStatusChanged;

  @override
  Widget build(BuildContext context) {
    final progress = switch (plan.status) {
      ActionStatus.pending => 0.25,
      ActionStatus.inProgress => 0.65,
      ActionStatus.done => 1.0,
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        plan.title,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text('Empresa vinculada: ${plan.client}'),
                    ],
                  ),
                ),
                Chip(label: Text(plan.priority)),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(label: Text(_statusLabel(plan.status))),
                Chip(label: Text('Prazo ${plan.dueDate.day}/${plan.dueDate.month}')),
                Chip(label: Text('Responsavel ${plan.owner ?? 'Consultor'}')),
              ],
            ),
            const SizedBox(height: 12),
            LinearProgressIndicator(value: progress, minHeight: 10),
            const SizedBox(height: 8),
            Text('Progresso ${(progress * 100).round()}%'),
            const SizedBox(height: 12),
            Text(
              'Proxima acao: ${plan.description.isEmpty ? 'Definir proxima etapa' : plan.description}',
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (final status in ActionStatus.values)
                  ChoiceChip(
                    label: Text(_statusLabel(status)),
                    selected: status == plan.status,
                    onSelected: (_) => onStatusChanged(status),
                  ),
                TextButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Editar'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static String _statusLabel(ActionStatus status) {
    switch (status) {
      case ActionStatus.pending:
        return 'Pendente';
      case ActionStatus.inProgress:
        return 'Em andamento';
      case ActionStatus.done:
        return 'Concluido';
    }
  }
}

class _CompanySelectionDialog extends StatefulWidget {
  const _CompanySelectionDialog({required this.companies});

  final List<Client> companies;

  @override
  State<_CompanySelectionDialog> createState() => _CompanySelectionDialogState();
}

class _CompanySelectionDialogState extends State<_CompanySelectionDialog> {
  Client? _selected;

  @override
  void initState() {
    super.initState();
    _selected = widget.companies.first;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Aplicar modelo'),
      content: DropdownButtonFormField<String>(
        value: _selected?.id,
        decoration: const InputDecoration(labelText: 'Empresa'),
        items: widget.companies
            .map(
              (company) => DropdownMenuItem(
                value: company.id,
                child: Text(company.name),
              ),
            )
            .toList(),
        onChanged: (value) {
          setState(() {
            _selected = widget.companies.firstWhere((item) => item.id == value);
          });
        },
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, _selected),
          child: const Text('Aplicar'),
        ),
      ],
    );
  }
}

class _PlanEditorDialog extends StatefulWidget {
  const _PlanEditorDialog({this.plan});

  final ActionItem? plan;

  @override
  State<_PlanEditorDialog> createState() => _PlanEditorDialogState();
}

class _PlanEditorDialogState extends State<_PlanEditorDialog> {
  late final TextEditingController _titleController;
  late final TextEditingController _companyController;
  late final TextEditingController _nextActionController;
  late final TextEditingController _ownerController;
  late DateTime _dueDate;
  late String _priority;
  late ActionStatus _status;

  @override
  void initState() {
    super.initState();
    final plan = widget.plan;
    _titleController = TextEditingController(text: plan?.title ?? '');
    _companyController = TextEditingController(text: plan?.client ?? '');
    _nextActionController = TextEditingController(text: plan?.description ?? '');
    _ownerController = TextEditingController(text: plan?.owner ?? 'Consultor responsavel');
    _dueDate = plan?.dueDate ?? DateTime.now().add(const Duration(days: 30));
    _priority = plan?.priority ?? 'Media';
    _status = plan?.status ?? ActionStatus.pending;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _companyController.dispose();
    _nextActionController.dispose();
    _ownerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.plan == null ? 'Novo plano' : 'Editar plano'),
      content: SizedBox(
        width: 560,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _titleController,
                decoration: const InputDecoration(labelText: 'Nome do plano'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _companyController,
                decoration: const InputDecoration(labelText: 'Empresa vinculada'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _nextActionController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Proximas acoes'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _ownerController,
                decoration: const InputDecoration(labelText: 'Responsavel'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _priority,
                decoration: const InputDecoration(labelText: 'Prioridade'),
                items: const [
                  DropdownMenuItem(value: 'Alta', child: Text('Alta')),
                  DropdownMenuItem(value: 'Media', child: Text('Media')),
                  DropdownMenuItem(value: 'Baixa', child: Text('Baixa')),
                ],
                onChanged: (value) => setState(() => _priority = value ?? 'Media'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<ActionStatus>(
                value: _status,
                decoration: const InputDecoration(labelText: 'Status'),
                items: const [
                  DropdownMenuItem(value: ActionStatus.pending, child: Text('Pendente')),
                  DropdownMenuItem(
                    value: ActionStatus.inProgress,
                    child: Text('Em andamento'),
                  ),
                  DropdownMenuItem(value: ActionStatus.done, child: Text('Concluido')),
                ],
                onChanged: (value) =>
                    setState(() => _status = value ?? ActionStatus.pending),
              ),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Prazo estimado'),
                subtitle: Text(
                  '${_dueDate.day}/${_dueDate.month}/${_dueDate.year}',
                ),
                trailing: IconButton(
                  onPressed: _pickDate,
                  icon: const Icon(Icons.calendar_month_outlined),
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _save,
          child: const Text('Salvar'),
        ),
      ],
    );
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _dueDate = picked);
    }
  }

  void _save() {
    if (_titleController.text.trim().isEmpty ||
        _companyController.text.trim().isEmpty) {
      return;
    }
    Navigator.pop(
      context,
      ActionItem(
        id: widget.plan?.id ?? 'a-${DateTime.now().microsecondsSinceEpoch}',
        title: _titleController.text.trim(),
        client: _companyController.text.trim(),
        dueDate: _dueDate,
        priority: _priority,
        status: _status,
        owner: _ownerController.text.trim(),
        description: _nextActionController.text.trim(),
      ),
    );
  }
}
