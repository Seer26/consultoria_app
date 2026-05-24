import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';

class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFF7F9FC), Color(0xFFEAF0FF)],
          ),
        ),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final isWide = constraints.maxWidth >= 980;
              return Align(
                alignment: Alignment.topCenter,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 1320),
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Container(
                              height: 48,
                              width: 48,
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(18),
                              ),
                              child: const Icon(Icons.insights, color: Colors.white),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              'Consultoria Digital',
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const Spacer(),
                            TextButton(
                              onPressed: () => context.go('/login'),
                              child: const Text('Entrar'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 32),
                        Expanded(
                          child: isWide
                              ? Row(
                                  children: [
                                    Expanded(child: _HeroContent(theme: theme)),
                                    const SizedBox(width: 24),
                                    const Expanded(child: _HighlightsPanel()),
                                  ],
                                )
                              : ListView(
                                  children: const [
                                    _HeroContent(),
                                    SizedBox(height: 20),
                                    _HighlightsPanel(),
                                  ],
                                ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _HeroContent extends StatelessWidget {
  const _HeroContent({this.theme});

  final ThemeData? theme;

  @override
  Widget build(BuildContext context) {
    final appliedTheme = theme ?? Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: AppColors.primarySoft,
            borderRadius: BorderRadius.circular(999),
          ),
          child: const Text('Plataforma mobile-first para consultoria operacional'),
        ),
        const SizedBox(height: 20),
        Text(
          'Empresas, formularios, diagnosticos e planos em um unico workspace.',
          style: appliedTheme.textTheme.displaySmall?.copyWith(
            fontWeight: FontWeight.w900,
            height: 1.1,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Centralize a carteira, acompanhe indicadores, registre formulários e conduza os próximos passos da consultoria com mais clareza.',
          style: appliedTheme.textTheme.titleMedium?.copyWith(
            color: AppColors.textSecondary,
            height: 1.45,
          ),
        ),
        const SizedBox(height: 24),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            FilledButton.icon(
              onPressed: () => context.go('/login'),
              icon: const Icon(Icons.login),
              label: const Text('Começar agora'),
            ),
            OutlinedButton.icon(
              onPressed: () => context.go('/login'),
              icon: const Icon(Icons.arrow_forward),
              label: const Text('Entrar'),
            ),
          ],
        ),
        const SizedBox(height: 28),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: const [
            _StatBadge(label: 'Empresas acompanhadas', value: '48'),
            _StatBadge(label: 'Planos ativos', value: '126'),
            _StatBadge(label: 'Formularios enviados', value: '312'),
          ],
        ),
      ],
    );
  }
}

class _HighlightsPanel extends StatelessWidget {
  const _HighlightsPanel();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: const [
        _HighlightCard(
          icon: Icons.space_dashboard_outlined,
          title: 'Dashboard executivo',
          description: 'KPIs, alertas, resumo do dia e próximos passos em uma visão de leitura rápida.',
        ),
        SizedBox(height: 16),
        _HighlightCard(
          icon: Icons.people_alt_outlined,
          title: 'Gestao de empresas',
          description: 'Carteira com busca, filtros, progresso por conta, status e histórico operacional.',
        ),
        SizedBox(height: 16),
        _HighlightCard(
          icon: Icons.analytics_outlined,
          title: 'Diagnóstico ao plano',
          description: 'Coleta guiada, geração de insumos para ação e base pronta para backend real.',
        ),
      ],
    );
  }
}

class _HighlightCard extends StatelessWidget {
  const _HighlightCard({
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 48,
              width: 48,
              decoration: BoxDecoration(
                color: AppColors.primarySoft,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: AppColors.primary),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(description),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatBadge extends StatelessWidget {
  const _StatBadge({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}
