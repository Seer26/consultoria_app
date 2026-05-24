import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_page_scaffold.dart';

class EmployeeHomePage extends StatefulWidget {
  const EmployeeHomePage({super.key});

  @override
  State<EmployeeHomePage> createState() => _EmployeeHomePageState();
}

class _EmployeeHomePageState extends State<EmployeeHomePage> {
  @override
  Widget build(BuildContext context) {
    return AppPageScaffold(
      title: 'Inicio',
      subtitle: 'Acesso rapido para iniciar a pesquisa e acompanhar suas entregas.',
      child: ListView(
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  const CircleAvatar(
                    radius: 26,
                    backgroundColor: AppColors.primarySoft,
                    foregroundColor: AppColors.primary,
                    child: Icon(Icons.playlist_add_check_outlined),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Iniciar Pesquisa',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Responda perguntas guiadas pela IA para apoiar o diagnostico do negocio.',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  FilledButton.icon(
                    onPressed: () => context.go('/research'),
                    icon: const Icon(Icons.arrow_forward_rounded),
                    label: const Text('Iniciar'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

