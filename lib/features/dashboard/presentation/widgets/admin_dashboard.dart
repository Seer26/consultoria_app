import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/section_header.dart';
import 'dashboard_banner.dart';
import 'dashboard_info_panel.dart';
import 'kpi_card.dart';

class AdminDashboard extends StatelessWidget {
  const AdminDashboard({
    super.key,
    required this.data,
  });

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final totals = (data['totals'] as Map<String, dynamic>?) ?? const {};
    final companies = (data['companies'] as List?) ?? const [];
    final alerts = ((data['alerts'] as List?) ?? const []).map((item) => item.toString()).toList();

    return ListView(
      children: [
        DashboardBanner(
          title: 'Visao geral da consultoria.',
          subtitle:
              'Acompanhe carteira de empresas, volume de diagnosticos e alertas operacionais do SaaS.',
          stats: [
            DashboardBannerStat(
              label: 'Empresas',
              value: '${totals['companies'] ?? 0}',
            ),
            DashboardBannerStat(
              label: 'Diagnosticos',
              value: '${totals['diagnoses'] ?? 0}',
            ),
          ],
        ),
        const SizedBox(height: 20),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth >= 1200
                ? 3
                : constraints.maxWidth >= 780
                    ? 2
                    : 1;
            return GridView.count(
              crossAxisCount: columns,
              childAspectRatio: 1.65,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              children: [
                KpiCard(
                  label: 'Empresas ativas',
                  value: '${totals['companies'] ?? 0}',
                  icon: Icons.apartment_outlined,
                  trend: 'Visao global',
                  color: AppColors.primary,
                ),
                KpiCard(
                  label: 'Diagnosticos finalizados',
                  value: '${totals['diagnoses'] ?? 0}',
                  icon: Icons.analytics_outlined,
                  trend: 'Dados reais',
                  color: AppColors.teal,
                ),
                KpiCard(
                  label: 'Alertas criticos',
                  value: '${totals['alerts'] ?? 0}',
                  icon: Icons.warning_amber_outlined,
                  trend: 'Requer atencao',
                  color: AppColors.amber,
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 20),
        const SectionHeader(
          title: 'Carteira de empresas',
          subtitle: 'Panorama real das contas acompanhadas.',
        ),
        ...companies.map(
          (item) {
            final company = item as Map<String, dynamic>;
            return Card(
              child: ListTile(
                contentPadding: const EdgeInsets.all(16),
                leading: const CircleAvatar(child: Icon(Icons.business_outlined)),
                title: Text(
                  '${company['name']} | Score ${company['score']}% | ${company['users']} usuarios',
                ),
                subtitle: Text(
                  '${company['diagnoses']} diagnosticos registrados',
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 20),
        DashboardInfoPanel(
          title: 'Alertas',
          subtitle: 'Sinais operacionais e comerciais da carteira.',
          items: alerts,
          color: AppColors.amber,
        ),
      ],
    );
  }
}
