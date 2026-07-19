import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/auth/role_guard.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../../action_plan/presentation/providers/action_plan_providers.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../reports/data/services/report_pdf_exporter.dart';
import '../../../reports/presentation/providers/reports_providers.dart';
import '../../domain/entities/research_submission.dart';
import '../providers/research_service_provider.dart';

class ResearchDetailsPage extends ConsumerStatefulWidget {
  const ResearchDetailsPage({super.key, required this.submissionId});

  final String submissionId;

  @override
  ConsumerState<ResearchDetailsPage> createState() =>
      _ResearchDetailsPageState();
}

class _ResearchDetailsPageState extends ConsumerState<ResearchDetailsPage> {
  ResearchSubmissionDetails? _details;
  bool _isLoading = true;
  bool _isGenerating = false;
  bool _isExportingPdf = false;
  bool _actionPlanExists = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        ref
            .read(researchServiceProvider)
            .getSubmissionById(widget.submissionId),
        ref
            .read(actionPlanServiceProvider)
            .listTasks(submissionId: widget.submissionId),
      ]);
      if (!mounted) return;
      setState(() {
        _details = results[0] as ResearchSubmissionDetails;
        _actionPlanExists = (results[1] as List).isNotEmpty;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  Future<void> _generateActionPlan() async {
    setState(() => _isGenerating = true);
    try {
      await ref
          .read(researchServiceProvider)
          .generateActionPlan(widget.submissionId);
      if (!mounted) return;
      setState(() => _actionPlanExists = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.success,
          content: Text('Plano de ação gerado com sucesso.'),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.danger,
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ),
      );
    } finally {
      if (mounted) setState(() => _isGenerating = false);
    }
  }

  Future<void> _exportPdf() async {
    setState(() => _isExportingPdf = true);
    try {
      final file = await ref
          .read(reportsServiceProvider)
          .downloadExecutiveReportPdf(widget.submissionId);
      await exportReportPdf(bytes: file.bytes, filename: file.filename);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.success,
          content: Text('PDF pronto: ${file.filename}'),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.danger,
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ),
      );
    } finally {
      if (mounted) setState(() => _isExportingPdf = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = ref.watch(authControllerProvider).user;
    final role = RoleGuard.normalizeRole(currentUser?.role);
    final completed = _details?.status == ResearchSubmissionStatus.completed;
    final canResume =
        _details?.status == ResearchSubmissionStatus.inProgress &&
        _details?.userId == currentUser?.id &&
        (role == RoleGuard.owner || role == RoleGuard.employee);

    return AppPageScaffold(
      title: 'Resultado detalhado da pesquisa',
      subtitle: 'Diagnóstico consolidado, respostas e próximos passos.',
      actions: [
        OutlinedButton.icon(
          onPressed: () => context.go('/research'),
          icon: const Icon(Icons.arrow_back),
          label: const Text('Voltar'),
        ),
        if (canResume)
          FilledButton.icon(
            key: const ValueKey('resume-research'),
            onPressed: () async {
              final details = _details!;
              final result = await context.push(
                '/research/chat',
                extra: {
                  'role': details.respondentRole,
                  'sector': details.department,
                  'respondEnabled': true,
                  'submissionId': details.id,
                  'companyId': details.companyId,
                },
              );
              if (result == true && mounted) {
                await _load();
              }
            },
            icon: const Icon(Icons.play_arrow_rounded),
            label: const Text('Continuar pesquisa'),
          ),
        if (completed && role != RoleGuard.employee)
          OutlinedButton.icon(
            key: const ValueKey('open-executive-report'),
            onPressed: () => context.go('/reports/${widget.submissionId}'),
            icon: const Icon(Icons.description_outlined),
            label: const Text('Relatório executivo'),
          ),
        if (completed && role != RoleGuard.employee)
          OutlinedButton.icon(
            key: const ValueKey('export-research-pdf'),
            onPressed: _isExportingPdf ? null : _exportPdf,
            icon: _isExportingPdf
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.picture_as_pdf_outlined),
            label: Text(_isExportingPdf ? 'Exportando...' : 'Exportar PDF'),
          ),
        if (completed && role != RoleGuard.admin && !_actionPlanExists)
          FilledButton.icon(
            key: const ValueKey('generate-action-plan'),
            onPressed: _isGenerating ? null : _generateActionPlan,
            icon: _isGenerating
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.auto_awesome),
            label: const Text('Gerar plano de ação'),
          ),
        if (_actionPlanExists)
          FilledButton.icon(
            onPressed: () => context.go('/tasks'),
            icon: const Icon(Icons.task_alt_outlined),
            label: const Text('Abrir plano de ação'),
          ),
      ],
      child: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const AppLoadingState(message: 'Carregando resultado da pesquisa');
    }
    if (_error != null) {
      return AppErrorState(
        title: 'Não foi possível abrir a pesquisa',
        message: _error!,
        onRetry: _load,
      );
    }
    final details = _details;
    if (details == null) {
      return const AppEmptyState(
        title: 'Pesquisa não encontrada',
        message: 'O resultado solicitado não está disponível.',
        icon: Icons.search_off,
      );
    }
    return ResearchDetailsContent(details: details);
  }
}

class ResearchDetailsContent extends StatelessWidget {
  const ResearchDetailsContent({super.key, required this.details});

  final ResearchSubmissionDetails details;

  @override
  Widget build(BuildContext context) {
    final grouped = <String, List<ResearchAnswer>>{};
    for (final answer in details.answers) {
      grouped
          .putIfAbsent(
            answer.pillar?.trim().isNotEmpty == true ? answer.pillar! : 'Geral',
            () => [],
          )
          .add(answer);
    }

    return ListView(
      key: const ValueKey('research-details-content'),
      children: [
        _IdentificationCard(details: details),
        const SizedBox(height: 16),
        if (details.status == ResearchSubmissionStatus.inProgress)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: AppEmptyState(
                title: 'Pesquisa em andamento',
                message:
                    'O diagnóstico completo será exibido após a conclusão das respostas.',
                icon: Icons.hourglass_top,
              ),
            ),
          )
        else ...[
          _ScoreCard(details: details),
          const SizedBox(height: 16),
          _NarrativeSection(
            title: 'Resumo executivo',
            color: AppColors.primary,
            items: [
              if (details.summary?.trim().isNotEmpty == true) details.summary!,
            ],
            emptyMessage: 'Resumo não disponível.',
          ),
          const SizedBox(height: 16),
          _NarrativeGrid(details: details),
        ],
        const SizedBox(height: 16),
        Text(
          'Respostas da pesquisa',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 12),
        if (grouped.isEmpty)
          const AppEmptyState(
            title: 'Nenhuma resposta registrada',
            message: 'As respostas salvas serão exibidas aqui.',
            icon: Icons.question_answer_outlined,
          )
        else
          for (final entry in grouped.entries) ...[
            _AnswersGroup(pillar: entry.key, answers: entry.value),
            const SizedBox(height: 12),
          ],
      ],
    );
  }
}

class _IdentificationCard extends StatelessWidget {
  const _IdentificationCard({required this.details});
  final ResearchSubmissionDetails details;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Wrap(
          spacing: 28,
          runSpacing: 16,
          children: [
            _Info(label: 'Empresa', value: details.companyName),
            _Info(label: 'Respondente', value: details.userName),
            _Info(label: 'Função', value: details.respondentRole),
            _Info(label: 'Setor', value: details.department),
            _Info(
              label: 'Status',
              value: details.status == ResearchSubmissionStatus.completed
                  ? 'Concluída'
                  : 'Em andamento',
            ),
            _Info(
              label: 'Iniciada em',
              value: DateFormatter.formatDateTime(details.createdAt.toLocal()),
            ),
            _Info(
              label: 'Concluída em',
              value: details.completedAt == null
                  ? '-'
                  : DateFormatter.formatDateTime(
                      details.completedAt!.toLocal(),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScoreCard extends StatelessWidget {
  const _ScoreCard({required this.details});
  final ResearchSubmissionDetails details;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Score geral: ${details.overallScore?.toStringAsFixed(1) ?? '-'}',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 18),
            for (final pillar in details.pillarScores) ...[
              Row(
                children: [
                  Expanded(
                    child: Text(
                      pillar.pillar,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                  Text(
                    '${pillar.score.toStringAsFixed(1)} · ${pillar.maturity}',
                  ),
                ],
              ),
              const SizedBox(height: 6),
              LinearProgressIndicator(
                value: (pillar.score / 100).clamp(0, 1),
                minHeight: 9,
                borderRadius: BorderRadius.circular(99),
              ),
              const SizedBox(height: 14),
            ],
          ],
        ),
      ),
    );
  }
}

class _NarrativeGrid extends StatelessWidget {
  const _NarrativeGrid({required this.details});
  final ResearchSubmissionDetails details;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth >= 900
            ? (constraints.maxWidth - 16) / 2
            : constraints.maxWidth;
        return Wrap(
          spacing: 16,
          runSpacing: 16,
          children: [
            SizedBox(
              width: width,
              child: _NarrativeSection(
                title: 'Pontos críticos',
                color: AppColors.danger,
                items: details.criticalPoints,
                emptyMessage: 'Nenhum ponto crítico registrado.',
              ),
            ),
            SizedBox(
              width: width,
              child: _NarrativeSection(
                title: 'Oportunidades',
                color: AppColors.teal,
                items: details.opportunities,
                emptyMessage: 'Nenhuma oportunidade registrada.',
              ),
            ),
            SizedBox(
              width: width,
              child: _NarrativeSection(
                title: 'Recomendações',
                color: AppColors.indigo,
                items: details.recommendations,
                emptyMessage: 'Nenhuma recomendação registrada.',
              ),
            ),
            SizedBox(
              width: width,
              child: _NarrativeSection(
                title: 'Próximos passos',
                color: AppColors.amber,
                items: details.nextSteps,
                emptyMessage: 'Nenhum próximo passo registrado.',
              ),
            ),
          ],
        );
      },
    );
  }
}

class _NarrativeSection extends StatelessWidget {
  const _NarrativeSection({
    required this.title,
    required this.color,
    required this.items,
    required this.emptyMessage,
  });
  final String title;
  final Color color;
  final List<String> items;
  final String emptyMessage;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: color,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 12),
            if (items.isEmpty)
              Text(
                emptyMessage,
                style: const TextStyle(color: AppColors.textSecondary),
              )
            else
              for (final item in items)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.circle, color: color, size: 9),
                      const SizedBox(width: 10),
                      Expanded(child: Text(item)),
                    ],
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

class _AnswersGroup extends StatelessWidget {
  const _AnswersGroup({required this.pillar, required this.answers});
  final String pillar;
  final List<ResearchAnswer> answers;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ExpansionTile(
        initiallyExpanded: true,
        title: Text(
          pillar,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text('${answers.length} resposta(s)'),
        children: [
          for (final answer in answers)
            ListTile(
              title: Text(
                answer.question,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(answer.answer),
              ),
              trailing: answer.score == null
                  ? null
                  : Chip(label: Text(answer.score!.toStringAsFixed(1))),
            ),
        ],
      ),
    );
  }
}

class _Info extends StatelessWidget {
  const _Info({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 210,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 4),
          Text(
            value.trim().isEmpty ? '-' : value,
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}
