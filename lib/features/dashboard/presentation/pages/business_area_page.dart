import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../diagnosis/domain/entities/business_area.dart';
import '../../../diagnosis/presentation/providers/diagnosis_workspace_providers.dart';

class BusinessAreaPage extends ConsumerWidget {
  const BusinessAreaPage({
    super.key,
    required this.area,
  });

  final BusinessArea area;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final score = ref.watch(diagnosisAreaScoreProvider(area));
    final questions = ref.watch(diagnosisQuestionsByAreaProvider(area));

    return AppPageScaffold(
      title: area.title,
      subtitle: '${area.description} Modulo base pronto para evolucao futura.',
      actions: [
        OutlinedButton.icon(
          onPressed: () => context.go('/diagnosis'),
          icon: const Icon(Icons.analytics_outlined),
          label: const Text('Ver diagnostico'),
        ),
      ],
      child: ListView(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.border),
            ),
            child: Wrap(
              alignment: WrapAlignment.spaceBetween,
              runSpacing: 16,
              spacing: 20,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: AppColors.primarySoft,
                      foregroundColor: AppColors.primary,
                      child: Icon(area.icon, size: 28),
                    ),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Score atual ${score?.percentage ?? 0}%',
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${score?.answeredQuestions ?? 0}/${score?.totalQuestions ?? questions.length} respostas registradas',
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primaryDark,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Text(
                    'Conteudo especifico sera expandido nas proximas etapas.',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const SectionHeader(
            title: 'Focos iniciais',
            subtitle:
                'Placeholder do modulo com espaco para indicadores, planos e acoes da area.',
          ),
          ...questions.take(5).map(
                (question) => Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    leading: const CircleAvatar(child: Icon(Icons.checklist)),
                    title: Text(question.title),
                    subtitle: Text(question.helper),
                  ),
                ),
              ),
        ],
      ),
    );
  }
}
