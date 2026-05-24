import 'package:flutter/material.dart';

enum BusinessArea {
  strategy(
    title: 'Estrategia',
    description: 'Direcionamento do negocio, metas, indicadores e posicionamento.',
    icon: Icons.track_changes_outlined,
    score: 0,
  ),
  people(
    title: 'Pessoas',
    description: 'Lideranca, papeis, desenvolvimento e engajamento do time.',
    icon: Icons.groups_2_outlined,
    score: 0,
  ),
  processes(
    title: 'Processos',
    description: 'Padronizacao, produtividade, rotina operacional e qualidade.',
    icon: Icons.settings_suggest_outlined,
    score: 0,
  ),
  marketing(
    title: 'Marketing',
    description: 'Geracao de demanda, conversao, relacionamento e retencao.',
    icon: Icons.campaign_outlined,
    score: 0,
  ),
  financial(
    title: 'Financeiro',
    description: 'Caixa, margem, controle, planejamento e disciplina financeira.',
    icon: Icons.account_balance_wallet_outlined,
    score: 0,
  );

  const BusinessArea({
    required this.title,
    required this.description,
    required this.icon,
    required this.score,
  });

  final String title;
  final String description;
  final IconData icon;
  final int score;
}
