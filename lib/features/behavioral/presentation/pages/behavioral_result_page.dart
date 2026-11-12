import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/auth/role_guard.dart';
import '../../../../core/errors/api_error_presenter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../../../widgets/role_guard.dart';
import '../../domain/entities/behavioral_admin_assessment.dart';
import '../providers/behavioral_admin_providers.dart';
import '../widgets/behavioral_scores_chart.dart';

class BehavioralResultPage extends StatelessWidget {
  const BehavioralResultPage({
    super.key,
    required this.companyId,
    required this.assessmentId,
  });
  final String companyId;
  final String assessmentId;
  @override
  Widget build(BuildContext context) => RbacGuard(
    allowedRoles: const [RoleGuard.admin],
    child: _ResultContent(companyId: companyId, assessmentId: assessmentId),
  );
}

class _ResultContent extends ConsumerStatefulWidget {
  const _ResultContent({required this.companyId, required this.assessmentId});
  final String companyId;
  final String assessmentId;
  @override
  ConsumerState<_ResultContent> createState() => _ResultContentState();
}

class _ResultContentState extends ConsumerState<_ResultContent> {
  late Future<BehavioralAdminResult> _result;
  Future<List<BehavioralAdminAssessment>>? _history;
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant _ResultContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.companyId != widget.companyId ||
        oldWidget.assessmentId != widget.assessmentId) {
      _load();
    }
  }

  void _load() {
    _history = null;
    _result = ref
        .read(behavioralAdminServiceProvider)
        .result(widget.companyId, widget.assessmentId);
  }

  @override
  Widget build(BuildContext context) => AppPageScaffold(
    title: 'Resultado comportamental',
    subtitle: 'Análise interna da consultoria',
    actions: [
      OutlinedButton.icon(
        onPressed: () => context.goNamed(
          'behavioralAssessments',
          pathParameters: {'companyId': widget.companyId},
        ),
        icon: const Icon(Icons.arrow_back),
        label: const Text('Avaliações'),
      ),
    ],
    child: FutureBuilder<BehavioralAdminResult>(
      future: _result,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const AppLoadingState(message: 'Carregando resultado...');
        }
        if (snapshot.hasError) {
          return SingleChildScrollView(
            child: AppErrorState(
              title: 'Não foi possível carregar o resultado',
              message: userFriendlyError(snapshot.error!),
              onRetry: () => setState(_load),
            ),
          );
        }
        final data = snapshot.data!;
        final assessment = data.assessment;
        _history ??= ref
            .read(behavioralAdminServiceProvider)
            .history(widget.companyId, assessment.userId);
        final predominant =
            BehavioralScores.dimensionLabels[data.scores.predominantDimension];
        return ListView(
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      assessment.userName,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    Text('${assessment.userRole} • Concluída'),
                    Text(
                      'Conclusão: ${DateFormatter.formatDateTime((assessment.completedAt ?? assessment.startedAt).toLocal())}',
                    ),
                    if (predominant != null) ...[
                      const SizedBox(height: 12),
                      Text('Predominante: $predominant'),
                    ],
                  ],
                ),
              ),
            ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: BehavioralScoresChart(scores: data.scores),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Histórico da pessoa',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            FutureBuilder<List<BehavioralAdminAssessment>>(
              future: _history,
              builder: (context, history) {
                if (history.connectionState != ConnectionState.done) {
                  return const AppLoadingState(
                    message: 'Carregando histórico...',
                  );
                }
                if (history.hasError) {
                  return AppErrorState(
                    title: 'Não foi possível carregar o histórico',
                    message: userFriendlyError(history.error!),
                    onRetry: () => setState(
                      () => _history = ref
                          .read(behavioralAdminServiceProvider)
                          .history(widget.companyId, assessment.userId),
                    ),
                  );
                }
                if (history.data!.isEmpty) {
                  return const Text('Nenhuma avaliação no histórico.');
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final item in history.data!)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${DateFormatter.formatDateTime((item.completedAt ?? item.startedAt).toLocal())} • ${item.isCompleted ? 'Concluída' : 'Em andamento'}',
                              ),
                              if (item.id == assessment.id)
                                const Text('Avaliação atual')
                              else if (item.isCompleted)
                                TextButton(
                                  onPressed: () => context.pushNamed(
                                    'behavioralResult',
                                    pathParameters: {
                                      'companyId': widget.companyId,
                                      'assessmentId': item.id,
                                    },
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
          ],
        );
      },
    ),
  );
}
