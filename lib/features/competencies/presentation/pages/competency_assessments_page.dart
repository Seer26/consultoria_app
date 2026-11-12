import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/auth/role_guard.dart';
import '../../../../core/errors/api_error_presenter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../widgets/role_guard.dart';
import '../../../admin_management/domain/entities/company_account.dart';
import '../../../admin_management/domain/entities/company_user_account.dart';
import '../../../admin_management/presentation/providers/admin_management_providers.dart';
import '../../domain/entities/competency_assessment.dart';
import '../providers/competencies_admin_providers.dart';
import '../widgets/competencies_async_view.dart';
import 'competency_catalog_page.dart';
import 'competency_assessment_editor_page.dart';
import 'competency_assessment_result_page.dart';

class CompetencyAssessmentsPage extends StatelessWidget {
  const CompetencyAssessmentsPage({super.key, this.companyId, this.userId});
  final String? companyId, userId;
  @override
  Widget build(BuildContext context) => RbacGuard(
    allowedRoles: const [RoleGuard.admin],
    child: _AssessmentsContent(
      key: ValueKey('$companyId/$userId'),
      companyId: companyId,
      userId: userId,
    ),
  );
}

class _AssessmentsContent extends ConsumerStatefulWidget {
  const _AssessmentsContent({super.key, this.companyId, this.userId});
  final String? companyId, userId;
  @override
  ConsumerState<_AssessmentsContent> createState() =>
      _AssessmentsContentState();
}

typedef _CompanyData = ({
  List<CompanyUserAccount> users,
  List<CompetencyAssessment> assessments,
});

class _AssessmentsContentState extends ConsumerState<_AssessmentsContent> {
  late Future<List<CompanyAccount>> _companies;
  Future<_CompanyData>? _data;
  late String? _companyId = widget.companyId;
  late String? _userId = widget.userId;
  bool _busy = false;
  @override
  void initState() {
    super.initState();
    _loadCompanies();
    if (_companyId != null) _loadCompany();
  }

  void _loadCompanies() {
    _companies = ref.read(adminManagementServiceProvider).fetchCompanies();
  }

  void _loadCompany() {
    final id = _companyId!;
    final users = ref
        .read(adminManagementServiceProvider)
        .fetchCompanyUsers(id);
    final assessments = ref
        .read(competenciesAdminServiceProvider)
        .assessments(id);
    _data = Future.wait<Object>([users, assessments]).then(
      (results) => (
        users: results[0] as List<CompanyUserAccount>,
        assessments: results[1] as List<CompetencyAssessment>,
      ),
    );
  }

  Future<void> _open(Widget page) async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => page));
    if (mounted && _companyId != null) setState(_loadCompany);
  }

  Future<void> _start() async {
    setState(() => _busy = true);
    try {
      final assessment = await ref
          .read(competenciesAdminServiceProvider)
          .startOrResume(_companyId!, _userId!);
      if (mounted) {
        await _open(
          CompetencyAssessmentEditorPage(
            companyId: _companyId!,
            assessmentId: assessment.id,
          ),
        );
      }
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
    title: 'Competências',
    subtitle: 'Avaliação técnica e histórico • Exclusivo da consultoria',
    child: CompetenciesAsyncView(
      future: _companies,
      onRetry: () => setState(_loadCompanies),
      builder: (companies) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<String>(
            key: const Key('competency-company'),
            initialValue: companies.any((c) => c.id == _companyId)
                ? _companyId
                : null,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Empresa'),
            items: [
              for (final company in companies)
                DropdownMenuItem(
                  value: company.id,
                  child: Text(company.name, overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: _busy
                ? null
                : (value) => setState(() {
                    _companyId = value;
                    _userId = null;
                    _loadCompany();
                  }),
          ),
          const SizedBox(height: 16),
          if (_data == null)
            const Text(
              'Selecione uma empresa para consultar avaliações e catálogo.',
            )
          else
            Expanded(
              child: CompetenciesAsyncView(
                future: _data!,
                onRetry: () => setState(_loadCompany),
                builder: (data) => ListView(
                  children: [
                    DropdownButtonFormField<String>(
                      key: ValueKey('competency-person'),
                      initialValue: data.users.any((u) => u.id == _userId)
                          ? _userId
                          : null,
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Pessoa'),
                      items: [
                        for (final user in data.users)
                          DropdownMenuItem(
                            value: user.id,
                            child: Text(
                              user.name,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                      ],
                      onChanged: _busy
                          ? null
                          : (value) => setState(() => _userId = value),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        FilledButton(
                          key: const Key('competency-start'),
                          onPressed: _userId == null || _busy ? null : _start,
                          child: const Text('Iniciar / retomar avaliação'),
                        ),
                        OutlinedButton(
                          onPressed: _busy
                              ? null
                              : () => _open(
                                  CompetencyCatalogPage(companyId: _companyId!),
                                ),
                          child: const Text('Catálogo'),
                        ),
                        if (_userId != null)
                          OutlinedButton(
                            onPressed: () => _open(
                              _PersonHistoryPage(
                                companyId: _companyId!,
                                userId: _userId!,
                              ),
                            ),
                            child: const Text('Histórico da pessoa'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Avaliações da empresa',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    if (data.assessments.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('Nenhuma avaliação nesta empresa.'),
                      ),
                    for (final assessment in data.assessments.where(
                      (a) => _userId == null || a.subjectUserId == _userId,
                    ))
                      _assessmentCard(
                        context,
                        assessment,
                        () => _open(
                          assessment.isCompleted
                              ? CompetencyAssessmentResultPage(
                                  companyId: _companyId!,
                                  assessmentId: assessment.id,
                                )
                              : CompetencyAssessmentEditorPage(
                                  companyId: _companyId!,
                                  assessmentId: assessment.id,
                                ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    ),
  );
}

Widget _assessmentCard(
  BuildContext context,
  CompetencyAssessment item,
  VoidCallback onOpen,
) => Card(
  child: Padding(
    padding: const EdgeInsets.all(16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(item.subjectName, style: Theme.of(context).textTheme.titleMedium),
        Text(item.isCompleted ? 'Concluída' : 'Em andamento'),
        Text(
          DateFormatter.formatDateTime(
            (item.completedAt ?? item.startedAt).toLocal(),
          ),
        ),
        TextButton(
          onPressed: onOpen,
          child: Text(item.isCompleted ? 'Ver resultado' : 'Retomar avaliação'),
        ),
      ],
    ),
  ),
);

class _PersonHistoryPage extends ConsumerWidget {
  const _PersonHistoryPage({required this.companyId, required this.userId});
  final String companyId, userId;
  @override
  Widget build(BuildContext context, WidgetRef ref) => RbacGuard(
    allowedRoles: const [RoleGuard.admin],
    child: _PersonHistoryContent(companyId: companyId, userId: userId),
  );
}

class _PersonHistoryContent extends ConsumerStatefulWidget {
  const _PersonHistoryContent({required this.companyId, required this.userId});
  final String companyId, userId;
  @override
  ConsumerState<_PersonHistoryContent> createState() =>
      _PersonHistoryContentState();
}

class _PersonHistoryContentState extends ConsumerState<_PersonHistoryContent> {
  late Future<List<AdminCompetencyAssessment>> _future;
  void _load() {
    _future = ref
        .read(competenciesAdminServiceProvider)
        .history(widget.companyId, widget.userId);
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _open(CompetencyAssessment item) async {
    await Navigator.push(
      context,
      MaterialPageRoute<void>(
        builder: (_) => item.isCompleted
            ? CompetencyAssessmentResultPage(
                companyId: widget.companyId,
                assessmentId: item.id,
              )
            : CompetencyAssessmentEditorPage(
                companyId: widget.companyId,
                assessmentId: item.id,
              ),
      ),
    );
    if (mounted) setState(_load);
  }

  @override
  Widget build(BuildContext context) => AppPageScaffold(
    title: 'Histórico da pessoa',
    subtitle: 'Registros técnicos da empresa selecionada',
    actions: competenciesBackActions(context),
    child: CompetenciesAsyncView(
      future: _future,
      onRetry: () => setState(_load),
      builder: (items) => ListView(
        children: [
          if (items.isEmpty) const Text('Nenhuma avaliação registrada.'),
          for (final item in items)
            _assessmentCard(
              context,
              item.assessment,
              () => _open(item.assessment),
            ),
        ],
      ),
    ),
  );
}
