import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/auth/role_guard.dart';
import '../../../../core/di/providers.dart';
import '../../../../core/errors/api_error_presenter.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/services/change_password_service.dart';
import '../providers/auth_providers.dart';

final changePasswordServiceProvider = Provider<ChangePasswordService>((ref) {
  return ChangePasswordService(ref.watch(dioProvider));
});

class ChangePasswordPage extends ConsumerStatefulWidget {
  const ChangePasswordPage({super.key, this.changePassword});

  final Future<void> Function(String currentPassword, String newPassword)?
  changePassword;

  @override
  ConsumerState<ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends ConsumerState<ChangePasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmationController = TextEditingController();
  bool _showCurrentPassword = false;
  bool _showNewPassword = false;
  bool _showConfirmation = false;
  bool _isLoading = false;
  String? _error;
  String? _success;

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmationController.dispose();
    super.dispose();
  }

  String? _required(String? value) {
    return value == null || value.isEmpty ? 'Campo obrigatorio' : null;
  }

  String? _validateNewPassword(String? value) {
    final requiredError = _required(value);
    if (requiredError != null) return requiredError;
    final password = value!;
    if (password.length < 8) return 'Use pelo menos 8 caracteres';
    if (RegExp(r'^\d+$').hasMatch(password)) {
      return 'A senha nao pode conter somente numeros';
    }
    return null;
  }

  Future<void> _submit() async {
    if (_isLoading || !_formKey.currentState!.validate()) return;
    final currentPassword = _currentPasswordController.text;
    final newPassword = _newPasswordController.text;
    if (newPassword != _confirmationController.text) {
      setState(() {
        _error = 'A confirmacao deve ser igual a nova senha.';
        _success = null;
      });
      return;
    }
    if (newPassword == currentPassword) {
      setState(() {
        _error = 'A nova senha deve ser diferente da senha atual.';
        _success = null;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
      _success = null;
    });
    try {
      final callback =
          widget.changePassword ??
          (current, next) => ref
              .read(changePasswordServiceProvider)
              .changePassword(currentPassword: current, newPassword: next);
      await callback(currentPassword, newPassword);
      if (!mounted) return;
      _currentPasswordController.clear();
      _newPasswordController.clear();
      _confirmationController.clear();
      setState(() => _success = 'Senha alterada com sucesso');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Senha alterada com sucesso')),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = userFriendlyError(error);
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _goBack() {
    if (context.canPop()) {
      context.pop();
      return;
    }
    final role = ref.read(authControllerProvider).user?.role;
    context.go(RoleGuard.defaultRouteForRole(role));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Seguranca da conta'),
        leading: IconButton(
          key: const Key('change-password-back-button'),
          tooltip: 'Voltar',
          onPressed: _goBack,
          icon: const Icon(Icons.arrow_back),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.password_outlined,
                        size: 42,
                        color: AppColors.primary,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Alterar minha senha',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Use ao menos 8 caracteres. Evite somente numeros, seu email e senhas comuns.',
                      ),
                      const SizedBox(height: 24),
                      _PasswordField(
                        fieldKey: const Key('current-password-field'),
                        visibilityKey: const Key('current-password-visibility'),
                        controller: _currentPasswordController,
                        label: 'Senha atual',
                        visible: _showCurrentPassword,
                        onToggleVisibility: () => setState(() {
                          _showCurrentPassword = !_showCurrentPassword;
                        }),
                        validator: _required,
                      ),
                      const SizedBox(height: 16),
                      _PasswordField(
                        fieldKey: const Key('new-password-field'),
                        visibilityKey: const Key('new-password-visibility'),
                        controller: _newPasswordController,
                        label: 'Nova senha',
                        visible: _showNewPassword,
                        onToggleVisibility: () => setState(() {
                          _showNewPassword = !_showNewPassword;
                        }),
                        validator: _validateNewPassword,
                      ),
                      const SizedBox(height: 16),
                      _PasswordField(
                        fieldKey: const Key('confirm-password-field'),
                        visibilityKey: const Key('confirm-password-visibility'),
                        controller: _confirmationController,
                        label: 'Confirmar nova senha',
                        visible: _showConfirmation,
                        onToggleVisibility: () => setState(() {
                          _showConfirmation = !_showConfirmation;
                        }),
                        validator: _required,
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          key: const Key('change-password-error'),
                          style: const TextStyle(color: AppColors.danger),
                        ),
                      ],
                      if (_success != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          _success!,
                          key: const Key('change-password-success'),
                          style: const TextStyle(color: AppColors.success),
                        ),
                      ],
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          key: const Key('change-password-submit'),
                          onPressed: _isLoading ? null : _submit,
                          icon: _isLoading
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.lock_reset_outlined),
                          label: const Text('Alterar senha'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PasswordField extends StatelessWidget {
  const _PasswordField({
    required this.fieldKey,
    required this.visibilityKey,
    required this.controller,
    required this.label,
    required this.visible,
    required this.onToggleVisibility,
    required this.validator,
  });

  final Key fieldKey;
  final Key visibilityKey;
  final TextEditingController controller;
  final String label;
  final bool visible;
  final VoidCallback onToggleVisibility;
  final FormFieldValidator<String> validator;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      key: fieldKey,
      controller: controller,
      obscureText: !visible,
      enableSuggestions: false,
      autocorrect: false,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        suffixIcon: IconButton(
          key: visibilityKey,
          tooltip: visible ? 'Ocultar senha' : 'Mostrar senha',
          onPressed: onToggleVisibility,
          icon: Icon(visible ? Icons.visibility_off : Icons.visibility),
        ),
      ),
    );
  }
}
