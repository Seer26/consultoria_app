import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/auth/role_guard.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../providers/auth_providers.dart';
import '../state/auth_state.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController(text: 'admin@teste.com');
  final _passwordController = TextEditingController(text: '123456');

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    ref.read(authControllerProvider.notifier).clearError();
    final auth = ref.read(authControllerProvider.notifier);
    await auth.login(_emailController.text.trim(), _passwordController.text.trim());
    final state = ref.read(authControllerProvider);

    if (state.status == AuthStatus.authenticated && mounted) {
      AppFeedback.showSnackBar(
        context,
        message: 'Sessao iniciada com sucesso.',
        type: AppFeedbackType.success,
      );
      context.go(RoleGuard.defaultRouteForRole(state.user?.role));
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authControllerProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFF5F7FC), Color(0xFFEAF0FF)],
          ),
        ),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1120),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final isWide = constraints.maxWidth >= 900;
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: isWide
                          ? Row(
                              children: [
                                const Expanded(child: _LoginAside()),
                                const SizedBox(width: 24),
                                Expanded(
                                  child: _LoginForm(
                                    state: state,
                                    onSubmit: _submit,
                                  ),
                                ),
                              ],
                            )
                          : _LoginForm(state: state, onSubmit: _submit),
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LoginAside extends StatelessWidget {
  const _LoginAside();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(24),
      ),
      padding: const EdgeInsets.all(28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: const [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.insights, color: Colors.white, size: 40),
              SizedBox(height: 24),
              Text(
                'Login com backend real antes de entrar no workspace.',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  height: 1.2,
                ),
              ),
              SizedBox(height: 12),
              Text(
                'A sessao local salva token, user, role, companyId e company para liberar o painel correto do usuario.',
                style: TextStyle(
                  color: Color(0xFFDCE6FF),
                  fontSize: 16,
                  height: 1.5,
                ),
              ),
            ],
          ),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _LoginInfoChip(label: 'SharedPreferences'),
              _LoginInfoChip(label: 'JWT via backend'),
              _LoginInfoChip(label: 'Role + companyId + company'),
            ],
          ),
        ],
      ),
    );
  }
}

class _LoginInfoChip extends StatelessWidget {
  const _LoginInfoChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.16)),
      ),
      child: Text(label, style: const TextStyle(color: Colors.white)),
    );
  }
}

class _LoginForm extends StatelessWidget {
  const _LoginForm({
    required this.state,
    required this.onSubmit,
  });

  final AuthState state;
  final Future<void> Function() onSubmit;

  @override
  Widget build(BuildContext context) {
    final parentState = context.findAncestorStateOfType<_LoginPageState>()!;

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Entrar na plataforma',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Use seu acesso para entrar no painel conforme o perfil ADMIN, OWNER ou EMPLOYEE.',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: AppColors.textSecondary,
              ),
        ),
        const SizedBox(height: 24),
        Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF7F9FC),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE4E9F2)),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Usuarios de teste',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
              SizedBox(height: 8),
              Text('ADMIN: admin@teste.com / 123456'),
              Text('OWNER: owner@teste.com / 123456'),
              Text('EMPLOYEE: employee@teste.com / 123456'),
            ],
          ),
        ),
        Form(
          key: parentState._formKey,
          child: Column(
            children: [
              TextFormField(
                controller: parentState._emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.mail_outline),
                ),
                validator: (value) =>
                    (value == null || !value.contains('@')) ? 'Informe um email valido' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: parentState._passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Senha',
                  prefixIcon: Icon(Icons.lock_outline),
                ),
                validator: (value) =>
                    (value == null || value.length < 4) ? 'Senha muito curta' : null,
              ),
              const SizedBox(height: 16),
              if (state.error != null)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFDECEC),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFF5C2C2)),
                  ),
                  child: Text(
                    state.error!,
                    style: const TextStyle(color: AppColors.danger),
                  ),
                ),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: state.isLoading ? null : onSubmit,
                  child: state.isLoading
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Entrar'),
                ),
              ),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  'Endpoint: /auth/login',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textMuted,
                      ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
