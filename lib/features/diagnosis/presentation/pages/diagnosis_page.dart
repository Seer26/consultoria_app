import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/auth/role_guard.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../../admin_management/presentation/providers/admin_management_providers.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/research_submission.dart';
import '../providers/research_service_provider.dart';
import 'research_start_page.dart';

class DiagnosisPage extends ConsumerStatefulWidget {
  const DiagnosisPage({super.key});

  @override
  ConsumerState<DiagnosisPage> createState() => _DiagnosisPageState();
}

class _DiagnosisPageState extends ConsumerState<DiagnosisPage> {
  bool _isStarting = false;
  bool _isLoadingHistory = true;
  String? _historyError;
  List<ResearchSubmission> _history = const [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadHistory();
    });
  }

  Future<void> _loadHistory() async {
    final authState = ref.read(authControllerProvider);
    final user = authState.user;

    if (user == null) {
      return;
    }

    setState(() {
      _isLoadingHistory = true;
      _historyError = null;
    });

    try {
      final normalizedRole = RoleGuard.normalizeRole(user.role);
      final companyId = normalizedRole == RoleGuard.admin ? null : user.companyId;
      final history = await ref.read(researchServiceProvider).listSubmissions(
            companyId: companyId,
          );

      if (!mounted) {
        return;
      }

      setState(() {
        _history = history;
        _isLoadingHistory = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _historyError = error.toString().replaceFirst('Exception: ', '');
        _isLoadingHistory = false;
      });
    }
  }

  Future<void> _handleStart({
    required String role,
    required String sector,
    String? companyId,
  }) async {
    final authState = ref.read(authControllerProvider);
    final user = authState.user;

    if (user == null) {
      _showMessage('Sessao invalida. Faca login novamente.', isError: true);
      return;
    }

    final normalizedRole = RoleGuard.normalizeRole(user.role);
    final respondEnabled = normalizedRole != RoleGuard.owner;

    if (!respondEnabled) {
      _showMessage(
        'Somente ADMIN e EMPLOYEE podem responder a pesquisa neste momento.',
        isError: true,
      );
      return;
    }

    final effectiveCompanyId =
        normalizedRole == RoleGuard.admin ? companyId : user.companyId;

    if (effectiveCompanyId == null || effectiveCompanyId.trim().isEmpty) {
      _showMessage(
        'Usuario sem empresa vinculada. Informe ou vincule uma empresa antes de iniciar.',
        isError: true,
      );
      return;
    }

    setState(() => _isStarting = true);

    try {
      final submission = await ref.read(researchServiceProvider).createSubmission(
            companyId: effectiveCompanyId,
            respondentRole: role,
            department: sector,
          );

      if (!mounted) {
        return;
      }

      final result = await context.push(
        '/research/chat',
        extra: {
          'role': role,
          'sector': sector,
          'respondEnabled': respondEnabled,
          'submissionId': submission.id,
          'companyId': effectiveCompanyId,
        },
      );

      if (result == true) {
        await _loadHistory();
      }
    } catch (error) {
      if (!mounted) {
        return;
      }

      _showMessage(
        error.toString().replaceFirst('Exception: ', ''),
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() => _isStarting = false);
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
    final user = ref.watch(authControllerProvider).user;
    final normalizedRole = RoleGuard.normalizeRole(user?.role);
    final adminCompaniesState = normalizedRole == RoleGuard.admin
        ? ref.watch(adminManagementControllerProvider)
        : null;

    final companyOptions = adminCompaniesState == null
        ? const <ResearchCompanyOption>[]
        : adminCompaniesState.companies
            .map(
              (item) => ResearchCompanyOption(
                id: item.id,
                name: item.name,
              ),
            )
            .toList();

    return ResearchStartPage(
      onStart: _handleStart,
      isStarting: _isStarting,
      requireCompanySelection: normalizedRole == RoleGuard.admin,
      companyOptions: companyOptions,
      historySection: _HistorySection(
        isLoading: _isLoadingHistory,
        error: _historyError,
        submissions: _history,
        onRetry: _loadHistory,
        isAdmin: normalizedRole == RoleGuard.admin,
      ),
    );
  }
}

class _HistorySection extends StatelessWidget {
  const _HistorySection({
    required this.isLoading,
    required this.error,
    required this.submissions,
    required this.onRetry,
    required this.isAdmin,
  });

  final bool isLoading;
  final String? error;
  final List<ResearchSubmission> submissions;
  final Future<void> Function() onRetry;
  final bool isAdmin;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
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
                        'Historico da pesquisa',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Lista basica das pesquisas respondidas, com setor, funcao, status e score.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                      ),
                    ],
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: () => onRetry(),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Atualizar'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (isLoading)
              const SizedBox(
                height: 160,
                child: AppLoadingState(message: 'Carregando historico'),
              )
            else if (error != null)
              AppErrorState(
                title: 'Falha ao carregar historico',
                message: error,
                onRetry: () => onRetry(),
              )
            else if (submissions.isEmpty)
              const AppEmptyState(
                title: 'Nenhuma pesquisa registrada',
                message: 'As pesquisas respondidas aparecerao aqui.',
                icon: Icons.history_outlined,
              )
            else
              Column(
                children: [
                  for (var index = 0; index < submissions.length; index++) ...[
                    if (index > 0) const SizedBox(height: 10),
                    _HistoryCard(
                      submission: submissions[index],
                      showCompany: isAdmin,
                    ),
                  ],
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({
    required this.submission,
    required this.showCompany,
  });

  final ResearchSubmission submission;
  final bool showCompany;

  @override
  Widget build(BuildContext context) {
    final isCompleted = submission.status == ResearchSubmissionStatus.completed;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
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
                      submission.respondentRole,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${submission.department} | ${submission.userName}',
                      style: const TextStyle(color: AppColors.textSecondary),
                    ),
                    if (showCompany) ...[
                      const SizedBox(height: 4),
                      Text(
                        submission.companyName,
                        style: const TextStyle(color: AppColors.textSecondary),
                      ),
                    ],
                  ],
                ),
              ),
              _StatusBadge(
                label: isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
                color: isCompleted ? AppColors.success : AppColors.amber,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _MetaPill(
                icon: Icons.schedule_outlined,
                label: DateFormatter.formatDateTime(submission.createdAt),
              ),
              _MetaPill(
                icon: Icons.question_answer_outlined,
                label: '${submission.answersCount} respostas',
              ),
              _MetaPill(
                icon: Icons.analytics_outlined,
                label: submission.overallScore == null
                    ? 'Score pendente'
                    : 'Score ${submission.overallScore!.toStringAsFixed(1)}',
              ),
            ],
          ),
          if (submission.summary != null && submission.summary!.trim().isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              submission.summary!,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ],
      ),
    );
  }
}

class _MetaPill extends StatelessWidget {
  const _MetaPill({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppColors.textSecondary),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
