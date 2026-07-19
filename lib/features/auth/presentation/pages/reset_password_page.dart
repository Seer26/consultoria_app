import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../providers/auth_providers.dart';

class ResetPasswordPage extends ConsumerStatefulWidget {
  const ResetPasswordPage({
    super.key,
    required this.token,
    this.removeTokenFromUrl = false,
    this.resetPassword,
    this.onSuccess,
  });

  final String token;
  final bool removeTokenFromUrl;
  final Future<void> Function(String token, String newPassword)? resetPassword;
  final VoidCallback? onSuccess;

  @override
  ConsumerState<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends ConsumerState<ResetPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmationController = TextEditingController();
  bool _isLoading = false;
  bool _success = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.removeTokenFromUrl && widget.token.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.replace('/reset-password', extra: widget.token);
      });
    }
  }

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmationController.dispose();
    super.dispose();
  }

  String? _validatePassword(String? value) {
    final password = value ?? '';
    if (password.length < 8) return 'Use pelo menos 8 caracteres';
    if (RegExp(r'^\d+$').hasMatch(password)) {
      return 'A senha nao pode conter somente numeros';
    }
    return null;
  }

  Future<void> _submit() async {
    if (_isLoading || !_formKey.currentState!.validate()) return;
    if (widget.token.isEmpty) {
      setState(
        () => _error = 'Link de redefinicao invalido. Solicite um novo link.',
      );
      return;
    }
    if (_passwordController.text != _confirmationController.text) {
      setState(() => _error = 'As senhas informadas nao coincidem.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final callback =
          widget.resetPassword ??
          (token, password) => ref
              .read(authRepositoryProvider)
              .resetPassword(token: token, newPassword: password);
      await callback(widget.token, _passwordController.text);
      if (!mounted) return;
      setState(() => _success = true);
      if (widget.onSuccess != null) {
        widget.onSuccess!();
      } else {
        await Future<void>.delayed(const Duration(seconds: 1));
        if (mounted) context.go('/login');
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.password,
                        size: 40,
                        color: AppColors.primary,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Crie uma nova senha',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Use ao menos 8 caracteres. Evite somente numeros, seu email e senhas comuns.',
                      ),
                      const SizedBox(height: 20),
                      TextFormField(
                        key: const Key('reset-password-field'),
                        controller: _passwordController,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Nova senha',
                        ),
                        validator: _validatePassword,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        key: const Key('reset-confirmation-field'),
                        controller: _confirmationController,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Confirmar nova senha',
                        ),
                        validator: (value) => (value == null || value.isEmpty)
                            ? 'Confirme a nova senha'
                            : null,
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          key: const Key('reset-error-message'),
                          style: const TextStyle(color: AppColors.danger),
                        ),
                      ],
                      if (_success) ...[
                        const SizedBox(height: 16),
                        const Text(
                          'Senha redefinida. Voce sera direcionado para o login.',
                          key: Key('reset-success-message'),
                          style: TextStyle(color: AppColors.success),
                        ),
                      ],
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          key: const Key('reset-submit-button'),
                          onPressed: _isLoading || _success ? null : _submit,
                          child: _isLoading
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text('Redefinir senha'),
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
