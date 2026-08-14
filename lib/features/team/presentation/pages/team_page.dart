import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../../../core/errors/api_error_presenter.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../data/services/team_service.dart';

final teamServiceProvider = Provider<TeamService>(
  (ref) => TeamService(ref.watch(dioProvider)),
);
final teamProvider = FutureProvider<List<TeamMember>>(
  (ref) => ref.watch(teamServiceProvider).list(),
);

class TeamPage extends ConsumerWidget {
  const TeamPage({super.key});

  Future<void> _edit(
    BuildContext context,
    WidgetRef ref, [
    TeamMember? member,
  ]) async {
    final name = TextEditingController(text: member?.name);
    final email = TextEditingController(text: member?.email);
    final department = TextEditingController(text: member?.department);
    final jobFunction = TextEditingController(text: member?.jobFunction);
    final password = TextEditingController();
    final key = GlobalKey<FormState>();
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(member == null ? 'Novo colaborador' : 'Editar colaborador'),
        content: SizedBox(
          width: 520,
          child: Form(
            key: key,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _field(name, 'Nome'),
                  const SizedBox(height: 12),
                  _field(email, 'E-mail'),
                  const SizedBox(height: 12),
                  _field(department, 'Departamento'),
                  const SizedBox(height: 12),
                  _field(jobFunction, 'Funcao profissional'),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: password,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: member == null
                          ? 'Senha inicial'
                          : 'Nova senha (opcional)',
                      border: const OutlineInputBorder(),
                    ),
                    validator: (value) =>
                        member == null && (value == null || value.isEmpty)
                        ? 'Informe a senha inicial.'
                        : null,
                  ),
                ],
              ),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () {
              if (key.currentState!.validate()) Navigator.pop(context, true);
            },
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
    if (accepted != true || !context.mounted) return;
    final data = <String, dynamic>{
      'name': name.text.trim(),
      'email': email.text.trim(),
      'department': department.text.trim(),
      'jobFunction': jobFunction.text.trim(),
      if (password.text.isNotEmpty) 'password': password.text,
    };
    try {
      if (member == null) {
        await ref.read(teamServiceProvider).create(data);
      } else {
        await ref.read(teamServiceProvider).update(member.id, data);
      }
      ref.invalidate(teamProvider);
      if (context.mounted) {
        AppFeedback.showSnackBar(
          context,
          message: 'Equipe atualizada com sucesso.',
          type: AppFeedbackType.success,
        );
      }
    } catch (error) {
      if (context.mounted) {
        AppFeedback.showSnackBar(
          context,
          message: userFriendlyError(error),
          type: AppFeedbackType.error,
        );
      }
    }
  }

  static TextFormField _field(TextEditingController controller, String label) =>
      TextFormField(
        controller: controller,
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
        ),
        validator: (value) =>
            value == null || value.trim().isEmpty ? 'Campo obrigatorio.' : null,
      );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(teamProvider);
    return AppPageScaffold(
      title: 'Equipe',
      subtitle:
          'Cadastre colaboradores e atribua o perfil usado nas pesquisas.',
      actions: [
        FilledButton.icon(
          onPressed: () => _edit(context, ref),
          icon: const Icon(Icons.person_add_outlined),
          label: const Text('Novo colaborador'),
        ),
      ],
      child: state.when(
        loading: () => const AppLoadingState(message: 'Carregando equipe'),
        error: (error, _) => AppErrorState(
          title: 'Nao foi possivel carregar a equipe',
          message: userFriendlyError(error),
          onRetry: () => ref.invalidate(teamProvider),
        ),
        data: (members) => members.isEmpty
            ? const AppEmptyState(
                title: 'Nenhum colaborador cadastrado',
                message:
                    'Cadastre o primeiro colaborador para atribuir seu perfil profissional e liberar pesquisas.',
                icon: Icons.groups_outlined,
              )
            : ListView.separated(
                itemCount: members.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final member = members[index];
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: LayoutBuilder(
                        builder: (context, constraints) {
                          final compact = constraints.maxWidth < 520;
                          final details = Row(
                            children: [
                              const CircleAvatar(
                                child: Icon(Icons.person_outline),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      member.name,
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.w700,
                                          ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${member.jobFunction} | ${member.department}',
                                    ),
                                    Text(
                                      member.email,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      member.status == 'ACTIVE'
                                          ? 'Ativo'
                                          : 'Inativo',
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          );
                          final actions = Wrap(
                            spacing: 8,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              IconButton(
                                tooltip: 'Editar colaborador',
                                onPressed: () => _edit(context, ref, member),
                                icon: const Icon(Icons.edit_outlined),
                              ),
                              Switch(
                                value: member.status == 'ACTIVE',
                                onChanged: (active) async {
                                  try {
                                    await ref
                                        .read(teamServiceProvider)
                                        .setStatus(
                                          member.id,
                                          active ? 'ACTIVE' : 'INACTIVE',
                                        );
                                    ref.invalidate(teamProvider);
                                    if (context.mounted) {
                                      AppFeedback.showSnackBar(
                                        context,
                                        message: active
                                            ? 'Colaborador ativado.'
                                            : 'Colaborador inativado.',
                                        type: AppFeedbackType.success,
                                      );
                                    }
                                  } catch (error) {
                                    if (context.mounted) {
                                      AppFeedback.showSnackBar(
                                        context,
                                        message: userFriendlyError(error),
                                        type: AppFeedbackType.error,
                                      );
                                    }
                                  }
                                },
                              ),
                            ],
                          );
                          if (compact) {
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                details,
                                const SizedBox(height: 8),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: actions,
                                ),
                              ],
                            );
                          }
                          return Row(
                            children: [
                              Expanded(child: details),
                              actions,
                            ],
                          );
                        },
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}
