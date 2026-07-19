import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../data/services/company_settings_service.dart';

final companySettingsServiceProvider = Provider<CompanySettingsService>((ref) {
  return CompanySettingsService(ref.watch(dioProvider));
});

final companySettingsProvider = FutureProvider<CompanySettings>((ref) {
  return ref.watch(companySettingsServiceProvider).getSettings();
});

class CompanySettingsPage extends ConsumerStatefulWidget {
  const CompanySettingsPage({super.key});

  @override
  ConsumerState<CompanySettingsPage> createState() =>
      _CompanySettingsPageState();
}

class _CompanySettingsPageState extends ConsumerState<CompanySettingsPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _sectorController = TextEditingController();
  final _sizeController = TextEditingController();
  final _phoneController = TextEditingController();
  final _responsibleController = TextEditingController();
  final _notesController = TextEditingController();
  String? _loadedCompanyId;
  bool _isSaving = false;

  @override
  void dispose() {
    _nameController.dispose();
    _sectorController.dispose();
    _sizeController.dispose();
    _phoneController.dispose();
    _responsibleController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _hydrate(CompanySettings settings) {
    if (_loadedCompanyId == settings.id) {
      return;
    }

    _loadedCompanyId = settings.id;
    _nameController.text = settings.name;
    _sectorController.text = settings.sector ?? '';
    _sizeController.text = settings.size ?? '';
    _phoneController.text = settings.phone ?? '';
    _responsibleController.text = settings.responsibleName ?? '';
    _notesController.text = settings.notes ?? '';
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isSaving = true);
    try {
      await ref
          .read(companySettingsServiceProvider)
          .updateSettings(
            UpdateCompanySettingsInput(
              name: _nameController.text.trim(),
              sector: _sectorController.text.trim(),
              size: _sizeController.text.trim(),
              phone: _phoneController.text.trim(),
              responsibleName: _responsibleController.text.trim(),
              notes: _notesController.text.trim(),
            ),
          );
      ref.invalidate(companySettingsProvider);
      if (mounted) {
        AppFeedback.showSnackBar(
          context,
          message: 'Configuracoes da empresa salvas com sucesso.',
          type: AppFeedbackType.success,
        );
      }
    } catch (error) {
      if (mounted) {
        AppFeedback.showSnackBar(
          context,
          message: error.toString().replaceFirst('Exception: ', ''),
          type: AppFeedbackType.error,
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final settingsState = ref.watch(companySettingsProvider);

    return AppPageScaffold(
      title: 'Configuracoes da empresa',
      subtitle:
          'Dados basicos visiveis para a propria empresa. Plano e status comercial continuam sob controle do ADMIN.',
      actions: [
        OutlinedButton.icon(
          onPressed: _isSaving
              ? null
              : () => ref.invalidate(companySettingsProvider),
          icon: const Icon(Icons.refresh_outlined),
          label: const Text('Atualizar'),
        ),
        FilledButton.icon(
          onPressed: _isSaving ? null : _save,
          icon: const Icon(Icons.save_outlined),
          label: Text(_isSaving ? 'Salvando...' : 'Salvar'),
        ),
      ],
      child: settingsState.when(
        loading: () =>
            const AppLoadingState(message: 'Carregando configuracoes'),
        error: (error, _) => AppErrorState(
          title: 'Nao foi possivel carregar as configuracoes',
          message: error.toString(),
          onRetry: () => ref.invalidate(companySettingsProvider),
        ),
        data: (settings) {
          _hydrate(settings);

          return Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          height: 48,
                          width: 48,
                          decoration: BoxDecoration(
                            color: AppColors.primarySoft,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Icon(
                            Icons.apartment_outlined,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                settings.slug,
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Status operacional: ${settings.status}',
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(
                        labelText: 'Nome fantasia',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) =>
                          value == null || value.trim().isEmpty
                          ? 'Informe o nome fantasia.'
                          : null,
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 14,
                      runSpacing: 14,
                      children: [
                        SizedBox(
                          width: 320,
                          child: TextFormField(
                            controller: _sectorController,
                            decoration: const InputDecoration(
                              labelText: 'Setor',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                        SizedBox(
                          width: 320,
                          child: TextFormField(
                            controller: _sizeController,
                            decoration: const InputDecoration(
                              labelText: 'Porte',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 14,
                      runSpacing: 14,
                      children: [
                        SizedBox(
                          width: 320,
                          child: TextFormField(
                            controller: _phoneController,
                            decoration: const InputDecoration(
                              labelText: 'Telefone',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                        SizedBox(
                          width: 320,
                          child: TextFormField(
                            controller: _responsibleController,
                            decoration: const InputDecoration(
                              labelText: 'Responsavel',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _notesController,
                      minLines: 4,
                      maxLines: 6,
                      decoration: const InputDecoration(
                        labelText: 'Observacoes ou preferencias',
                        alignLabelWithHint: true,
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceMuted,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Text(
                        'Plano, limites, status comercial e troca de assinatura nao podem ser alterados nesta tela.',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
