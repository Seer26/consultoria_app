import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../diagnosis/presentation/state/diagnosis_workspace_state.dart';

class AreaScoreCard extends StatelessWidget {
  const AreaScoreCard({
    super.key,
    required this.snapshot,
    required this.onTap,
  });

  final AreaScoreSnapshot snapshot;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final area = snapshot.area;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                backgroundColor: AppColors.primarySoft,
                foregroundColor: AppColors.primary,
                child: Icon(area.icon),
              ),
              const Spacer(),
              Text(
                area.title,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                '${snapshot.percentage}%',
                style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  value: snapshot.percentage / 100,
                  minHeight: 8,
                  backgroundColor: AppColors.primarySoft,
                  valueColor: const AlwaysStoppedAnimation(AppColors.primary),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                '${snapshot.answeredQuestions}/${snapshot.totalQuestions} respondidas | Media ${snapshot.averageScore.toStringAsFixed(1)}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
