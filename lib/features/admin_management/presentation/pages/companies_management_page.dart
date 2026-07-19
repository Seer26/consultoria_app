import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../../billing/data/services/current_plan_service.dart';
import '../../data/services/admin_management_service.dart';
import '../../domain/entities/company_account.dart';
import '../../domain/entities/company_user_account.dart';
import '../controllers/admin_management_controller.dart';
import '../providers/admin_management_providers.dart';

class CompaniesManagementPage extends ConsumerWidget {
  const CompaniesManagementPage({super.key, this.initialUsersView = false});

  final bool initialUsersView;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(adminManagementControllerProvider);
    final controller = ref.read(adminManagementControllerProvider.notifier);
    final selectedCompany = state.selectedCompany;

    return AppPageScaffold(
      title: initialUsersView ? 'Usuarios' : 'Empresas',
      subtitle: initialUsersView
          ? 'Gestao de acessos por empresa, com criacao, edicao e ativacao de usuarios OWNER e EMPLOYEE.'
          : 'Base SaaS da consultoria com cadastro de empresas, status operacional e administracao do time de cada conta.',
      actions: [
        OutlinedButton.icon(
          onPressed: state.isLoadingCompanies
              ? null
              : () => controller.loadCompanies(),
          icon: const Icon(Icons.refresh),
          label: const Text('Atualizar'),
        ),
        OutlinedButton.icon(
          onPressed: state.isSaving
              ? null
              : () => _openOnboardingDialog(context, ref),
          icon: const Icon(Icons.rocket_launch_outlined),
          label: const Text('Onboarding'),
        ),
        FilledButton.icon(
          onPressed: state.isSaving
              ? null
              : () => _openCompanyDialog(context, ref),
          icon: const Icon(Icons.add),
          label: const Text('Nova empresa'),
        ),
      ],
      child: state.isLoadingCompanies && state.companies.isEmpty
          ? const AppLoadingState(message: 'Carregando empresas')
          : state.error != null && state.companies.isEmpty
          ? AppErrorState(
              title: 'Falha ao carregar a base administrativa',
              message: state.error,
              onRetry: () => controller.loadCompanies(),
            )
          : LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth >= 980;

                final companiesPanel = _CompaniesPanel(
                  state: state,
                  onCreateCompany: () => _openCompanyDialog(context, ref),
                  onSelectCompany: controller.selectCompany,
                  onEditCompany: (company) =>
                      _openCompanyDialog(context, ref, company: company),
                  onToggleCompanyStatus: (company) =>
                      _toggleCompanyStatus(context, ref, company),
                );

                final usersPanel = _CompanyUsersPanel(
                  company: selectedCompany,
                  users: state.companyUsers,
                  availablePlans: state.availablePlans,
                  companyPlan: state.selectedCompanyPlan,
                  planEvents: state.selectedCompanyPlanEvents,
                  isLoadingUsers: state.isLoadingUsers,
                  isLoadingPlan: state.isLoadingPlan,
                  isSaving: state.isSaving,
                  onChangePlan: selectedCompany == null
                      ? null
                      : () => _openChangePlanDialog(
                          context,
                          ref,
                          company: selectedCompany,
                        ),
                  onCreateUser: selectedCompany == null
                      ? null
                      : () => _openUserDialog(
                          context,
                          ref,
                          company: selectedCompany,
                        ),
                  onEditUser: selectedCompany == null
                      ? null
                      : (user) => _openUserDialog(
                          context,
                          ref,
                          company: selectedCompany,
                          user: user,
                        ),
                  onToggleUserStatus: selectedCompany == null
                      ? null
                      : (user) => _toggleUserStatus(context, ref, user),
                );

                if (!isWide) {
                  return ListView(
                    children: [
                      companiesPanel,
                      const SizedBox(height: 16),
                      usersPanel,
                    ],
                  );
                }

                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      flex: 5,
                      child: SingleChildScrollView(child: companiesPanel),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      flex: 6,
                      child: SingleChildScrollView(child: usersPanel),
                    ),
                  ],
                );
              },
            ),
    );
  }

  Future<void> _openCompanyDialog(
    BuildContext context,
    WidgetRef ref, {
    CompanyAccount? company,
  }) async {
    final result = await showDialog<_CompanyFormResult>(
      context: context,
      builder: (_) => _CompanyFormDialog(company: company),
    );

    if (result == null || !context.mounted) {
      return;
    }

    final controller = ref.read(adminManagementControllerProvider.notifier);

    try {
      if (company == null) {
        await controller.createCompany(name: result.name, slug: result.slug);
        if (context.mounted) {
          AppFeedback.showSnackBar(
            context,
            message: 'Empresa criada com sucesso.',
            type: AppFeedbackType.success,
          );
        }
      } else {
        await controller.updateCompany(
          id: company.id,
          name: result.name,
          slug: result.slug,
        );
        if (context.mounted) {
          AppFeedback.showSnackBar(
            context,
            message: 'Empresa atualizada com sucesso.',
            type: AppFeedbackType.success,
          );
        }
      }
    } catch (error) {
      if (context.mounted) {
        AppFeedback.showSnackBar(
          context,
          message: _formatError(error),
          type: AppFeedbackType.error,
        );
      }
    }
  }

  Future<void> _openOnboardingDialog(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final result = await showDialog<_OnboardingFormResult>(
      context: context,
      builder: (_) => const _OnboardingFormDialog(),
    );

    if (result == null || !context.mounted) {
      return;
    }

    final controller = ref.read(adminManagementControllerProvider.notifier);

    try {
      await controller.createCompanyWithOwner(
        companyName: result.companyName,
        slug: result.slug,
        ownerName: result.ownerName,
        ownerEmail: result.ownerEmail,
        ownerPassword: result.ownerPassword,
      );
      if (context.mounted) {
        AppFeedback.showSnackBar(
          context,
          message: 'Empresa e OWNER inicial criados com sucesso.',
          type: AppFeedbackType.success,
        );
      }
    } catch (error) {
      if (context.mounted) {
        AppFeedback.showSnackBar(
          context,
          message: _formatError(error),
          type: AppFeedbackType.error,
        );
      }
    }
  }

  Future<void> _openUserDialog(
    BuildContext context,
    WidgetRef ref, {
    required CompanyAccount company,
    CompanyUserAccount? user,
  }) async {
    final result = await showDialog<_UserFormResult>(
      context: context,
      builder: (_) => _UserFormDialog(company: company, user: user),
    );

    if (result == null || !context.mounted) {
      return;
    }

    final controller = ref.read(adminManagementControllerProvider.notifier);

    try {
      if (user == null) {
        await controller.createUser(
          companyId: company.id,
          name: result.name,
          email: result.email,
          password: result.password!,
          role: result.role,
        );
        if (context.mounted) {
          AppFeedback.showSnackBar(
            context,
            message: 'Usuario criado com sucesso.',
            type: AppFeedbackType.success,
          );
        }
      } else {
        await controller.updateUser(
          userId: user.id,
          name: result.name,
          email: result.email,
          role: result.role,
          password: result.password,
        );
        if (context.mounted) {
          AppFeedback.showSnackBar(
            context,
            message: 'Usuario atualizado com sucesso.',
            type: AppFeedbackType.success,
          );
        }
      }
    } catch (error) {
      if (context.mounted) {
        AppFeedback.showSnackBar(
          context,
          message: _formatError(error),
          type: AppFeedbackType.error,
        );
      }
    }
  }

  Future<void> _openChangePlanDialog(
    BuildContext context,
    WidgetRef ref, {
    required CompanyAccount company,
  }) async {
    final state = ref.read(adminManagementControllerProvider);
    final currentPlan = state.companyPlans[company.id];
    final result = await showDialog<_ChangePlanResult>(
      context: context,
      builder: (_) => _ChangePlanDialog(
        company: company,
        plans: state.availablePlans,
        currentPlanSlug: currentPlan?.planSlug,
      ),
    );

    if (result == null || !context.mounted) {
      return;
    }

    if (result.planSlug == currentPlan?.planSlug) {
      AppFeedback.showSnackBar(
        context,
        message: 'A empresa ja esta neste plano.',
        type: AppFeedbackType.info,
      );
      return;
    }

    SaasPlanOption? selectedPlan;
    for (final plan in state.availablePlans) {
      if (plan.slug == result.planSlug) {
        selectedPlan = plan;
        break;
      }
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Confirmar troca de plano'),
        content: Text(
          'Alterar ${company.name} para o plano ${selectedPlan?.name ?? result.planSlug}? '
          'A mudanca sera aplicada imediatamente nos limites da empresa.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );

    if (confirmed != true || !context.mounted) {
      return;
    }

    final controller = ref.read(adminManagementControllerProvider.notifier);

    try {
      await controller.changeCompanyPlan(
        companyId: company.id,
        planSlug: result.planSlug,
        reason: result.reason,
      );
      if (context.mounted) {
        AppFeedback.showSnackBar(
          context,
          message: 'Plano da empresa atualizado com sucesso.',
          type: AppFeedbackType.success,
        );
      }
    } catch (error) {
      if (context.mounted) {
        AppFeedback.showSnackBar(
          context,
          message: _formatError(error),
          type: AppFeedbackType.error,
        );
      }
    }
  }

  Future<void> _toggleCompanyStatus(
    BuildContext context,
    WidgetRef ref,
    CompanyAccount company,
  ) async {
    final controller = ref.read(adminManagementControllerProvider.notifier);
    try {
      await controller.toggleCompanyStatus(company);
      if (context.mounted) {
        AppFeedback.showSnackBar(
          context,
          message: company.status == CompanyAccountStatus.active
              ? 'Empresa desativada.'
              : 'Empresa ativada.',
          type: AppFeedbackType.success,
        );
      }
    } catch (error) {
      if (context.mounted) {
        AppFeedback.showSnackBar(
          context,
          message: _formatError(error),
          type: AppFeedbackType.error,
        );
      }
    }
  }

  Future<void> _toggleUserStatus(
    BuildContext context,
    WidgetRef ref,
    CompanyUserAccount user,
  ) async {
    final controller = ref.read(adminManagementControllerProvider.notifier);
    try {
      await controller.toggleUserStatus(user);
      if (context.mounted) {
        AppFeedback.showSnackBar(
          context,
          message: user.status == CompanyUserStatus.active
              ? 'Usuario desativado.'
              : 'Usuario ativado.',
          type: AppFeedbackType.success,
        );
      }
    } catch (error) {
      if (context.mounted) {
        AppFeedback.showSnackBar(
          context,
          message: _formatError(error),
          type: AppFeedbackType.error,
        );
      }
    }
  }

  String _formatError(Object error) {
    final raw = error.toString().replaceFirst('Exception: ', '');
    if (raw.contains('EMAIL_ALREADY_IN_USE')) {
      return 'Este email ja esta em uso.';
    }
    if (raw.contains('INVALID_EMAIL')) {
      return 'Informe um email valido.';
    }
    if (raw.contains('PASSWORD_TOO_SHORT')) {
      return 'A senha deve ter pelo menos 8 caracteres.';
    }
    if (raw.contains('INVALID_COMPANY_NAME')) {
      return 'Informe um nome de empresa valido.';
    }
    if (raw.contains('INVALID_OWNER_PAYLOAD')) {
      return 'Informe nome, email e senha do OWNER inicial.';
    }
    if (raw.contains('PLAN_LIMIT_REACHED')) {
      return 'A empresa atingiu o limite do plano atual. Considere trocar para um plano maior.';
    }
    if (raw.contains('PLAN_NOT_FOUND')) {
      return 'Plano nao encontrado.';
    }
    if (raw.contains('INVALID_PLAN_SLUG')) {
      return 'Selecione um plano valido.';
    }
    return raw;
  }
}

class _CompaniesPanel extends StatelessWidget {
  const _CompaniesPanel({
    required this.state,
    required this.onCreateCompany,
    required this.onSelectCompany,
    required this.onEditCompany,
    required this.onToggleCompanyStatus,
  });

  final AdminManagementState state;
  final VoidCallback onCreateCompany;
  final ValueChanged<String> onSelectCompany;
  final ValueChanged<CompanyAccount> onEditCompany;
  final ValueChanged<CompanyAccount> onToggleCompanyStatus;

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
                        'Empresas cadastradas',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Selecione uma empresa para editar dados e gerenciar usuarios.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: onCreateCompany,
                  icon: const Icon(Icons.add),
                  label: const Text('Cadastrar'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _MetricChip(label: 'Total', value: '${state.companies.length}'),
                _MetricChip(
                  label: 'Ativas',
                  value:
                      '${state.companies.where((item) => item.status == CompanyAccountStatus.active).length}',
                ),
                _MetricChip(
                  label: 'Usuarios',
                  value:
                      '${state.companies.fold<int>(0, (sum, item) => sum + item.userCount)}',
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (state.companies.isEmpty)
              AppEmptyState(
                title: 'Nenhuma empresa cadastrada',
                message: 'Crie a primeira empresa para iniciar a base SaaS.',
                icon: Icons.apartment_outlined,
                action: FilledButton.icon(
                  onPressed: onCreateCompany,
                  icon: const Icon(Icons.add),
                  label: const Text('Criar empresa'),
                ),
              )
            else
              ...state.companies.map(
                (company) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _CompanyCard(
                    company: company,
                    selected: company.id == state.selectedCompanyId,
                    onTap: () => onSelectCompany(company.id),
                    onEdit: () => onEditCompany(company),
                    onToggleStatus: () => onToggleCompanyStatus(company),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _CompanyUsersPanel extends StatelessWidget {
  const _CompanyUsersPanel({
    required this.company,
    required this.users,
    required this.availablePlans,
    required this.companyPlan,
    required this.planEvents,
    required this.isLoadingUsers,
    required this.isLoadingPlan,
    required this.isSaving,
    required this.onChangePlan,
    required this.onCreateUser,
    required this.onEditUser,
    required this.onToggleUserStatus,
  });

  final CompanyAccount? company;
  final List<CompanyUserAccount> users;
  final List<SaasPlanOption> availablePlans;
  final CurrentPlanSnapshot? companyPlan;
  final List<SubscriptionPlanEvent> planEvents;
  final bool isLoadingUsers;
  final bool isLoadingPlan;
  final bool isSaving;
  final VoidCallback? onChangePlan;
  final VoidCallback? onCreateUser;
  final ValueChanged<CompanyUserAccount>? onEditUser;
  final ValueChanged<CompanyUserAccount>? onToggleUserStatus;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: company == null
            ? const AppEmptyState(
                title: 'Selecione uma empresa',
                message:
                    'Os usuarios da empresa aparecem aqui assim que voce escolher uma conta.',
                icon: Icons.manage_accounts_outlined,
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    runSpacing: 12,
                    spacing: 12,
                    children: [
                      SizedBox(
                        width: 420,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              company!.name,
                              style: Theme.of(context).textTheme.titleLarge
                                  ?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Slug ${company!.slug} | Atualizado em ${DateFormatter.formatDateTime(company!.updatedAt)}',
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _StatusBadge(
                            label:
                                company!.status == CompanyAccountStatus.active
                                ? 'Ativa'
                                : 'Inativa',
                            color:
                                company!.status == CompanyAccountStatus.active
                                ? AppColors.success
                                : AppColors.danger,
                          ),
                          FilledButton.icon(
                            onPressed: isSaving ? null : onCreateUser,
                            icon: const Icon(Icons.person_add_alt_1),
                            label: const Text('Novo usuario'),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _CompanyPlanPanel(
                    companyPlan: companyPlan,
                    availablePlans: availablePlans,
                    planEvents: planEvents,
                    isLoadingPlan: isLoadingPlan,
                    isSaving: isSaving,
                    onChangePlan: onChangePlan,
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      _MetricChip(label: 'Usuarios', value: '${users.length}'),
                      _MetricChip(
                        label: 'Owners',
                        value:
                            '${users.where((item) => item.role == CompanyUserRole.owner).length}',
                      ),
                      _MetricChip(
                        label: 'Ativos',
                        value:
                            '${users.where((item) => item.status == CompanyUserStatus.active).length}',
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (isLoadingUsers)
                    const SizedBox(
                      height: 220,
                      child: AppLoadingState(message: 'Carregando usuarios'),
                    )
                  else if (users.isEmpty)
                    SizedBox(
                      height: 220,
                      child: AppEmptyState(
                        title: 'Nenhum usuario nesta empresa',
                        message:
                            'Cadastre OWNERs e EMPLOYEEs para iniciar o uso da conta.',
                        icon: Icons.group_outlined,
                        action: FilledButton.icon(
                          onPressed: isSaving ? null : onCreateUser,
                          icon: const Icon(Icons.person_add_alt_1),
                          label: const Text('Cadastrar usuario'),
                        ),
                      ),
                    )
                  else
                    Column(
                      children: [
                        for (var index = 0; index < users.length; index++) ...[
                          if (index > 0) const SizedBox(height: 10),
                          _UserCard(
                            user: users[index],
                            onEdit: onEditUser == null
                                ? null
                                : () => onEditUser!(users[index]),
                            onToggleStatus: onToggleUserStatus == null
                                ? null
                                : () => onToggleUserStatus!(users[index]),
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

class _CompanyPlanPanel extends StatelessWidget {
  const _CompanyPlanPanel({
    required this.companyPlan,
    required this.availablePlans,
    required this.planEvents,
    required this.isLoadingPlan,
    required this.isSaving,
    required this.onChangePlan,
  });

  final CurrentPlanSnapshot? companyPlan;
  final List<SaasPlanOption> availablePlans;
  final List<SubscriptionPlanEvent> planEvents;
  final bool isLoadingPlan;
  final bool isSaving;
  final VoidCallback? onChangePlan;

  @override
  Widget build(BuildContext context) {
    if (isLoadingPlan) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
        ),
        child: const Row(
          children: [
            SizedBox(
              height: 18,
              width: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 12),
            Text('Carregando plano comercial'),
          ],
        ),
      );
    }

    if (companyPlan == null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.workspace_premium_outlined,
              color: AppColors.textMuted,
            ),
            const SizedBox(width: 12),
            const Expanded(child: Text('Plano comercial nao carregado.')),
            OutlinedButton.icon(
              onPressed: onChangePlan,
              icon: const Icon(Icons.swap_horiz_outlined),
              label: const Text('Selecionar'),
            ),
          ],
        ),
      );
    }

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
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            runSpacing: 12,
            spacing: 12,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    height: 40,
                    width: 40,
                    decoration: BoxDecoration(
                      color: AppColors.primarySoft,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(
                      Icons.workspace_premium_outlined,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Plano ${companyPlan!.planName}',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      Text(
                        'Pagamento manual beta | Status ${companyPlan!.subscriptionStatus}',
                        style: const TextStyle(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ],
              ),
              FilledButton.icon(
                onPressed: isSaving || availablePlans.isEmpty
                    ? null
                    : onChangePlan,
                icon: const Icon(Icons.swap_horiz_outlined),
                label: const Text('Trocar plano'),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: companyPlan!.usageItems
                .map(
                  (item) => _MiniPill(
                    icon: _iconForFeature(item.feature),
                    label: '${item.label}: ${item.used}/${item.limit}',
                  ),
                )
                .toList(),
          ),
          if (planEvents.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              'Historico de plano',
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            ...planEvents
                .take(4)
                .map(
                  (event) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _PlanEventTile(event: event),
                  ),
                ),
          ],
        ],
      ),
    );
  }

  IconData _iconForFeature(String feature) {
    switch (feature) {
      case 'USER_SEATS':
        return Icons.group_outlined;
      case 'RESEARCH_SUBMISSIONS_MONTHLY':
        return Icons.analytics_outlined;
      case 'REPORT_PDFS_MONTHLY':
        return Icons.picture_as_pdf_outlined;
      case 'ACTION_TASKS_ACTIVE':
        return Icons.task_alt_outlined;
      case 'AI_QUESTIONS_MONTHLY':
        return Icons.auto_awesome_outlined;
      default:
        return Icons.check_circle_outline;
    }
  }
}

class _PlanEventTile extends StatelessWidget {
  const _PlanEventTile({required this.event});

  final SubscriptionPlanEvent event;

  @override
  Widget build(BuildContext context) {
    final previous = event.previousPlanName ?? 'Sem plano anterior';
    final actor = event.actorUserName ?? event.actorUserEmail ?? 'ADMIN';
    final createdAt = event.createdAt == null
        ? 'Data nao informada'
        : DateFormatter.formatDateTime(event.createdAt!);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$previous -> ${event.newPlanName}',
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text(
            '$createdAt por $actor (${event.origin})',
            style: const TextStyle(color: AppColors.textSecondary),
          ),
          if (event.reason?.trim().isNotEmpty == true) ...[
            const SizedBox(height: 4),
            Text(
              'Motivo: ${event.reason}',
              style: const TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ],
      ),
    );
  }
}

class _ChangePlanResult {
  const _ChangePlanResult({required this.planSlug, required this.reason});

  final String planSlug;
  final String? reason;
}

class _ChangePlanDialog extends StatefulWidget {
  const _ChangePlanDialog({
    required this.company,
    required this.plans,
    required this.currentPlanSlug,
  });

  final CompanyAccount company;
  final List<SaasPlanOption> plans;
  final String? currentPlanSlug;

  @override
  State<_ChangePlanDialog> createState() => _ChangePlanDialogState();
}

class _ChangePlanDialogState extends State<_ChangePlanDialog> {
  late String? selectedSlug =
      widget.currentPlanSlug ??
      (widget.plans.isNotEmpty ? widget.plans.first.slug : null);
  final _reasonController = TextEditingController();

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selectedPlan = _selectedPlan;

    return AlertDialog(
      title: const Text('Trocar plano da empresa'),
      content: SizedBox(
        width: 460,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Empresa: ${widget.company.name}'),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: selectedSlug,
              decoration: const InputDecoration(
                labelText: 'Plano',
                border: OutlineInputBorder(),
              ),
              items: widget.plans
                  .map(
                    (plan) => DropdownMenuItem(
                      value: plan.slug,
                      child: Text(plan.name),
                    ),
                  )
                  .toList(),
              onChanged: (value) => setState(() => selectedSlug = value),
            ),
            if (selectedPlan != null) ...[
              const SizedBox(height: 14),
              Text(
                selectedPlan.description ?? 'Plano beta com cobranca manual.',
                style: const TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _MiniPill(
                    icon: Icons.group_outlined,
                    label: '${selectedPlan.limits['users'] ?? 0} usuarios',
                  ),
                  _MiniPill(
                    icon: Icons.analytics_outlined,
                    label:
                        '${selectedPlan.limits['researchSubmissionsMonthly'] ?? 0} pesquisas/mes',
                  ),
                  _MiniPill(
                    icon: Icons.picture_as_pdf_outlined,
                    label:
                        '${selectedPlan.limits['reportPdfsMonthly'] ?? 0} PDFs/mes',
                  ),
                  _MiniPill(
                    icon: Icons.task_alt_outlined,
                    label:
                        '${selectedPlan.limits['activeActionTasks'] ?? 0} tarefas',
                  ),
                  _MiniPill(
                    icon: Icons.auto_awesome_outlined,
                    label:
                        '${selectedPlan.limits['aiQuestionsMonthly'] ?? 0} IA/mes',
                  ),
                ],
              ),
            ],
            const SizedBox(height: 14),
            TextField(
              controller: _reasonController,
              minLines: 2,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Motivo opcional',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: selectedSlug == null
              ? null
              : () => Navigator.of(context).pop(
                  _ChangePlanResult(
                    planSlug: selectedSlug!,
                    reason: _reasonController.text.trim(),
                  ),
                ),
          child: const Text('Continuar'),
        ),
      ],
    );
  }

  SaasPlanOption? get _selectedPlan {
    for (final plan in widget.plans) {
      if (plan.slug == selectedSlug) {
        return plan;
      }
    }

    return null;
  }
}

class _CompanyCard extends StatelessWidget {
  const _CompanyCard({
    required this.company,
    required this.selected,
    required this.onTap,
    required this.onEdit,
    required this.onToggleStatus,
  });

  final CompanyAccount company;
  final bool selected;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onToggleStatus;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          color: selected ? AppColors.primarySoft : AppColors.surface,
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.border,
          ),
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
                        company.name,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        company.slug,
                        style: const TextStyle(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                _StatusBadge(
                  label: company.status == CompanyAccountStatus.active
                      ? 'Ativa'
                      : 'Inativa',
                  color: company.status == CompanyAccountStatus.active
                      ? AppColors.success
                      : AppColors.danger,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _MiniPill(
                  icon: Icons.group_outlined,
                  label: '${company.userCount} usuarios',
                ),
                _MiniPill(
                  icon: Icons.schedule_outlined,
                  label:
                      'Atualizada ${DateFormatter.formatRelative(company.updatedAt)}',
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Editar'),
                ),
                TextButton.icon(
                  onPressed: onToggleStatus,
                  icon: Icon(
                    company.status == CompanyAccountStatus.active
                        ? Icons.pause_circle_outline
                        : Icons.play_circle_outline,
                  ),
                  label: Text(
                    company.status == CompanyAccountStatus.active
                        ? 'Desativar'
                        : 'Ativar',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _UserCard extends StatelessWidget {
  const _UserCard({
    required this.user,
    required this.onEdit,
    required this.onToggleStatus,
  });

  final CompanyUserAccount user;
  final VoidCallback? onEdit;
  final VoidCallback? onToggleStatus;

  @override
  Widget build(BuildContext context) {
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
                      user.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      user.email,
                      style: const TextStyle(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  _StatusBadge(
                    label: user.status == CompanyUserStatus.active
                        ? 'Ativo'
                        : 'Inativo',
                    color: user.status == CompanyUserStatus.active
                        ? AppColors.success
                        : AppColors.danger,
                  ),
                  const SizedBox(height: 8),
                  _StatusBadge(
                    label: user.role == CompanyUserRole.owner
                        ? 'OWNER'
                        : 'EMPLOYEE',
                    color: user.role == CompanyUserRole.owner
                        ? AppColors.primary
                        : AppColors.indigo,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _MiniPill(
                icon: Icons.calendar_today_outlined,
                label: 'Criado em ${DateFormatter.formatDate(user.createdAt)}',
              ),
              _MiniPill(
                icon: Icons.update_outlined,
                label:
                    'Atualizado ${DateFormatter.formatRelative(user.updatedAt)}',
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: onEdit,
                icon: const Icon(Icons.edit_outlined),
                label: const Text('Editar'),
              ),
              TextButton.icon(
                onPressed: onToggleStatus,
                icon: Icon(
                  user.status == CompanyUserStatus.active
                      ? Icons.pause_circle_outline
                      : Icons.play_circle_outline,
                ),
                label: Text(
                  user.status == CompanyUserStatus.active
                      ? 'Desativar'
                      : 'Ativar',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MetricChip extends StatelessWidget {
  const _MetricChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          Text(label, style: const TextStyle(color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class _MiniPill extends StatelessWidget {
  const _MiniPill({required this.icon, required this.label});

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
  const _StatusBadge({required this.label, required this.color});

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
        style: TextStyle(color: color, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _CompanyFormDialog extends StatefulWidget {
  const _CompanyFormDialog({this.company});

  final CompanyAccount? company;

  @override
  State<_CompanyFormDialog> createState() => _CompanyFormDialogState();
}

class _CompanyFormDialogState extends State<_CompanyFormDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _slugController;
  String? _error;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.company?.name ?? '');
    _slugController = TextEditingController(text: widget.company?.slug ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _slugController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.company == null ? 'Nova empresa' : 'Editar empresa'),
      content: SizedBox(
        width: 420,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Nome da empresa'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _slugController,
              decoration: const InputDecoration(
                labelText: 'Slug',
                helperText:
                    'Opcional. Se vazio, o backend gera automaticamente.',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppColors.danger)),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(onPressed: _submit, child: const Text('Salvar')),
      ],
    );
  }

  void _submit() {
    final name = _nameController.text.trim();
    final slug = _slugController.text.trim();

    if (name.isEmpty) {
      setState(() => _error = 'Informe o nome da empresa.');
      return;
    }

    Navigator.pop(
      context,
      _CompanyFormResult(name: name, slug: slug.isEmpty ? null : slug),
    );
  }
}

class _OnboardingFormDialog extends StatefulWidget {
  const _OnboardingFormDialog();

  @override
  State<_OnboardingFormDialog> createState() => _OnboardingFormDialogState();
}

class _OnboardingFormDialogState extends State<_OnboardingFormDialog> {
  final _companyNameController = TextEditingController();
  final _slugController = TextEditingController();
  final _ownerNameController = TextEditingController();
  final _ownerEmailController = TextEditingController();
  final _ownerPasswordController = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _companyNameController.dispose();
    _slugController.dispose();
    _ownerNameController.dispose();
    _ownerEmailController.dispose();
    _ownerPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Onboarding de empresa'),
      content: SizedBox(
        width: 460,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Cria a empresa e o primeiro usuario OWNER em uma unica operacao.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _companyNameController,
                decoration: const InputDecoration(labelText: 'Nome da empresa'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _slugController,
                decoration: const InputDecoration(
                  labelText: 'Slug',
                  helperText:
                      'Opcional. Se vazio, o backend gera automaticamente.',
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'OWNER inicial',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _ownerNameController,
                decoration: const InputDecoration(labelText: 'Nome'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _ownerEmailController,
                decoration: const InputDecoration(labelText: 'Email'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _ownerPasswordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Senha inicial',
                  helperText: 'Mínimo de 8 caracteres.',
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: AppColors.danger)),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(onPressed: _submit, child: const Text('Criar conta')),
      ],
    );
  }

  void _submit() {
    final companyName = _companyNameController.text.trim();
    final slug = _slugController.text.trim();
    final ownerName = _ownerNameController.text.trim();
    final ownerEmail = _ownerEmailController.text.trim();
    final ownerPassword = _ownerPasswordController.text.trim();

    if (companyName.isEmpty || ownerName.isEmpty || ownerEmail.isEmpty) {
      setState(() => _error = 'Informe empresa, nome e email do OWNER.');
      return;
    }

    if (!ownerEmail.contains('@')) {
      setState(() => _error = 'Informe um email valido.');
      return;
    }

    if (ownerPassword.length < 8) {
      setState(() => _error = 'A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    Navigator.pop(
      context,
      _OnboardingFormResult(
        companyName: companyName,
        slug: slug.isEmpty ? null : slug,
        ownerName: ownerName,
        ownerEmail: ownerEmail,
        ownerPassword: ownerPassword,
      ),
    );
  }
}

class _UserFormDialog extends StatefulWidget {
  const _UserFormDialog({required this.company, this.user});

  final CompanyAccount company;
  final CompanyUserAccount? user;

  @override
  State<_UserFormDialog> createState() => _UserFormDialogState();
}

class _UserFormDialogState extends State<_UserFormDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  late final TextEditingController _passwordController;
  late CompanyUserRole _role;
  String? _error;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.user?.name ?? '');
    _emailController = TextEditingController(text: widget.user?.email ?? '');
    _passwordController = TextEditingController();
    _role = widget.user?.role ?? CompanyUserRole.owner;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.user != null;

    return AlertDialog(
      title: Text(isEdit ? 'Editar usuario' : 'Novo usuario'),
      content: SizedBox(
        width: 440,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Empresa: ${widget.company.name}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Nome'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _emailController,
                decoration: const InputDecoration(labelText: 'Email'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: isEdit ? 'Nova senha (opcional)' : 'Senha',
                  helperText: isEdit
                      ? 'Preencha apenas se quiser alterar a senha.'
                      : 'Mínimo de 8 caracteres.',
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<CompanyUserRole>(
                initialValue: _role,
                decoration: const InputDecoration(labelText: 'Perfil'),
                items: const [
                  DropdownMenuItem(
                    value: CompanyUserRole.owner,
                    child: Text('OWNER'),
                  ),
                  DropdownMenuItem(
                    value: CompanyUserRole.employee,
                    child: Text('EMPLOYEE'),
                  ),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _role = value);
                  }
                },
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: AppColors.danger)),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(onPressed: _submit, child: const Text('Salvar')),
      ],
    );
  }

  void _submit() {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (name.isEmpty || email.isEmpty) {
      setState(() => _error = 'Nome e email sao obrigatorios.');
      return;
    }

    if (password.isNotEmpty && password.length < 8) {
      setState(() => _error = 'A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    Navigator.pop(
      context,
      _UserFormResult(
        name: name,
        email: email,
        role: _role,
        password: password.isEmpty ? null : password,
      ),
    );
  }
}

class _CompanyFormResult {
  const _CompanyFormResult({required this.name, this.slug});

  final String name;
  final String? slug;
}

class _UserFormResult {
  const _UserFormResult({
    required this.name,
    required this.email,
    required this.role,
    this.password,
  });

  final String name;
  final String email;
  final CompanyUserRole role;
  final String? password;
}

class _OnboardingFormResult {
  const _OnboardingFormResult({
    required this.companyName,
    required this.ownerName,
    required this.ownerEmail,
    required this.ownerPassword,
    this.slug,
  });

  final String companyName;
  final String? slug;
  final String ownerName;
  final String ownerEmail;
  final String ownerPassword;
}
