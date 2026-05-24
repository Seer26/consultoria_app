import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/report.dart';

final reportsControllerProvider =
    StateNotifierProvider<ReportsController, List<Report>>((ref) {
  return ReportsController();
});

class ReportsController extends StateNotifier<List<Report>> {
  ReportsController() : super(_seed);

  static final List<Report> _seed = [
    Report(
      id: 'r1',
      title: 'Relatorio executivo mensal',
      client: 'Alfa Tech',
      sentAt: DateTime.now().subtract(const Duration(days: 1)),
      summary: 'Evolucao comercial consistente, com risco moderado em handoff operacional.',
      type: 'Executivo',
      period: 'Mar/2026',
      status: 'Enviado',
      highlights: const ['Crescimento de leads qualificados', 'Revisao de handoff', 'Plano comercial ativo'],
      consultant: 'Mariana Souza',
      executiveSummary:
          'A Alfa Tech apresentou avancos relevantes no processo comercial e maior aderencia aos rituais de acompanhamento. O ponto de atencao segue concentrado no repasse entre comercial e operacao, que ainda gera atrasos em parte das entregas.',
      overallScore: 78,
      riskLevel: 'Medio',
      planProgress: 0.68,
      engagement: 81,
      areas: const [
        ReportAreaScore(name: 'Comercial', progress: 0.82),
        ReportAreaScore(name: 'Operacoes', progress: 0.61),
        ReportAreaScore(name: 'Gestao', progress: 0.76),
      ],
      criticalIssues: const [
        'Repasse entre comercial e operacao sem checklist final.',
        'Baixa previsibilidade de capacidade para novos projetos.',
      ],
      recommendations: const [
        'Padronizar handoff com checklist e dono definido.',
        'Reforcar rotina semanal de acompanhamento de carteira.',
        'Fechar capacidade operacional por sprint.',
      ],
      actionItems: const [
        ReportTask(title: 'Implantar checklist de handoff', status: 'Em andamento', priority: 'Alta'),
        ReportTask(title: 'Revisar capacidade da equipe', status: 'Pendente', priority: 'Media'),
      ],
    ),
    Report(
      id: 'r2',
      title: 'Diagnostico de operacoes',
      client: 'Clara Financas',
      sentAt: DateTime.now().subtract(const Duration(days: 3)),
      summary: 'Maturidade operacional alta, com pontos pontuais de governanca e priorizacao.',
      type: 'Diagnostico',
      period: 'Fev/2026',
      status: 'Enviado',
      highlights: const ['Rituais estaveis', 'Boa adesao da lideranca', 'Gaps em priorizacao'],
      consultant: 'Paula Costa',
      executiveSummary:
          'A Clara Financas opera com boa disciplina de gestao e forte participacao da lideranca. O principal ganho potencial esta em melhorar a priorizacao entre frentes concorrentes e reduzir o volume de excecoes no fluxo operacional.',
      overallScore: 86,
      riskLevel: 'Baixo',
      planProgress: 0.74,
      engagement: 88,
      areas: const [
        ReportAreaScore(name: 'Processos', progress: 0.84),
        ReportAreaScore(name: 'Governanca', progress: 0.79),
        ReportAreaScore(name: 'Pessoas', progress: 0.91),
      ],
      criticalIssues: const [
        'Conflito entre prioridades de projetos paralelos.',
        'Excecoes operacionais ainda sem consolidacao semanal.',
      ],
      recommendations: const [
        'Criar rito quinzenal de priorizacao executiva.',
        'Consolidar excecoes em um painel unico.',
      ],
      actionItems: const [
        ReportTask(title: 'Rodar comite quinzenal', status: 'Concluido', priority: 'Alta'),
        ReportTask(title: 'Consolidar painel de excecoes', status: 'Em andamento', priority: 'Media'),
      ],
    ),
    Report(
      id: 'r3',
      title: 'Relatorio de onboarding',
      client: 'Delta Health',
      sentAt: DateTime.now().subtract(const Duration(days: 7)),
      summary: 'Onboarding concluido com pendencias contratuais e baixa adesao operacional.',
      type: 'Onboarding',
      period: 'Jan/2026',
      status: 'Rascunho',
      highlights: const ['Treinamentos entregues', 'Pendencia contratual', 'Adesao parcial'],
      consultant: 'Rafael Nunes',
      executiveSummary:
          'O processo de onboarding foi concluido com cobertura dos treinamentos principais, mas ainda depende de ajustes contratuais e de maior adesao do time interno para iniciar o ciclo completo de melhoria.',
      overallScore: 59,
      riskLevel: 'Alto',
      planProgress: 0.32,
      engagement: 54,
      areas: const [
        ReportAreaScore(name: 'Onboarding', progress: 0.73),
        ReportAreaScore(name: 'Operacao', progress: 0.38),
        ReportAreaScore(name: 'Financeiro', progress: 0.29),
      ],
      criticalIssues: const [
        'Baixa participacao da equipe nos rituais combinados.',
        'Pendencia contratual bloqueando uma fase do projeto.',
      ],
      recommendations: const [
        'Fechar pendencia contratual com diretoria.',
        'Retomar alinhamento com lideres da operacao.',
      ],
      actionItems: const [
        ReportTask(title: 'Regularizar contrato', status: 'Pendente', priority: 'Alta'),
        ReportTask(title: 'Refazer kickoff com lideranca', status: 'Pendente', priority: 'Alta'),
      ],
    ),
  ];

  void create({
    required String client,
    required String type,
  }) {
    final period = '${DateTime.now().month.toString().padLeft(2, '0')}/${DateTime.now().year}';
    final report = Report(
      id: 'r-${DateTime.now().microsecondsSinceEpoch}',
      title: _titleForType(type),
      client: client,
      sentAt: DateTime.now(),
      summary: 'Relatorio gerado para demonstracao com base no contexto atual da empresa.',
      type: type,
      period: period,
      status: 'Rascunho',
      highlights: const ['Resumo automatico gerado', 'Indicadores preenchidos', 'Plano vinculado'],
      consultant: 'Consultor Lider',
      executiveSummary:
          'Este relatorio foi gerado automaticamente para demonstracao e resume o momento atual da empresa, destacando riscos, avancos e oportunidades praticas para o proximo ciclo de consultoria.',
      overallScore: 72,
      riskLevel: 'Medio',
      planProgress: 0.57,
      engagement: 77,
      areas: const [
        ReportAreaScore(name: 'Gestao', progress: 0.74),
        ReportAreaScore(name: 'Operacoes', progress: 0.58),
        ReportAreaScore(name: 'Comercial', progress: 0.63),
      ],
      criticalIssues: const [
        'Ritmo de execucao ainda irregular em parte das frentes.',
        'Dependencia excessiva da lideranca em decisoes operacionais.',
      ],
      recommendations: const [
        'Definir ritos mais curtos de acompanhamento.',
        'Distribuir ownership das principais entregas.',
        'Conectar diagnostico aos planos ativos.',
      ],
      actionItems: const [
        ReportTask(title: 'Atualizar dashboard executivo', status: 'Pendente', priority: 'Media'),
        ReportTask(title: 'Priorizar iniciativas do trimestre', status: 'Em andamento', priority: 'Alta'),
      ],
    );
    state = [report, ...state];
  }

  static String _titleForType(String type) {
    switch (type) {
      case 'Diagnostico':
        return 'Diagnostico consolidado';
      case 'Onboarding':
        return 'Relatorio de onboarding';
      case 'Executivo':
      default:
        return 'Relatorio executivo';
    }
  }
}

final reportsProvider = Provider<List<Report>>((ref) {
  return ref.watch(reportsControllerProvider);
});

final reportByIdProvider = Provider.family<Report?, String>((ref, id) {
  final reports = ref.watch(reportsControllerProvider);
  for (final report in reports) {
    if (report.id == id) {
      return report;
    }
  }
  return null;
});
