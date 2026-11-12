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

class BehavioralAssessmentsPage extends StatelessWidget {
  const BehavioralAssessmentsPage({
    super.key,
    required this.companyId,
    this.userId,
  });
  final String companyId;
  final String? userId;
  @override
  Widget build(BuildContext context) => RbacGuard(
    allowedRoles: const [RoleGuard.admin],
    child: _AssessmentsContent(companyId: companyId, userId: userId),
  );
}

class _AssessmentsContent extends ConsumerStatefulWidget {
  const _AssessmentsContent({required this.companyId, this.userId});
  final String companyId;
  final String? userId;
  @override
  ConsumerState<_AssessmentsContent> createState() =>
      _AssessmentsContentState();
}

class _AssessmentsContentState extends ConsumerState<_AssessmentsContent> {
  late Future<List<BehavioralAdminAssessment>> _future;
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant _AssessmentsContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.companyId != widget.companyId ||
        oldWidget.userId != widget.userId) {
      _load();
    }
  }

  void _load() {
    final service = ref.read(behavioralAdminServiceProvider);
    _future = widget.userId == null
        ? service.assessments(widget.companyId)
        : service.history(widget.companyId, widget.userId!);
  }

  @override
  Widget build(BuildContext context) => AppPageScaffold(
    title: widget.userId == null
        ? 'Avaliações comportamentais'
        : 'Histórico da pessoa',
    subtitle: 'Consulta exclusiva da consultoria • Empresa selecionada',
    actions: [
      OutlinedButton.icon(
        onPressed: () => context.go('/companies'),
        icon: const Icon(Icons.business_outlined),
        label: const Text('Empresas'),
      ),
    ],
    child: FutureBuilder<List<BehavioralAdminAssessment>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const AppLoadingState(message: 'Carregando avaliações...');
        }
        if (snapshot.hasError) {
          return SingleChildScrollView(
            child: AppErrorState(
              title: 'Não foi possível carregar as avaliações',
              message: userFriendlyError(snapshot.error!),
              onRetry: () => setState(_load),
            ),
          );
        }
        final items = snapshot.data!;
        if (items.isEmpty) {
          return const SingleChildScrollView(
            child: AppEmptyState(title: 'Nenhuma avaliação nesta empresa'),
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
                        item.userName,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(item.userRole),
                      const SizedBox(height: 8),
                      Text(item.isCompleted ? 'Concluída' : 'Em andamento'),
                      Text(
                        '${item.isCompleted ? 'Conclusão' : 'Início'}: ${DateFormatter.formatDateTime((item.completedAt ?? item.startedAt).toLocal())}',
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          if (item.isCompleted)
                            FilledButton(
                              onPressed: () => context.pushNamed(
                                'behavioralResult',
                                pathParameters: {
                                  'companyId': widget.companyId,
                                  'assessmentId': item.id,
                                },
                              ),
                              child: const Text('Ver resultado'),
                            ),
                          if (widget.userId == null)
                            OutlinedButton(
                              onPressed: () => context.pushNamed(
                                'behavioralAssessments',
                                pathParameters: {'companyId': widget.companyId},
                                queryParameters: {'userId': item.userId},
                              ),
                              child: const Text('Histórico'),
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
