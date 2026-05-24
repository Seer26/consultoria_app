import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../domain/entities/company_account.dart';
import '../../domain/entities/company_user_account.dart';
import '../controllers/admin_management_controller.dart';
import '../providers/admin_management_providers.dart';

class CompaniesManagementPage extends ConsumerWidget {
  const CompaniesManagementPage({
    super.key,
    this.initialUsersView = false,
  });

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
          onPressed: state.isLoadingCompanies ? null : () => controller.loadCompanies(),
          icon: const Icon(Icons.refresh),
          label: const Text('Atualizar'),
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
                      isLoadingUsers: state.isLoadingUsers,
                      isSaving: state.isSaving,
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
      return 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (raw.contains('INVALID_COMPANY_NAME')) {
      return 'Informe um nome de empresa valido.';
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
                _MetricChip(
                  label: 'Total',
                  value: '${state.companies.length}',
                ),
                _MetricChip(
                  label: 'Ativas',
                  value: '${state.companies.where((item) => item.status == CompanyAccountStatus.active).length}',
                ),
                _MetricChip(
                  label: 'Usuarios',
                  value: '${state.companies.fold<int>(0, (sum, item) => sum + item.userCount)}',
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
    required this.isLoadingUsers,
    required this.isSaving,
    required this.onCreateUser,
    required this.onEditUser,
    required this.onToggleUserStatus,
  });

  final CompanyAccount? company;
  final List<CompanyUserAccount> users;
  final bool isLoadingUsers;
  final bool isSaving;
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
                message: 'Os usuarios da empresa aparecem aqui assim que voce escolher uma conta.',
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
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Slug ${company!.slug} | Atualizado em ${DateFormatter.formatDateTime(company!.updatedAt)}',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: AppColors.textSecondary,
                                  ),
                            ),
                          ],
                        ),
                      ),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _StatusBadge(
                            label: company!.status == CompanyAccountStatus.active
                                ? 'Ativa'
                                : 'Inativa',
                            color: company!.status == CompanyAccountStatus.active
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
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      _MetricChip(label: 'Usuarios', value: '${users.length}'),
                      _MetricChip(
                        label: 'Owners',
                        value: '${users.where((item) => item.role == CompanyUserRole.owner).length}',
                      ),
                      _MetricChip(
                        label: 'Ativos',
                        value: '${users.where((item) => item.status == CompanyUserStatus.active).length}',
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
                        message: 'Cadastre OWNERs e EMPLOYEEs para iniciar o uso da conta.',
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
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
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
                  label: company.status == CompanyAccountStatus.active ? 'Ativa' : 'Inativa',
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
                  label: 'Atualizada ${DateFormatter.formatRelative(company.updatedAt)}',
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
                    label: user.status == CompanyUserStatus.active ? 'Ativo' : 'Inativo',
                    color: user.status == CompanyUserStatus.active
                        ? AppColors.success
                        : AppColors.danger,
                  ),
                  const SizedBox(height: 8),
                  _StatusBadge(
                    label: user.role == CompanyUserRole.owner ? 'OWNER' : 'EMPLOYEE',
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
                label: 'Atualizado ${DateFormatter.formatRelative(user.updatedAt)}',
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
                  user.status == CompanyUserStatus.active ? 'Desativar' : 'Ativar',
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
  const _MetricChip({
    required this.label,
    required this.value,
  });

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
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          Text(
            label,
            style: const TextStyle(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _MiniPill extends StatelessWidget {
  const _MiniPill({
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
                helperText: 'Opcional. Se vazio, o backend gera automaticamente.',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: const TextStyle(color: AppColors.danger),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _submit,
          child: const Text('Salvar'),
        ),
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
      _CompanyFormResult(
        name: name,
        slug: slug.isEmpty ? null : slug,
      ),
    );
  }
}

class _UserFormDialog extends StatefulWidget {
  const _UserFormDialog({
    required this.company,
    this.user,
  });

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
                      : 'Minimo de 6 caracteres.',
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
                Text(
                  _error!,
                  style: const TextStyle(color: AppColors.danger),
                ),
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
        FilledButton(
          onPressed: _submit,
          child: const Text('Salvar'),
        ),
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

    if (widget.user == null && password.length < 6) {
      setState(() => _error = 'A senha deve ter pelo menos 6 caracteres.');
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
  const _CompanyFormResult({
    required this.name,
    this.slug,
  });

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
