import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../data/services/team_service.dart';

final teamServiceProvider = Provider<TeamService>((ref) => TeamService(ref.watch(dioProvider)));
final teamProvider = FutureProvider<List<TeamMember>>((ref) => ref.watch(teamServiceProvider).list());

class TeamPage extends ConsumerWidget {
  const TeamPage({super.key});

  Future<void> _edit(BuildContext context, WidgetRef ref, [TeamMember? member]) async {
    final name = TextEditingController(text: member?.name);
    final email = TextEditingController(text: member?.email);
    final department = TextEditingController(text: member?.department);
    final jobFunction = TextEditingController(text: member?.jobFunction);
    final password = TextEditingController();
    final key = GlobalKey<FormState>();
    final accepted = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: Text(member == null ? 'Novo colaborador' : 'Editar colaborador'),
      content: SizedBox(width: 520, child: Form(key: key, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        _field(name, 'Nome'), const SizedBox(height: 12), _field(email, 'E-mail'),
        const SizedBox(height: 12), _field(department, 'Departamento'),
        const SizedBox(height: 12), _field(jobFunction, 'Funcao profissional'),
        const SizedBox(height: 12), TextFormField(controller: password, obscureText: true,
          decoration: InputDecoration(labelText: member == null ? 'Senha inicial' : 'Nova senha (opcional)', border: const OutlineInputBorder()),
          validator: (value) => member == null && (value == null || value.isEmpty) ? 'Informe a senha inicial.' : null),
      ])))),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
        FilledButton(onPressed: () { if (key.currentState!.validate()) Navigator.pop(context, true); }, child: const Text('Salvar'))],
    ));
    if (accepted != true || !context.mounted) return;
    final data = <String, dynamic>{'name': name.text.trim(), 'email': email.text.trim(),
      'department': department.text.trim(), 'jobFunction': jobFunction.text.trim(),
      if (password.text.isNotEmpty) 'password': password.text};
    try {
      if (member == null) { await ref.read(teamServiceProvider).create(data); }
      else { await ref.read(teamServiceProvider).update(member.id, data); }
      ref.invalidate(teamProvider);
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Equipe atualizada.')));
    } catch (error) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString().replaceFirst('Exception: ', ''))));
    }
  }

  static TextFormField _field(TextEditingController controller, String label) => TextFormField(
    controller: controller, decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
    validator: (value) => value == null || value.trim().isEmpty ? 'Campo obrigatorio.' : null);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(teamProvider);
    return AppPageScaffold(title: 'Equipe', subtitle: 'Cadastre colaboradores e atribua o perfil usado nas pesquisas.',
      actions: [FilledButton.icon(onPressed: () => _edit(context, ref), icon: const Icon(Icons.person_add_outlined), label: const Text('Novo colaborador'))],
      child: state.when(loading: () => const AppLoadingState(message: 'Carregando equipe'),
        error: (error, _) => AppErrorState(title: 'Falha ao carregar equipe', message: error.toString(), onRetry: () => ref.invalidate(teamProvider)),
        data: (members) => members.isEmpty ? const AppEmptyState(title: 'Equipe vazia', message: 'Cadastre o primeiro colaborador.', icon: Icons.groups_outlined)
          : ListView.separated(itemCount: members.length, separatorBuilder: (_, _) => const SizedBox(height: 10), itemBuilder: (context, index) {
            final member = members[index];
            return Card(child: ListTile(leading: const CircleAvatar(child: Icon(Icons.person_outline)),
              title: Text(member.name), subtitle: Text('${member.jobFunction} | ${member.department}\n${member.email}'), isThreeLine: true,
              trailing: Wrap(spacing: 8, children: [
                IconButton(onPressed: () => _edit(context, ref, member), icon: const Icon(Icons.edit_outlined)),
                Switch(value: member.status == 'ACTIVE', onChanged: (active) async {
                  await ref.read(teamServiceProvider).setStatus(member.id, active ? 'ACTIVE' : 'INACTIVE');
                  ref.invalidate(teamProvider);
                }),
              ])));
          })));
  }
}
