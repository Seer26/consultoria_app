import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/entities/behavioral_admin_assessment.dart';

class BehavioralScoresChart extends StatelessWidget {
  const BehavioralScoresChart({super.key, required this.scores});
  final BehavioralScores scores;
  static const _colors = [
    AppColors.primary,
    AppColors.teal,
    AppColors.amber,
    AppColors.indigo,
  ];
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        'Pontuações por dimensão',
        style: Theme.of(context).textTheme.titleLarge,
      ),
      const SizedBox(height: 16),
      SizedBox(
        height: 240,
        child: Semantics(
          label: 'Gráfico de pontuações de 0 a 100 nas quatro dimensões',
          child: BarChart(
            BarChartData(
              minY: 0,
              maxY: 100,
              alignment: BarChartAlignment.spaceAround,
              barTouchData: BarTouchData(enabled: false),
              borderData: FlBorderData(show: false),
              gridData: const FlGridData(
                show: true,
                drawVerticalLine: false,
                horizontalInterval: 25,
              ),
              titlesData: FlTitlesData(
                topTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                rightTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                bottomTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 32,
                    interval: 25,
                    getTitlesWidget: (value, meta) => Text(
                      value.toInt().toString(),
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                  ),
                ),
              ),
              barGroups: [
                for (var i = 0; i < 4; i++)
                  BarChartGroupData(
                    x: i,
                    barRods: [
                      BarChartRodData(
                        toY: scores.values[i].toDouble(),
                        color: _colors[i],
                        width: 28,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(6),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
      const SizedBox(height: 16),
      Wrap(
        spacing: 16,
        runSpacing: 8,
        children: [
          for (var i = 0; i < 4; i++)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(width: 10, height: 10, color: _colors[i]),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    '${BehavioralScores.labels[i]}: ${scores.values[i]}/100',
                  ),
                ),
              ],
            ),
        ],
      ),
    ],
  );
}
