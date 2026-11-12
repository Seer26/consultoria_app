import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class LikertScale extends StatelessWidget {
  const LikertScale({super.key, required this.value, required this.onChanged});
  final int? value;
  final ValueChanged<int>? onChanged;
  static const _labels = [
    'Discordo totalmente',
    'Discordo',
    'Neutro',
    'Concordo',
    'Concordo totalmente',
  ];

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      for (var i = 0; i < _labels.length; i++)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: ChoiceChip(
            key: Key('likert-${i + 1}'),
            selected: value == i + 1,
            selectedColor: AppColors.primarySoft,
            label: SizedBox(
              width: double.infinity,
              child: Text('${i + 1} · ${_labels[i]}'),
            ),
            onSelected: onChanged == null ? null : (_) => onChanged!(i + 1),
          ),
        ),
    ],
  );
}
