import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/errors/api_error_presenter.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/app_page_scaffold.dart';
import '../../auth/presentation/providers/auth_providers.dart';
import '../data/strategy_service.dart';
import 'strategy_labels.dart';

class StrategyPage extends ConsumerStatefulWidget {
  const StrategyPage({super.key});
  @override
  ConsumerState<StrategyPage> createState() => _StrategyPageState();
}

class _StrategyPageState extends ConsumerState<StrategyPage> {
  bool loading = true, saving = false;
  String? error;
  Map<String, dynamic> data = const {};
  List<Map<String, dynamic>> assignees = const [];
  StrategyService get service => StrategyService(ref.read(dioProvider));
  bool get canEdit =>
      data['canEdit'] == true &&
      ref.read(authControllerProvider).user?.role.toUpperCase() == 'ADMIN';

  @override
  void initState() {
    super.initState();
    Future.microtask(load);
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final result = await service.fetch();
      final people = result['canEdit'] == true
          ? await service.assignees()
          : const <Map<String, dynamic>>[];
      if (mounted) {
        setState(() {
          data = result;
          assignees = people;
          loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          error = userFriendlyError(e);
          loading = false;
        });
      }
    }
  }

  Future<void> mutate(Future<void> Function() action, String message) async {
    setState(() => saving = true);
    try {
      await action();
      await load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(userFriendlyError(e)),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Future<void> editProfile() async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => StrategyProfileDialog(profile: _map(data['profile'])),
    );
    if (result != null) {
      await mutate(
        () => service.saveProfile(result),
        'Direcionadores estratégicos salvos.',
      );
    }
  }

  Future<void> editObjective([Map<String, dynamic>? value]) async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) =>
          StrategicObjectiveDialog(value: value, assignees: assignees),
    );
    if (result == null) return;
    await mutate(
      () => value == null
          ? service.createObjective(result)
          : service.updateObjective(value['id'].toString(), result),
      value == null ? 'Objetivo criado.' : 'Objetivo atualizado.',
    );
  }

  Future<void> editGoal(
    String objectiveId, [
    Map<String, dynamic>? value,
  ]) async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => StrategicGoalDialog(value: value),
    );
    if (result == null) return;
    await mutate(
      () => value == null
          ? service.createGoal(objectiveId, result)
          : service.updateGoal(value['id'].toString(), result),
      value == null ? 'Meta criada.' : 'Meta atualizada.',
    );
  }

  Future<void> editSwot(String category, [Map<String, dynamic>? value]) async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => SwotItemDialog(category: category, value: value),
    );
    if (result == null) return;
    await mutate(
      () => value == null
          ? service.createSwot(result)
          : service.updateSwot(value['id'].toString(), result),
      value == null ? 'Item SWOT adicionado.' : 'Item SWOT atualizado.',
    );
  }

  Future<void> removeSwot(Map<String, dynamic> value) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Remover item SWOT?'),
        content: Text('O item “${value['title']}” será removido.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remover'),
          ),
        ],
      ),
    );
    if (ok == true) {
      await mutate(
        () => service.deleteSwot(value['id'].toString()),
        'Item SWOT removido.',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final role = ref.watch(authControllerProvider).user?.role.toUpperCase();
    return AppPageScaffold(
      title: 'Estratégia',
      subtitle: role == 'EMPLOYEE'
          ? 'Conheça o direcionamento estratégico da empresa.'
          : 'Defina os direcionadores, objetivos, metas e análise SWOT da empresa.',
      actions: [
        OutlinedButton.icon(
          onPressed: loading ? null : load,
          icon: const Icon(Icons.refresh),
          label: const Text('Atualizar'),
        ),
      ],
      child: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(error!),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: load,
                    child: const Text('Tentar novamente'),
                  ),
                ],
              ),
            )
          : StrategyContent(
              data: data,
              canEdit: canEdit && !saving,
              onEditProfile: editProfile,
              onAddObjective: () => editObjective(),
              onEditObjective: editObjective,
              onAddGoal: (id) => editGoal(id),
              onEditGoal: (id, goal) => editGoal(id, goal),
              onAddSwot: (category) => editSwot(category),
              onEditSwot: (item) => editSwot(item['category'].toString(), item),
              onDeleteSwot: removeSwot,
            ),
    );
  }
}

class StrategyContent extends StatelessWidget {
  const StrategyContent({
    super.key,
    required this.data,
    required this.canEdit,
    required this.onEditProfile,
    required this.onAddObjective,
    required this.onEditObjective,
    required this.onAddGoal,
    required this.onEditGoal,
    required this.onAddSwot,
    required this.onEditSwot,
    required this.onDeleteSwot,
  });
  final Map<String, dynamic> data;
  final bool canEdit;
  final VoidCallback onEditProfile, onAddObjective;
  final ValueChanged<Map<String, dynamic>> onEditObjective;
  final ValueChanged<String> onAddGoal;
  final void Function(String, Map<String, dynamic>) onEditGoal;
  final ValueChanged<String> onAddSwot;
  final ValueChanged<Map<String, dynamic>> onEditSwot, onDeleteSwot;
  @override
  Widget build(BuildContext context) {
    final profile = _map(data['profile']), summary = _map(data['summary']);
    final objectives = _list(data['objectives']),
        swot = _list(data['swotItems']);
    return ListView(
      key: const ValueKey('strategy-content'),
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _Metric(
              label: 'Objetivos ativos',
              value: '${summary['activeObjectives'] ?? 0}',
              icon: Icons.flag_outlined,
            ),
            _Metric(
              label: 'Metas próximas do prazo',
              value: '${summary['goalsDueSoon'] ?? 0}',
              icon: Icons.event_outlined,
            ),
            _Metric(
              label: 'Progresso estratégico',
              value: '${summary['progress'] ?? 0}%',
              icon: Icons.trending_up,
            ),
          ],
        ),
        const SizedBox(height: 16),
        _ProfileCard(profile: profile, canEdit: canEdit, onEdit: onEditProfile),
        const SizedBox(height: 20),
        _Header(
          title: 'Objetivos estratégicos',
          subtitle: 'Prioridades que orientam a execução da empresa.',
          button: canEdit ? 'Novo objetivo' : null,
          onPressed: onAddObjective,
        ),
        const SizedBox(height: 8),
        if (objectives.isEmpty)
          const _Empty(
            icon: Icons.flag_outlined,
            text: 'Nenhum objetivo estratégico foi definido ainda.',
          )
        else
          ...objectives.map(
            (o) => _ObjectiveCard(
              value: o,
              canEdit: canEdit,
              onEdit: () => onEditObjective(o),
              onAddGoal: () => onAddGoal(o['id'].toString()),
              onEditGoal: (g) => onEditGoal(o['id'].toString(), g),
            ),
          ),
        const SizedBox(height: 20),
        const _Header(
          title: 'Análise SWOT',
          subtitle: 'Forças, fraquezas, oportunidades e ameaças da empresa.',
        ),
        const SizedBox(height: 8),
        LayoutBuilder(
          builder: (context, c) => GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: c.maxWidth >= 768 ? 2 : 1,
            childAspectRatio: c.maxWidth >= 768 ? 1.35 : 1.15,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            children: ['STRENGTH', 'WEAKNESS', 'OPPORTUNITY', 'THREAT']
                .map(
                  (cat) => _SwotCard(
                    category: cat,
                    items: swot.where((i) => i['category'] == cat).toList(),
                    canEdit: canEdit,
                    onAdd: () => onAddSwot(cat),
                    onEdit: onEditSwot,
                    onDelete: onDeleteSwot,
                  ),
                )
                .toList(),
          ),
        ),
      ],
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value, required this.icon});
  final String label, value;
  final IconData icon;
  @override
  Widget build(BuildContext c) => SizedBox(
    width: 220,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(child: Icon(icon)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    style: Theme.of(c).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(label),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _Header extends StatelessWidget {
  const _Header({
    required this.title,
    required this.subtitle,
    this.button,
    this.onPressed,
  });
  final String title, subtitle;
  final String? button;
  final VoidCallback? onPressed;
  @override
  Widget build(BuildContext c) => Row(
    children: [
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(
                c,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            Text(subtitle),
          ],
        ),
      ),
      if (button != null)
        FilledButton.icon(
          onPressed: onPressed,
          icon: const Icon(Icons.add),
          label: Text(button!),
        ),
    ],
  );
}

class _Empty extends StatelessWidget {
  const _Empty({required this.icon, required this.text});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext c) => Card(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Icon(icon, size: 42, color: AppColors.textMuted),
          const SizedBox(height: 8),
          Text(text, textAlign: TextAlign.center),
        ],
      ),
    ),
  );
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({
    required this.profile,
    required this.canEdit,
    required this.onEdit,
  });
  final Map<String, dynamic> profile;
  final bool canEdit;
  final VoidCallback onEdit;
  @override
  Widget build(BuildContext c) {
    final fields = [
      (
        'Missão',
        'mission',
        'Defina a missão da empresa para registrar seu propósito e direcionamento.',
      ),
      (
        'Visão',
        'vision',
        'Registre a visão de futuro que orienta as decisões.',
      ),
      (
        'Valores',
        'values',
        'Liste os princípios que guiam o comportamento da empresa.',
      ),
    ];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Header(
              title: 'Missão, visão e valores',
              subtitle: 'Direcionadores essenciais da identidade empresarial.',
              button: canEdit ? 'Editar' : null,
              onPressed: onEdit,
            ),
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, x) => Wrap(
                spacing: 12,
                runSpacing: 12,
                children: fields
                    .map(
                      (f) => SizedBox(
                        width: x.maxWidth >= 900
                            ? (x.maxWidth - 24) / 3
                            : x.maxWidth,
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceMuted,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                f.$1,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                profile[f.$2]?.toString().trim().isNotEmpty ==
                                        true
                                    ? profile[f.$2].toString()
                                    : f.$3,
                              ),
                            ],
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ObjectiveCard extends StatelessWidget {
  const _ObjectiveCard({
    required this.value,
    required this.canEdit,
    required this.onEdit,
    required this.onAddGoal,
    required this.onEditGoal,
  });
  final Map<String, dynamic> value;
  final bool canEdit;
  final VoidCallback onEdit, onAddGoal;
  final ValueChanged<Map<String, dynamic>> onEditGoal;
  @override
  Widget build(BuildContext c) {
    final goals = _list(value['goals']);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    value['title']?.toString() ?? 'Objetivo',
                    style: Theme.of(c).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                if (canEdit)
                  IconButton(
                    onPressed: onEdit,
                    tooltip: 'Editar objetivo',
                    icon: const Icon(Icons.edit_outlined),
                  ),
              ],
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(label: Text(strategyStatusLabel(value['status']))),
                Chip(
                  label: Text(
                    'Prioridade ${strategyPriorityLabel(value['priority'])}',
                  ),
                ),
                if (value['responsibleUserName'] != null)
                  Chip(
                    label: Text('Responsável ${value['responsibleUserName']}'),
                  ),
              ],
            ),
            if ((value['description'] ?? '').toString().isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(value['description'].toString()),
              ),
            const Divider(height: 24),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Metas',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                if (canEdit)
                  TextButton.icon(
                    onPressed: onAddGoal,
                    icon: const Icon(Icons.add),
                    label: const Text('Adicionar meta'),
                  ),
              ],
            ),
            if (goals.isEmpty)
              const Text(
                'Nenhuma meta associada a este objetivo.',
                style: TextStyle(color: AppColors.textSecondary),
              )
            else
              ...goals.map(
                (g) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(g['title']?.toString() ?? 'Meta'),
                  subtitle: Text(
                    [
                      strategyStatusLabel(g['status']),
                      _goalProgress(g),
                      _dateLabel(g['dueDate']),
                    ].where((x) => x.isNotEmpty).join(' · '),
                  ),
                  trailing: canEdit
                      ? IconButton(
                          onPressed: () => onEditGoal(g),
                          icon: const Icon(Icons.edit_outlined),
                        )
                      : null,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SwotCard extends StatelessWidget {
  const _SwotCard({
    required this.category,
    required this.items,
    required this.canEdit,
    required this.onAdd,
    required this.onEdit,
    required this.onDelete,
  });
  final String category;
  final List<Map<String, dynamic>> items;
  final bool canEdit;
  final VoidCallback onAdd;
  final ValueChanged<Map<String, dynamic>> onEdit, onDelete;
  @override
  Widget build(BuildContext c) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  swotCategoryLabel(category),
                  style: Theme.of(c).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              if (canEdit)
                IconButton(
                  onPressed: onAdd,
                  tooltip: 'Adicionar item',
                  icon: const Icon(Icons.add_circle_outline),
                ),
            ],
          ),
          if (items.isEmpty)
            const Expanded(
              child: Center(
                child: Text(
                  'Nenhum item cadastrado.',
                  style: TextStyle(color: AppColors.textSecondary),
                ),
              ),
            )
          else
            Expanded(
              child: ListView(
                children: items
                    .map(
                      (i) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(i['title']?.toString() ?? ''),
                        subtitle: (i['description'] ?? '').toString().isEmpty
                            ? null
                            : Text(i['description'].toString()),
                        trailing: canEdit
                            ? PopupMenuButton<String>(
                                onSelected: (v) =>
                                    v == 'edit' ? onEdit(i) : onDelete(i),
                                itemBuilder: (_) => const [
                                  PopupMenuItem(
                                    value: 'edit',
                                    child: Text('Editar'),
                                  ),
                                  PopupMenuItem(
                                    value: 'delete',
                                    child: Text('Remover'),
                                  ),
                                ],
                              )
                            : null,
                      ),
                    )
                    .toList(),
              ),
            ),
        ],
      ),
    ),
  );
}

class StrategyProfileDialog extends StatefulWidget {
  const StrategyProfileDialog({super.key, required this.profile});
  final Map<String, dynamic> profile;
  @override
  State<StrategyProfileDialog> createState() => _StrategyProfileDialogState();
}

class _StrategyProfileDialogState extends State<StrategyProfileDialog> {
  late final List<TextEditingController> c;
  @override
  void initState() {
    super.initState();
    c = ['mission', 'vision', 'values']
        .map(
          (k) =>
              TextEditingController(text: widget.profile[k]?.toString() ?? ''),
        )
        .toList();
  }

  @override
  void dispose() {
    for (final x in c) {
      x.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext x) => AlertDialog(
    title: const Text('Missão, visão e valores'),
    content: SizedBox(
      width: 600,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _field(c[0], 'Missão'),
            _field(c[1], 'Visão'),
            _field(c[2], 'Valores'),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(x),
        child: const Text('Cancelar'),
      ),
      FilledButton(
        onPressed: () => Navigator.pop(x, {
          'mission': c[0].text,
          'vision': c[1].text,
          'values': c[2].text,
        }),
        child: const Text('Salvar'),
      ),
    ],
  );
}

class StrategicObjectiveDialog extends StatefulWidget {
  const StrategicObjectiveDialog({
    super.key,
    this.value,
    required this.assignees,
  });
  final Map<String, dynamic>? value;
  final List<Map<String, dynamic>> assignees;
  @override
  State<StrategicObjectiveDialog> createState() =>
      _StrategicObjectiveDialogState();
}

class _StrategicObjectiveDialogState extends State<StrategicObjectiveDialog> {
  late final List<TextEditingController> c;
  late String status, priority;
  String? responsible;
  @override
  void initState() {
    super.initState();
    final v = widget.value ?? {};
    c = [
      'title',
      'description',
      'startDate',
      'dueDate',
      'notes',
    ].map((k) => TextEditingController(text: v[k]?.toString() ?? '')).toList();
    status = v['status']?.toString() ?? 'PLANNED';
    priority = v['priority']?.toString() ?? 'MEDIUM';
    responsible = v['responsibleUserId']?.toString();
  }

  @override
  void dispose() {
    for (final x in c) {
      x.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext x) => AlertDialog(
    title: Text(widget.value == null ? 'Novo objetivo' : 'Editar objetivo'),
    content: SizedBox(
      width: 620,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _field(c[0], 'Título', lines: 1),
            _field(c[1], 'Descrição'),
            Row(
              children: [
                Expanded(
                  child: _dropdown(
                    'Status',
                    status,
                    ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'],
                    strategyStatusLabel,
                    (v) => setState(() => status = v),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _dropdown(
                    'Prioridade',
                    priority,
                    ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
                    strategyPriorityLabel,
                    (v) => setState(() => priority = v),
                  ),
                ),
              ],
            ),
            _field(c[2], 'Data inicial (AAAA-MM-DD)', lines: 1),
            _field(c[3], 'Prazo (AAAA-MM-DD)', lines: 1),
            DropdownButtonFormField<String?>(
              initialValue: responsible,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Responsável opcional',
              ),
              items: [
                const DropdownMenuItem(
                  value: null,
                  child: Text('Sem responsável'),
                ),
                ...widget.assignees.map(
                  (a) => DropdownMenuItem(
                    value: a['id']?.toString(),
                    child: Text(a['name']?.toString() ?? 'Colaborador'),
                  ),
                ),
              ],
              onChanged: (v) => setState(() => responsible = v),
            ),
            _field(c[4], 'Observações'),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(x),
        child: const Text('Cancelar'),
      ),
      FilledButton(
        onPressed: () => Navigator.pop(x, {
          'title': c[0].text,
          'description': c[1].text,
          'status': status,
          'priority': priority,
          'startDate': c[2].text,
          'dueDate': c[3].text,
          'responsibleUserId': responsible,
          'notes': c[4].text,
        }),
        child: const Text('Salvar'),
      ),
    ],
  );
}

class StrategicGoalDialog extends StatefulWidget {
  const StrategicGoalDialog({super.key, this.value});
  final Map<String, dynamic>? value;
  @override
  State<StrategicGoalDialog> createState() => _StrategicGoalDialogState();
}

class _StrategicGoalDialogState extends State<StrategicGoalDialog> {
  late final List<TextEditingController> c;
  late String status;
  @override
  void initState() {
    super.initState();
    final v = widget.value ?? {};
    c = [
      'title',
      'description',
      'initialValue',
      'targetValue',
      'currentValue',
      'unit',
      'dueDate',
    ].map((k) => TextEditingController(text: v[k]?.toString() ?? '')).toList();
    status = v['status']?.toString() ?? 'PLANNED';
  }

  @override
  void dispose() {
    for (final x in c) {
      x.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext x) => AlertDialog(
    title: Text(widget.value == null ? 'Nova meta' : 'Editar meta'),
    content: SizedBox(
      width: 600,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _field(c[0], 'Título', lines: 1),
            _field(c[1], 'Descrição'),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                SizedBox(
                  width: 170,
                  child: _field(c[2], 'Valor inicial', lines: 1),
                ),
                SizedBox(
                  width: 170,
                  child: _field(c[3], 'Valor alvo', lines: 1),
                ),
                SizedBox(
                  width: 170,
                  child: _field(c[4], 'Valor atual', lines: 1),
                ),
              ],
            ),
            _field(c[5], 'Unidade (ex.: %, clientes)', lines: 1),
            _field(c[6], 'Prazo (AAAA-MM-DD)', lines: 1),
            _dropdown(
              'Status',
              status,
              ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'],
              strategyStatusLabel,
              (v) => setState(() => status = v),
            ),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(x),
        child: const Text('Cancelar'),
      ),
      FilledButton(
        onPressed: () => Navigator.pop(x, {
          'title': c[0].text,
          'description': c[1].text,
          'initialValue': c[2].text,
          'targetValue': c[3].text,
          'currentValue': c[4].text,
          'unit': c[5].text,
          'dueDate': c[6].text,
          'status': status,
        }),
        child: const Text('Salvar'),
      ),
    ],
  );
}

class SwotItemDialog extends StatefulWidget {
  const SwotItemDialog({super.key, required this.category, this.value});
  final String category;
  final Map<String, dynamic>? value;
  @override
  State<SwotItemDialog> createState() => _SwotItemDialogState();
}

class _SwotItemDialogState extends State<SwotItemDialog> {
  late final TextEditingController title, description;
  @override
  void initState() {
    super.initState();
    title = TextEditingController(
      text: widget.value?['title']?.toString() ?? '',
    );
    description = TextEditingController(
      text: widget.value?['description']?.toString() ?? '',
    );
  }

  @override
  void dispose() {
    title.dispose();
    description.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext x) => AlertDialog(
    title: Text(
      '${widget.value == null ? 'Adicionar' : 'Editar'} · ${swotCategoryLabel(widget.category)}',
    ),
    content: SizedBox(
      width: 520,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _field(title, 'Título', lines: 1),
          _field(description, 'Descrição'),
        ],
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(x),
        child: const Text('Cancelar'),
      ),
      FilledButton(
        onPressed: () => Navigator.pop(x, {
          'category': widget.category,
          'title': title.text,
          'description': description.text,
        }),
        child: const Text('Salvar'),
      ),
    ],
  );
}

Widget _field(TextEditingController c, String label, {int lines = 3}) =>
    Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: c,
        minLines: lines,
        maxLines: lines == 1 ? 1 : 5,
        decoration: InputDecoration(labelText: label),
      ),
    );
Widget _dropdown(
  String label,
  String value,
  List<String> values,
  String Function(Object?) text,
  ValueChanged<String> change,
) => DropdownButtonFormField<String>(
  initialValue: value,
  isExpanded: true,
  decoration: InputDecoration(labelText: label),
  items: values
      .map((v) => DropdownMenuItem(value: v, child: Text(text(v))))
      .toList(),
  onChanged: (v) {
    if (v != null) change(v);
  },
);
Map<String, dynamic> _map(dynamic v) =>
    v is Map ? Map<String, dynamic>.from(v) : {};
List<Map<String, dynamic>> _list(dynamic v) => v is List
    ? v.whereType<Map>().map((x) => Map<String, dynamic>.from(x)).toList()
    : [];
String _dateLabel(dynamic v) {
  final d = DateTime.tryParse(v?.toString() ?? '');
  return d == null ? '' : 'Prazo ${DateFormatter.formatDate(d.toLocal())}';
}

String _goalProgress(Map<String, dynamic> g) {
  final a = g['currentValue'],
      b = g['targetValue'],
      u = g['unit']?.toString() ?? '';
  return a == null && b == null
      ? ''
      : [if (a != null) 'Atual $a$u', if (b != null) 'Alvo $b$u'].join(' / ');
}
