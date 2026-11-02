import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/auth/role_guard.dart';
import '../../../../core/errors/api_error_presenter.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../widgets/role_guard.dart';
import '../../domain/entities/competency.dart';
import '../../domain/entities/competency_assessment.dart';
import '../providers/competencies_admin_providers.dart';
import '../widgets/competencies_async_view.dart';
import '../widgets/competency_level_selector.dart';
import 'competency_assessment_result_page.dart';

class CompetencyAssessmentEditorPage extends StatelessWidget {
  const CompetencyAssessmentEditorPage({
    super.key,
    required this.companyId,
    required this.assessmentId,
  });
  final String companyId, assessmentId;
  @override
  Widget build(BuildContext context) => RbacGuard(
    allowedRoles: const [RoleGuard.admin],
    child: _EditorContent(
      key: ValueKey('$companyId/$assessmentId'),
      companyId: companyId,
      assessmentId: assessmentId,
    ),
  );
}

class _DraftItem {
  _DraftItem(this.snapshot)
    : level = snapshot.level,
      observation = TextEditingController(text: snapshot.observation);
  final CompetencyItem snapshot;
  int? level;
  final TextEditingController observation;
}

typedef _EditorData = ({
  AdminCompetencyAssessment detail,
  List<Competency> catalog,
});

class _EditorContent extends ConsumerStatefulWidget {
  const _EditorContent({
    super.key,
    required this.companyId,
    required this.assessmentId,
  });
  final String companyId, assessmentId;
  @override
  ConsumerState<_EditorContent> createState() => _EditorContentState();
}

class _EditorContentState extends ConsumerState<_EditorContent> {
  late Future<_EditorData> _future;
  final _items = <String, _DraftItem>{};
  bool _busy = false;
  bool _completed = false;
  String? _message;
  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final service = ref.read(competenciesAdminServiceProvider);
    _future =
        Future.wait<Object>([
          service.assessment(widget.companyId, widget.assessmentId),
          service.catalog(widget.companyId, activeOnly: true),
        ]).then((results) {
          final detail = results[0] as AdminCompetencyAssessment;
          if (!mounted) {
            return (detail: detail, catalog: results[1] as List<Competency>);
          }
          if (detail.assessment.isCompleted) setState(() => _completed = true);
          for (final item in _items.values) {
            item.observation.dispose();
          }
          _items.clear();
          for (final item in detail.items) {
            _items[item.competencyId] = _DraftItem(item);
          }
          return (detail: detail, catalog: results[1] as List<Competency>);
        });
  }

  @override
  void dispose() {
    for (final item in _items.values) {
      item.observation.dispose();
    }
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action, {String? success}) async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await action();
      if (mounted) setState(() => _message = success);
    } catch (error) {
      if (mounted) setState(() => _message = userFriendlyError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _add(Competency competency) => _run(() async {
    // Persist first inclusion to capture the server snapshot exactly once.
    final item = await ref
        .read(competenciesAdminServiceProvider)
        .saveItem(
          widget.companyId,
          widget.assessmentId,
          competency.id,
          evidenceStatus: EvidenceStatus.notObserved,
          level: null,
        );
    if (mounted) setState(() => _items[competency.id] = _DraftItem(item));
  });
  Future<void> _remove(String id) => _run(() async {
    await ref
        .read(competenciesAdminServiceProvider)
        .removeItem(widget.companyId, widget.assessmentId, id);
    if (mounted) setState(() => _items.remove(id)?.observation.dispose());
  });
  Future<void> _save({bool complete = false}) => _run(() async {
    final service = ref.read(competenciesAdminServiceProvider);
    for (final entry in _items.entries) {
      final item = entry.value;
      await service.saveItem(
        widget.companyId,
        widget.assessmentId,
        entry.key,
        evidenceStatus: item.level == null
            ? EvidenceStatus.notObserved
            : EvidenceStatus.rated,
        level: item.level,
        observation: item.observation.text.trim().isEmpty
            ? null
            : item.observation.text.trim(),
      );
    }
    if (complete) {
      await service.complete(widget.companyId, widget.assessmentId);
      if (mounted) setState(() => _completed = true);
    }
  }, success: complete ? null : 'Rascunho salvo.');
  @override
  Widget build(BuildContext context) {
    if (_completed) {
      return CompetencyAssessmentResultPage(
        companyId: widget.companyId,
        assessmentId: widget.assessmentId,
      );
    }
    return AppPageScaffold(
      title: 'Avaliar competências',
      subtitle: 'Registro técnico da consultoria • Rascunho',
      actions: competenciesBackActions(context),
      child: CompetenciesAsyncView(
        future: _future,
        onRetry: () => setState(_load),
        builder: (data) {
          return ListView(
            children: [
              Text(
                data.detail.assessment.subjectName,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              const Text(
                'Selecione competências e registre as evidências. Não observado não representa desempenho baixo.',
              ),
              const SizedBox(height: 16),
              for (final entry in _items.entries)
                Card(
                  key: ValueKey(entry.key),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          entry.value.snapshot.name,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        Text(entry.value.snapshot.description),
                        if (entry.value.snapshot.category != null)
                          Text(entry.value.snapshot.category!),
                        const SizedBox(height: 12),
                        CompetencyLevelSelector(
                          competencyId: entry.key,
                          level: entry.value.level,
                          onChanged: _busy
                              ? null
                              : (level) =>
                                    setState(() => entry.value.level = level),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          key: Key('observation-${entry.key}'),
                          controller: entry.value.observation,
                          enabled: !_busy,
                          minLines: 2,
                          maxLines: 5,
                          decoration: const InputDecoration(
                            labelText: 'Observação (opcional)',
                            alignLabelWithHint: true,
                          ),
                        ),
                        TextButton.icon(
                          key: Key('remove-${entry.key}'),
                          onPressed: _busy ? null : () => _remove(entry.key),
                          icon: const Icon(Icons.remove_circle_outline),
                          label: const Text('Remover item'),
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 16),
              Text(
                'Adicionar competência',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              if (data.catalog.where((c) => !_items.containsKey(c.id)).isEmpty)
                const Text('Nenhuma outra competência ativa disponível.'),
              for (final competency in data.catalog.where(
                (c) => !_items.containsKey(c.id),
              ))
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(competency.name),
                        Text(competency.description),
                        TextButton.icon(
                          key: Key('add-${competency.id}'),
                          onPressed: _busy ? null : () => _add(competency),
                          icon: const Icon(Icons.add),
                          label: const Text('Adicionar'),
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 16),
              if (_message != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Semantics(liveRegion: true, child: Text(_message!)),
                ),
              if (_busy) const LinearProgressIndicator(),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  OutlinedButton(
                    key: const Key('assessment-save'),
                    onPressed: _busy ? null : _save,
                    child: const Text('Salvar rascunho'),
                  ),
                  FilledButton(
                    key: const Key('assessment-complete'),
                    onPressed: _busy || _items.isEmpty
                        ? null
                        : () => _save(complete: true),
                    child: const Text('Finalizar avaliação'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text(
                'Após finalizar, este registro não poderá ser alterado. Uma nova avaliação preservará este histórico.',
              ),
            ],
          );
        },
      ),
    );
  }
}
