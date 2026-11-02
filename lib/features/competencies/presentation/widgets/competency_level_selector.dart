import 'package:flutter/material.dart';
import '../../domain/entities/competency_assessment.dart';

class CompetencyLevelSelector extends StatelessWidget {
  const CompetencyLevelSelector({
    super.key,
    required this.competencyId,
    required this.level,
    required this.onChanged,
  });
  final String competencyId;
  final int? level;
  final ValueChanged<int?>? onChanged;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      FilterChip(
        key: Key('level-$competencyId-0'),
        label: const Text('0 — Não observado / evidência insuficiente'),
        selected: level == null,
        onSelected: onChanged == null ? null : (_) => onChanged!(null),
      ),
      const SizedBox(height: 8),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final entry in competencyLevelLabels.entries)
            ChoiceChip(
              key: Key('level-$competencyId-${entry.key}'),
              label: Text('${entry.key} — ${entry.value}'),
              selected: level == entry.key,
              onSelected: onChanged == null
                  ? null
                  : (_) => onChanged!(entry.key),
            ),
        ],
      ),
    ],
  );
}
