import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_page_scaffold.dart';

class ResearchCompanyOption {
  const ResearchCompanyOption({required this.id, required this.name});

  final String id;
  final String name;
}

class ResearchStartPage extends StatefulWidget {
  const ResearchStartPage({
    super.key,
    required this.onStart,
    this.isStarting = false,
    this.allowStart = true,
    this.historySection,
    this.requireCompanySelection = false,
    this.companyOptions = const [],
    this.lockAssignedProfile = false,
    this.assignedRole,
    this.assignedSector,
  });

  final Future<void> Function({
    required String role,
    required String sector,
    String? companyId,
  })
  onStart;
  final bool isStarting;
  final bool allowStart;
  final Widget? historySection;
  final bool requireCompanySelection;
  final List<ResearchCompanyOption> companyOptions;
  final bool lockAssignedProfile;
  final String? assignedRole;
  final String? assignedSector;

  @override
  State<ResearchStartPage> createState() => _ResearchStartPageState();
}

class _ResearchStartPageState extends State<ResearchStartPage> {
  static const List<String> _roles = [
    'Diretor(a)',
    'Gerente',
    'Coordenador(a)',
    'Analista',
    'Assistente',
    'Outro',
  ];

  static const List<String> _sectors = [
    'Administrativo',
    'Comercial',
    'Financeiro',
    'Operacoes',
    'RH',
    'Tecnologia',
    'Outro',
  ];

  String? _selectedRole;
  String? _selectedSector;
  String? _selectedCompanyId;

  Future<void> _handleStart() async {
    final role = (widget.lockAssignedProfile ? widget.assignedRole : _selectedRole)?.trim();
    final sector = (widget.lockAssignedProfile ? widget.assignedSector : _selectedSector)?.trim();
    final companyId = _selectedCompanyId?.trim();

    if (role == null || role.isEmpty || sector == null || sector.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Selecione funcao e setor para continuar.'),
        ),
      );
      return;
    }

    if (widget.requireCompanySelection &&
        (companyId == null || companyId.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Selecione a empresa para iniciar a pesquisa.'),
        ),
      );
      return;
    }

    await widget.onStart(role: role, sector: sector, companyId: companyId);
  }

  @override
  Widget build(BuildContext context) {
    return AppPageScaffold(
      title: 'Pesquisa Empresarial',
      subtitle: widget.allowStart
          ? widget.lockAssignedProfile
            ? 'Seu perfil profissional atribuido sera usado nesta pesquisa.'
            : 'Antes de comecar, informe sua funcao e o setor em que atua.'
          : 'Acompanhe as pesquisas das empresas. O perfil ADMIN possui acesso somente para consulta.',
      child: ListView(
        children: [
          if (widget.allowStart)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Informacoes iniciais',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (widget.requireCompanySelection) ...[
                      const _FieldLabel(text: 'Empresa'),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        initialValue: _selectedCompanyId,
                        items: widget.companyOptions
                            .map(
                              (item) => DropdownMenuItem(
                                value: item.id,
                                child: Text(item.name),
                              ),
                            )
                            .toList(),
                        decoration: _inputDecoration(
                          hintText: 'Selecione a empresa',
                        ),
                        onChanged: (value) =>
                            setState(() => _selectedCompanyId = value),
                      ),
                      const SizedBox(height: 16),
                    ],
                    if (widget.lockAssignedProfile) ...[
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.badge_outlined),
                        title: Text(widget.assignedRole?.trim().isNotEmpty == true
                            ? widget.assignedRole! : 'Perfil profissional incompleto'),
                        subtitle: Text(widget.assignedSector?.trim().isNotEmpty == true
                            ? widget.assignedSector! : 'Solicite ao OWNER o preenchimento do departamento e da funcao.'),
                      ),
                    ] else ...[
                    _FieldLabel(text: 'Funcao (cargo)'),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedRole,
                      items: _roles
                          .map(
                            (item) => DropdownMenuItem(
                              value: item,
                              child: Text(item),
                            ),
                          )
                          .toList(),
                      decoration: _inputDecoration(
                        hintText: 'Selecione sua funcao',
                      ),
                      onChanged: (value) =>
                          setState(() => _selectedRole = value),
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel(text: 'Setor'),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedSector,
                      items: _sectors
                          .map(
                            (item) => DropdownMenuItem(
                              value: item,
                              child: Text(item),
                            ),
                          )
                          .toList(),
                      decoration: _inputDecoration(
                        hintText: 'Selecione seu setor',
                      ),
                      onChanged: (value) =>
                          setState(() => _selectedSector = value),
                    ),
                    ],
                    const SizedBox(height: 24),
                    Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton.icon(
                        onPressed: widget.isStarting ||
                            (widget.lockAssignedProfile &&
                              ((widget.assignedRole?.trim().isEmpty ?? true) ||
                               (widget.assignedSector?.trim().isEmpty ?? true)))
                          ? null : _handleStart,
                        icon: widget.isStarting
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.play_arrow_rounded),
                        label: Text(
                          widget.isStarting
                              ? 'Iniciando...'
                              : 'Iniciar Pesquisa Empresarial',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          if (widget.historySection != null) ...[
            const SizedBox(height: 16),
            widget.historySection!,
          ],
        ],
      ),
    );
  }

  InputDecoration _inputDecoration({required String hintText}) {
    return InputDecoration(
      hintText: hintText,
      filled: true,
      fillColor: AppColors.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: AppColors.border),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontWeight: FontWeight.w800,
        color: AppColors.textSecondary,
      ),
    );
  }
}
