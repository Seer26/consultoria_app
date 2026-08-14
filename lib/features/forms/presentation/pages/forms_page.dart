import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/api_error_presenter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../action_plan/presentation/providers/action_plan_providers.dart';
import '../../../clients/domain/entities/client.dart';
import '../../../clients/presentation/providers/client_providers.dart';
import '../../../diagnosis/presentation/providers/diagnosis_providers.dart';
import '../../domain/entities/create_form_input.dart';
import '../../domain/entities/form_field.dart';
import '../../domain/entities/form_template.dart';
import '../providers/forms_providers.dart';

final _formStatusFilterProvider = StateProvider<FormStatus?>((ref) => null);

class FormsPage extends ConsumerWidget {
  const FormsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formsState = ref.watch(formsControllerProvider);
    final companiesState = ref.watch(clientsControllerProvider);
    final selectedCompanyId = ref.watch(selectedFormClientIdProvider);
    final statusFilter = ref.watch(_formStatusFilterProvider);

    return AppPageScaffold(
      title: 'Formularios',
      subtitle:
          'O consultor cria, envia e acompanha formularios para gestores e colaboradores das empresas atendidas.',
      actions: [
        FilledButton.icon(
          onPressed: () => _openCreateDialog(
            context,
            ref,
            companiesState,
            selectedCompanyId,
          ),
          icon: const Icon(Icons.add),
          label: const Text('Novo formulario'),
        ),
      ],
      child: Column(
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _CompanyFilter(
                    companiesState: companiesState,
                    selectedCompanyId: selectedCompanyId,
                    onChanged: (companyId) {
                      ref.read(selectedFormClientIdProvider.notifier).state =
                          companyId;
                      ref
                          .read(formsControllerProvider.notifier)
                          .load(clientId: companyId);
                    },
                  ),
                  DropdownButtonHideUnderline(
                    child: DropdownButton<FormStatus?>(
                      value: statusFilter,
                      hint: const Text('Status'),
                      items: const [
                        DropdownMenuItem(value: null, child: Text('Todos')),
                        DropdownMenuItem(
                          value: FormStatus.draft,
                          child: Text('Rascunho'),
                        ),
                        DropdownMenuItem(
                          value: FormStatus.sent,
                          child: Text('Enviado'),
                        ),
                        DropdownMenuItem(
                          value: FormStatus.archived,
                          child: Text('Arquivado'),
                        ),
                      ],
                      onChanged: (value) =>
                          ref.read(_formStatusFilterProvider.notifier).state =
                              value,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const SectionHeader(
            title: 'Biblioteca de coleta',
            subtitle:
                'Modelos por empresa e publico-alvo para diagnostico, levantamentos e acompanhamento.',
          ),
          const SizedBox(height: 8),
          Expanded(
            child: formsState.when(
              data: (forms) {
                final filtered = forms.where((form) {
                  return statusFilter == null || form.status == statusFilter;
                }).toList();

                if (filtered.isEmpty) {
                  return const AppEmptyState(
                    title: 'Nenhum formulario encontrado',
                    message:
                        'Crie um formulario para iniciar a coleta com uma empresa atendida.',
                    icon: Icons.assignment_outlined,
                  );
                }

                return ListView.separated(
                  itemCount: filtered.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 12),
                  itemBuilder: (_, index) => _FormCard(form: filtered[index]),
                );
              },
              loading: () =>
                  const AppLoadingState(message: 'Carregando formularios'),
              error: (error, _) => AppErrorState(
                title: 'Nao foi possivel carregar os formularios',
                message: userFriendlyError(error),
                onRetry: () => ref
                    .read(formsControllerProvider.notifier)
                    .load(clientId: selectedCompanyId),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openCreateDialog(
    BuildContext context,
    WidgetRef ref,
    AsyncValue<List<Client>> companiesState,
    String? selectedCompanyId,
  ) async {
    final companies = companiesState.valueOrNull;
    if (companies == null || companies.isEmpty) {
      AppFeedback.showSnackBar(
        context,
        message: 'Cadastre empresas antes de criar formularios.',
        type: AppFeedbackType.error,
      );
      return;
    }

    final initialCompany = companies.firstWhere(
      (company) => company.id == selectedCompanyId,
      orElse: () => companies.first,
    );

    final input = await showDialog<CreateFormInput>(
      context: context,
      builder: (_) => _CreateOrEditFormDialog(
        companies: companies,
        initialCompany: initialCompany,
      ),
    );

    if (input == null || !context.mounted) {
      return;
    }

    await ref
        .read(formsControllerProvider.notifier)
        .create(input, clientId: ref.read(selectedFormClientIdProvider));

    if (!context.mounted) {
      return;
    }

    AppFeedback.showSnackBar(
      context,
      message: input.status == FormStatus.draft
          ? 'Formulario salvo como rascunho.'
          : 'Formulario criado para envio.',
      type: AppFeedbackType.success,
    );
  }
}

class _CompanyFilter extends StatelessWidget {
  const _CompanyFilter({
    required this.companiesState,
    required this.selectedCompanyId,
    required this.onChanged,
  });

  final AsyncValue<List<Client>> companiesState;
  final String? selectedCompanyId;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    return companiesState.when(
      data: (companies) => SizedBox(
        width: 320,
        child: DropdownButtonFormField<String?>(
          initialValue: selectedCompanyId,
          decoration: const InputDecoration(
            labelText: 'Empresa',
            prefixIcon: Icon(Icons.apartment_outlined),
          ),
          items: [
            const DropdownMenuItem<String?>(
              value: null,
              child: Text('Todas as empresas'),
            ),
            ...companies.map(
              (company) => DropdownMenuItem<String?>(
                value: company.id,
                child: Text(company.name),
              ),
            ),
          ],
          onChanged: onChanged,
        ),
      ),
      loading: () =>
          const SizedBox(width: 320, child: LinearProgressIndicator()),
      error: (error, stackTrace) => const Text('Erro ao carregar empresas.'),
    );
  }
}

class _FormCard extends ConsumerWidget {
  const _FormCard({required this.form});

  final FormTemplate form;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
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
                        form.title,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 6),
                      Text(form.description),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  onSelected: (value) => _handleMenu(value, context, ref),
                  itemBuilder: (_) => const [
                    PopupMenuItem(value: 'edit', child: Text('Editar')),
                    PopupMenuItem(
                      value: 'draft',
                      child: Text('Salvar como rascunho'),
                    ),
                    PopupMenuItem(
                      value: 'sent',
                      child: Text('Marcar como enviado'),
                    ),
                    PopupMenuItem(value: 'duplicate', child: Text('Duplicar')),
                    PopupMenuItem(value: 'archive', child: Text('Arquivar')),
                    PopupMenuItem(value: 'delete', child: Text('Excluir')),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(label: Text('Empresa: ${form.clientName}')),
                Chip(label: Text(_audienceLabel(form.audience))),
                Chip(label: Text(_statusLabel(form.status))),
                Chip(label: Text('Perguntas: ${form.fields.length}')),
                Chip(label: Text('Respostas: ${form.responsesCount}')),
                Chip(
                  label: Text(
                    'Atualizado em ${DateFormatter.formatDate(form.createdAt)}',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                FilledButton.icon(
                  onPressed: form.status == FormStatus.archived
                      ? null
                      : () => _respond(context, ref),
                  icon: const Icon(Icons.send_outlined),
                  label: Text(
                    form.status == FormStatus.sent
                        ? 'Ver respostas'
                        : 'Simular envio',
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: () => ref
                      .read(formsControllerProvider.notifier)
                      .duplicate(form),
                  icon: const Icon(Icons.copy_outlined),
                  label: const Text('Duplicar'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleMenu(
    String value,
    BuildContext context,
    WidgetRef ref,
  ) async {
    switch (value) {
      case 'edit':
        final companies =
            ref.read(clientsControllerProvider).valueOrNull ?? const <Client>[];
        if (companies.isEmpty) {
          return;
        }
        final edited = await showDialog<CreateFormInput>(
          context: context,
          builder: (_) => _CreateOrEditFormDialog(
            companies: companies,
            initialCompany: companies.firstWhere(
              (company) => company.id == form.clientId,
              orElse: () => companies.first,
            ),
            form: form,
          ),
        );
        if (edited != null) {
          ref
              .read(formsControllerProvider.notifier)
              .updateTemplate(
                form.copyWith(
                  clientId: edited.clientId,
                  clientName: edited.clientName,
                  title: edited.title,
                  description: edited.description,
                  audience: edited.audience,
                  status: edited.status,
                  fields: edited.fields,
                ),
              );
        }
        return;
      case 'draft':
        ref
            .read(formsControllerProvider.notifier)
            .updateStatus(form.id, FormStatus.draft);
        return;
      case 'sent':
        ref
            .read(formsControllerProvider.notifier)
            .updateStatus(form.id, FormStatus.sent);
        return;
      case 'duplicate':
        ref.read(formsControllerProvider.notifier).duplicate(form);
        return;
      case 'archive':
        ref
            .read(formsControllerProvider.notifier)
            .updateStatus(form.id, FormStatus.archived);
        return;
      case 'delete':
        ref.read(formsControllerProvider.notifier).deleteTemplate(form.id);
        return;
    }
  }

  Future<void> _respond(BuildContext context, WidgetRef ref) async {
    final answers = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => _RespondFormDialog(form: form),
    );

    if (answers == null || !context.mounted) {
      return;
    }

    await ref
        .read(formsControllerProvider.notifier)
        .submit(formId: form.id, clientId: form.clientId, answers: answers);
    ref
        .read(formsControllerProvider.notifier)
        .updateStatus(form.id, FormStatus.sent);
    try {
      await ref.read(diagnosisControllerProvider.notifier).submit({
        'source': 'form_demo',
        'formId': form.id,
        'companyId': form.clientId,
        'audience': form.audience.name,
        'answers': answers,
      });
    } catch (_) {}
    ref
        .read(actionPlanControllerProvider.notifier)
        .addGeneratedFromForm(
          clientName: form.clientName,
          formTitle: form.title,
          answers: answers,
        );
    if (!context.mounted) {
      return;
    }
    AppFeedback.showSnackBar(
      context,
      message:
          'Formulario marcado como enviado e respostas mockadas registradas para demo.',
      type: AppFeedbackType.success,
    );
  }

  static String _audienceLabel(FormAudience audience) {
    switch (audience) {
      case FormAudience.manager:
        return 'Dono/Gestor';
      case FormAudience.employee:
        return 'Funcionario/Colaborador';
    }
  }

  static String _statusLabel(FormStatus status) {
    switch (status) {
      case FormStatus.draft:
        return 'Rascunho';
      case FormStatus.sent:
        return 'Enviado';
      case FormStatus.archived:
        return 'Arquivado';
    }
  }
}

class _CreateOrEditFormDialog extends StatefulWidget {
  const _CreateOrEditFormDialog({
    required this.companies,
    required this.initialCompany,
    this.form,
  });

  final List<Client> companies;
  final Client initialCompany;
  final FormTemplate? form;

  @override
  State<_CreateOrEditFormDialog> createState() =>
      _CreateOrEditFormDialogState();
}

class _CreateOrEditFormDialogState extends State<_CreateOrEditFormDialog> {
  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _labelController;
  late final TextEditingController _optionsController;

  late Client _selectedCompany;
  late FormAudience _audience;
  late FormStatus _status;
  FormFieldType _selectedType = FormFieldType.shortText;
  bool _isRequired = true;
  late List<FormFieldItem> _fields;

  @override
  void initState() {
    super.initState();
    final form = widget.form;
    _selectedCompany = form == null
        ? widget.initialCompany
        : widget.companies.firstWhere(
            (company) => company.id == form.clientId,
            orElse: () => widget.initialCompany,
          );
    _audience = form?.audience ?? FormAudience.manager;
    _status = form?.status ?? FormStatus.draft;
    _titleController = TextEditingController(text: form?.title ?? '');
    _descriptionController = TextEditingController(
      text: form?.description ?? '',
    );
    _labelController = TextEditingController();
    _optionsController = TextEditingController();
    _fields = List<FormFieldItem>.from(form?.fields ?? const []);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _labelController.dispose();
    _optionsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final needsOptions =
        _selectedType == FormFieldType.multipleChoice ||
        _selectedType == FormFieldType.checkbox ||
        _selectedType == FormFieldType.dropdown;

    return AlertDialog(
      title: Text(
        widget.form == null ? 'Novo formulario' : 'Editar formulario',
      ),
      content: SizedBox(
        width: 640,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: _selectedCompany.id,
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
                  if (value == null) {
                    return;
                  }
                  setState(() {
                    _selectedCompany = widget.companies.firstWhere(
                      (company) => company.id == value,
                    );
                  });
                },
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<FormAudience>(
                initialValue: _audience,
                decoration: const InputDecoration(labelText: 'Publico-alvo'),
                items: const [
                  DropdownMenuItem(
                    value: FormAudience.manager,
                    child: Text('Dono/Gestor da empresa'),
                  ),
                  DropdownMenuItem(
                    value: FormAudience.employee,
                    child: Text('Funcionario/Colaborador'),
                  ),
                ],
                onChanged: (value) =>
                    setState(() => _audience = value ?? FormAudience.manager),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _titleController,
                decoration: const InputDecoration(labelText: 'Titulo'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _descriptionController,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Descricao'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<FormStatus>(
                initialValue: _status,
                decoration: const InputDecoration(labelText: 'Status inicial'),
                items: const [
                  DropdownMenuItem(
                    value: FormStatus.draft,
                    child: Text('Salvar como rascunho'),
                  ),
                  DropdownMenuItem(
                    value: FormStatus.sent,
                    child: Text('Marcar como enviado'),
                  ),
                ],
                onChanged: (value) =>
                    setState(() => _status = value ?? FormStatus.draft),
              ),
              const Divider(height: 28),
              TextField(
                controller: _labelController,
                decoration: const InputDecoration(labelText: 'Nova pergunta'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<FormFieldType>(
                initialValue: _selectedType,
                decoration: const InputDecoration(
                  labelText: 'Tipo de pergunta',
                ),
                items: FormFieldType.values
                    .map(
                      (type) => DropdownMenuItem(
                        value: type,
                        child: Text(_fieldTypeLabel(type)),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(
                  () => _selectedType = value ?? FormFieldType.shortText,
                ),
              ),
              if (needsOptions) ...[
                const SizedBox(height: 12),
                TextField(
                  controller: _optionsController,
                  decoration: const InputDecoration(
                    labelText: 'Opcoes',
                    hintText: 'Separe por virgula',
                  ),
                ),
              ],
              const SizedBox(height: 12),
              SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                value: _isRequired,
                onChanged: (value) => setState(() => _isRequired = value),
                title: const Text('Pergunta obrigatoria'),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: _addField,
                  icon: const Icon(Icons.add),
                  label: const Text('Adicionar pergunta'),
                ),
              ),
              if (_fields.isNotEmpty)
                Align(
                  alignment: Alignment.centerLeft,
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _fields
                        .map(
                          (field) => Chip(
                            label: Text(field.label),
                            onDeleted: () =>
                                setState(() => _fields.remove(field)),
                          ),
                        )
                        .toList(),
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
        OutlinedButton(
          onPressed: () => _save(FormStatus.draft),
          child: const Text('Salvar rascunho'),
        ),
        FilledButton(
          onPressed: () => _save(_status),
          child: const Text('Salvar'),
        ),
      ],
    );
  }

  void _addField() {
    final label = _labelController.text.trim();
    if (label.isEmpty) {
      return;
    }

    final options = switch (_selectedType) {
      FormFieldType.yesNo => const ['Sim', 'Nao'],
      FormFieldType.scale => const ['1', '2', '3', '4', '5'],
      FormFieldType.multipleChoice ||
      FormFieldType.checkbox ||
      FormFieldType.dropdown =>
        _optionsController.text
            .split(',')
            .map((item) => item.trim())
            .where((item) => item.isNotEmpty)
            .toList(),
      FormFieldType.shortText ||
      FormFieldType.longText ||
      FormFieldType.date => const <String>[],
    };

    if ((_selectedType == FormFieldType.multipleChoice ||
            _selectedType == FormFieldType.checkbox ||
            _selectedType == FormFieldType.dropdown) &&
        options.isEmpty) {
      return;
    }

    setState(() {
      _fields.add(
        FormFieldItem(
          id: 'q-${DateTime.now().microsecondsSinceEpoch}',
          label: label,
          type: _selectedType,
          required: _isRequired,
          options: options,
        ),
      );
      _labelController.clear();
      _optionsController.clear();
      _selectedType = FormFieldType.shortText;
      _isRequired = true;
    });
  }

  void _save(FormStatus status) {
    final title = _titleController.text.trim();
    if (title.isEmpty || _fields.isEmpty) {
      return;
    }

    Navigator.pop(
      context,
      CreateFormInput(
        clientId: _selectedCompany.id,
        clientName: _selectedCompany.name,
        title: title,
        description: _descriptionController.text.trim(),
        audience: _audience,
        status: status,
        fields: List.unmodifiable(_fields),
      ),
    );
  }

  String _fieldTypeLabel(FormFieldType type) {
    switch (type) {
      case FormFieldType.shortText:
        return 'Texto curto';
      case FormFieldType.longText:
        return 'Texto longo';
      case FormFieldType.multipleChoice:
        return 'Multipla escolha';
      case FormFieldType.checkbox:
        return 'Caixa de selecao';
      case FormFieldType.dropdown:
        return 'Dropdown';
      case FormFieldType.yesNo:
        return 'Sim/nao';
      case FormFieldType.scale:
        return 'Escala de 1 a 5';
      case FormFieldType.date:
        return 'Data';
    }
  }
}

class _RespondFormDialog extends StatefulWidget {
  const _RespondFormDialog({required this.form});

  final FormTemplate form;

  @override
  State<_RespondFormDialog> createState() => _RespondFormDialogState();
}

class _RespondFormDialogState extends State<_RespondFormDialog> {
  final Map<String, dynamic> _answers = {};

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.form.title),
      content: SizedBox(
        width: 620,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: widget.form.fields.map(_buildField).toList(),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, _answers),
          child: const Text('Registrar respostas'),
        ),
      ],
    );
  }

  Widget _buildField(FormFieldItem field) {
    switch (field.type) {
      case FormFieldType.shortText:
      case FormFieldType.longText:
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: TextField(
            maxLines: field.type == FormFieldType.longText ? 3 : 1,
            decoration: InputDecoration(labelText: field.label),
            onChanged: (value) => _answers[field.id] = value,
          ),
        );
      case FormFieldType.multipleChoice:
      case FormFieldType.dropdown:
      case FormFieldType.yesNo:
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: DropdownButtonFormField<String>(
            decoration: InputDecoration(labelText: field.label),
            items: field.options
                .map(
                  (option) =>
                      DropdownMenuItem(value: option, child: Text(option)),
                )
                .toList(),
            onChanged: (value) => _answers[field.id] = value,
          ),
        );
      case FormFieldType.checkbox:
        final selected = (_answers[field.id] as List<String>? ?? <String>[]);
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(field.label),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: field.options
                    .map(
                      (option) => FilterChip(
                        label: Text(option),
                        selected: selected.contains(option),
                        onSelected: (enabled) {
                          setState(() {
                            final updated = List<String>.from(selected);
                            if (enabled) {
                              updated.add(option);
                            } else {
                              updated.remove(option);
                            }
                            _answers[field.id] = updated;
                          });
                        },
                      ),
                    )
                    .toList(),
              ),
            ],
          ),
        );
      case FormFieldType.scale:
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: DropdownButtonFormField<String>(
            decoration: InputDecoration(labelText: field.label),
            items: field.options
                .map(
                  (option) => DropdownMenuItem(
                    value: option,
                    child: Text('Nivel $option'),
                  ),
                )
                .toList(),
            onChanged: (value) => _answers[field.id] = value,
          ),
        );
      case FormFieldType.date:
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: TextField(
            decoration: InputDecoration(
              labelText: field.label,
              hintText: 'dd/mm/aaaa',
            ),
            onChanged: (value) => _answers[field.id] = value,
          ),
        );
    }
  }
}
