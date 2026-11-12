import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/auth/role_guard.dart';
import '../../../../core/errors/api_error_presenter.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../../../widgets/role_guard.dart';
import '../../domain/entities/competency.dart';
import '../providers/competencies_admin_providers.dart';
import '../widgets/competencies_async_view.dart';

class CompetencyCatalogPage extends StatelessWidget {
  const CompetencyCatalogPage({super.key, required this.companyId});
  final String companyId;
  @override
  Widget build(BuildContext context) => RbacGuard(
    allowedRoles: const [RoleGuard.admin],
    child: _CatalogContent(key: ValueKey(companyId), companyId: companyId),
  );
}

class _CatalogContent extends ConsumerStatefulWidget {
  const _CatalogContent({super.key, required this.companyId});
  final String companyId;
  @override
  ConsumerState<_CatalogContent> createState() => _CatalogContentState();
}

class _CatalogContentState extends ConsumerState<_CatalogContent> {
  late Future<List<Competency>> _future;
  bool _busy = false;
  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = ref
        .read(competenciesAdminServiceProvider)
        .catalog(widget.companyId);
  }

  Future<void> _form([Competency? item]) async {
    final changed = await showDialog<bool>(
      context: context,
      builder: (_) => _CompetencyForm(companyId: widget.companyId, item: item),
    );
    if (changed == true && mounted) setState(_load);
  }

  Future<void> _deactivate(Competency item) async {
    setState(() => _busy = true);
    try {
      await ref
          .read(competenciesAdminServiceProvider)
          .deactivate(widget.companyId, item.id);
      if (mounted) setState(_load);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(userFriendlyError(error))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => AppPageScaffold(
    title: 'Catálogo de competências',
    subtitle: 'Empresa selecionada • Administração da consultoria',
    actions: [
      ...competenciesBackActions(context),
      FilledButton.icon(
        key: const Key('catalog-create'),
        onPressed: _busy ? null : _form,
        icon: const Icon(Icons.add),
        label: const Text('Nova competência'),
      ),
    ],
    child: CompetenciesAsyncView(
      future: _future,
      onRetry: () => setState(_load),
      builder: (items) {
        if (items.isEmpty) {
          return const SingleChildScrollView(
            child: AppEmptyState(title: 'Nenhuma competência disponível'),
          );
        }
        return ListView(
          children: [
            for (final item in items)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.name,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(item.description),
                      if (item.category != null) Text(item.category!),
                      Text(
                        item.isSystem
                            ? 'Padrão do sistema'
                            : 'Privada da empresa',
                      ),
                      if (!item.isActive) const Text('Inativa'),
                      if (!item.isSystem && item.isActive)
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            TextButton(
                              key: Key('edit-${item.id}'),
                              onPressed: _busy ? null : () => _form(item),
                              child: const Text('Editar'),
                            ),
                            TextButton(
                              key: Key('deactivate-${item.id}'),
                              onPressed: _busy ? null : () => _deactivate(item),
                              child: const Text('Desativar'),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    ),
  );
}

class _CompetencyForm extends ConsumerStatefulWidget {
  const _CompetencyForm({required this.companyId, this.item});
  final String companyId;
  final Competency? item;
  @override
  ConsumerState<_CompetencyForm> createState() => _CompetencyFormState();
}

class _CompetencyFormState extends ConsumerState<_CompetencyForm> {
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.item?.name);
  late final _description = TextEditingController(
    text: widget.item?.description,
  );
  late final _category = TextEditingController(text: widget.item?.category);
  bool _busy = false;
  String? _error;
  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _category.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(competenciesAdminServiceProvider)
          .saveCompetency(
            widget.companyId,
            id: widget.item?.id,
            name: _name.text,
            description: _description.text,
            category: _category.text,
          );
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = userFriendlyError(error);
          _busy = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(
      widget.item == null ? 'Nova competência privada' : 'Editar competência',
    ),
    content: SizedBox(
      width: 480,
      child: SingleChildScrollView(
        child: Form(
          key: _form,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                key: const Key('competency-name'),
                controller: _name,
                enabled: !_busy,
                decoration: const InputDecoration(labelText: 'Nome'),
                maxLength: 160,
                validator: (value) => value == null || value.trim().isEmpty
                    ? 'Informe o nome.'
                    : null,
              ),
              TextFormField(
                key: const Key('competency-description'),
                controller: _description,
                enabled: !_busy,
                decoration: const InputDecoration(labelText: 'Descrição'),
                maxLines: 3,
                validator: (value) => value == null || value.trim().isEmpty
                    ? 'Informe a descrição.'
                    : null,
              ),
              TextFormField(
                controller: _category,
                enabled: !_busy,
                decoration: const InputDecoration(
                  labelText: 'Categoria (opcional)',
                ),
              ),
              if (_error != null) Text(_error!),
            ],
          ),
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: _busy ? null : () => Navigator.pop(context),
        child: const Text('Cancelar'),
      ),
      FilledButton(
        onPressed: _busy ? null : _save,
        child: Text(_busy ? 'Salvando...' : 'Salvar'),
      ),
    ],
  );
}
