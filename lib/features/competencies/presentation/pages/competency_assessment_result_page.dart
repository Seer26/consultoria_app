import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/auth/role_guard.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../widgets/role_guard.dart';
import '../../domain/entities/competency_assessment.dart';
import '../providers/competencies_admin_providers.dart';
import '../widgets/competencies_async_view.dart';

class CompetencyAssessmentResultPage extends StatelessWidget {
  const CompetencyAssessmentResultPage({
    super.key,
    required this.companyId,
    required this.assessmentId,
  });
  final String companyId, assessmentId;
  @override
  Widget build(BuildContext context) => RbacGuard(
    allowedRoles: const [RoleGuard.admin],
    child: _ResultContent(
      key: ValueKey('$companyId/$assessmentId'),
      companyId: companyId,
      assessmentId: assessmentId,
    ),
  );
}

typedef _ResultData = ({
  AdminCompetencyAssessment detail,
  List<AdminCompetencyAssessment> history,
});

class _ResultContent extends ConsumerStatefulWidget {
  const _ResultContent({
    super.key,
    required this.companyId,
    required this.assessmentId,
  });
  final String companyId, assessmentId;
  @override
  ConsumerState<_ResultContent> createState() => _ResultContentState();
}

class _ResultContentState extends ConsumerState<_ResultContent> {
  late Future<_ResultData> _future;
  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final service = ref.read(competenciesAdminServiceProvider);
    _future = service
        .assessment(widget.companyId, widget.assessmentId, result: true)
        .then(
          (detail) async => (
            detail: detail,
            history: await service.history(
              widget.companyId,
              detail.assessment.subjectUserId,
            ),
          ),
        );
  }

  String _date(DateTime date) => DateFormatter.formatDateTime(date.toLocal());
  @override
  Widget build(BuildContext context) => AppPageScaffold(
    title: 'Resultado de competências',
    subtitle: 'Registro técnico • Acesso exclusivo da consultoria',
    actions: competenciesBackActions(context),
    child: CompetenciesAsyncView(
      future: _future,
      onRetry: () => setState(_load),
      builder: (data) {
        final assessment = data.detail.assessment;
        return ListView(
          children: [
            Text(
              assessment.subjectName,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            Text(assessment.isCompleted ? 'Concluída' : 'Em andamento'),
            Text(
              'Iniciada por ${assessment.startedByName} • ${_date(assessment.startedAt)}',
            ),
            if (assessment.completedAt != null)
              Text(
                'Concluída por ${assessment.completedByName ?? 'Consultoria'} • ${_date(assessment.completedAt!)}',
              ),
            if (data.detail.insufficientEvidence)
              Card(
                color: AppColors.surfaceMuted,
                child: const Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Evidência insuficiente',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Nenhum item possui evidência suficiente para uma conclusão de desempenho.',
                      ),
                    ],
                  ),
                ),
              ),
            if (data.detail.items.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Nenhum item registrado.'),
              ),
            for (final item in data.detail.items)
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
                      const SizedBox(height: 8),
                      Text(
                        item.evidenceStatus == EvidenceStatus.notObserved
                            ? 'Não observado / evidência insuficiente'
                            : '${item.level} — ${competencyLevelLabels[item.level]}',
                      ),
                      if (item.observation != null &&
                          item.observation!.isNotEmpty)
                        Text(item.observation!),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 24),
            Text(
              'Histórico da pessoa',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            for (final previous in data.history)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _date(
                          previous.assessment.completedAt ??
                              previous.assessment.startedAt,
                        ),
                      ),
                      Text(
                        previous.assessment.isCompleted
                            ? 'Concluída'
                            : 'Em andamento',
                      ),
                      if (previous.assessment.id == widget.assessmentId)
                        const Text('Registro atual')
                      else if (previous.assessment.isCompleted)
                        TextButton(
                          onPressed: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => CompetencyAssessmentResultPage(
                                companyId: widget.companyId,
                                assessmentId: previous.assessment.id,
                              ),
                            ),
                          ),
                          child: const Text('Ver resultado'),
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
