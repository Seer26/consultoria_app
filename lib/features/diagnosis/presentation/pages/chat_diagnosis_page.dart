import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../data/services/ai_question_service.dart';
import '../../data/services/research_service.dart';
import '../../domain/entities/research_submission.dart';
import '../providers/research_service_provider.dart';

class Message {
  const Message({required this.text, required this.isUser});

  final String text;
  final bool isUser;
}

class ChatDiagnosisPage extends ConsumerStatefulWidget {
  const ChatDiagnosisPage({
    super.key,
    required this.jobRole,
    required this.sector,
    required this.submissionId,
    this.companyId,
    this.allowRespond = true,
  });

  final String jobRole;
  final String sector;
  final String submissionId;
  final String? companyId;
  final bool allowRespond;

  @override
  ConsumerState<ChatDiagnosisPage> createState() => _ChatDiagnosisPageState();
}

class _ChatDiagnosisPageState extends ConsumerState<ChatDiagnosisPage> {
  final AiQuestionService _aiQuestionService = AiQuestionService();
  final TextEditingController inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  late final List<Message> messages;

  bool isLoading = false;
  bool isRestoring = true;
  bool isFinishing = false;
  bool isCompleted = false;
  bool isGeneratingActionPlan = false;
  String? _lastAssistantQuestion;
  String? _lastAssistantPillar;

  @override
  void initState() {
    super.initState();
    messages = _initialMessages();
    WidgetsBinding.instance.addPostFrameCallback((_) => _restoreConversation());
  }

  List<Message> _initialMessages() {
    return [
      Message(
        text:
            'Pesquisa iniciada. Funcao: ${widget.jobRole}. Setor: ${widget.sector}.',
        isUser: false,
      ),
      if (!widget.allowRespond)
        const Message(
          text:
              'Modo de visualizacao: o ADMIN acompanha o fluxo; somente OWNER e EMPLOYEE respondem.',
          isUser: false,
        ),
      const Message(
        text: 'Como voce descreveria o principal desafio atual da empresa?',
        isUser: false,
      ),
    ];
  }

  Future<void> _restoreConversation() async {
    try {
      final details = await ref
          .read(researchServiceProvider)
          .getSubmissionById(widget.submissionId);
      if (!mounted) return;

      final restoredMessages = <Message>[
        Message(
          text:
              'Pesquisa iniciada. Funcao: ${widget.jobRole}. Setor: ${widget.sector}.',
          isUser: false,
        ),
        if (!widget.allowRespond)
          const Message(
            text:
                'Modo de visualizacao: o ADMIN acompanha o fluxo; somente OWNER e EMPLOYEE respondem.',
            isUser: false,
          ),
      ];

      for (final answer in details.answers) {
        restoredMessages
          ..add(Message(text: answer.question, isUser: false))
          ..add(Message(text: answer.answer, isUser: true));
      }

      if (details.status == ResearchSubmissionStatus.completed) {
        restoredMessages.add(
          const Message(
            text: 'Esta pesquisa já foi finalizada.',
            isUser: false,
          ),
        );
        setState(() {
          messages
            ..clear()
            ..addAll(restoredMessages);
          isCompleted = true;
          isRestoring = false;
          _lastAssistantQuestion = null;
        });
        return;
      }

      final nextQuestion = details.answers.isEmpty
          ? 'Como voce descreveria o principal desafio atual da empresa?'
          : 'Considerando as respostas anteriores, qual outro ponto importante deve ser registrado nesta pesquisa?';
      restoredMessages.add(Message(text: nextQuestion, isUser: false));
      setState(() {
        messages
          ..clear()
          ..addAll(restoredMessages);
        isRestoring = false;
        _lastAssistantQuestion = nextQuestion;
        _lastAssistantPillar = details.answers.isEmpty
            ? widget.sector
            : details.answers.last.pillar;
      });
      _scrollToBottom();
    } catch (_) {
      if (!mounted) return;
      setState(() => isRestoring = false);
      _showMessage(
        'Não foi possível recuperar as respostas anteriores. Atualize a página antes de continuar.',
        isError: true,
      );
    }
  }

  @override
  void dispose() {
    inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    if (!widget.allowRespond || isCompleted) {
      return;
    }

    final answer = inputController.text.trim();

    if (answer.isEmpty || isLoading || isRestoring || isFinishing) {
      return;
    }

    final question = _lastAssistantQuestion;
    if (question == null || question.trim().isEmpty) {
      _showMessage(
        'Pergunta atual invalida. Reinicie a pesquisa.',
        isError: true,
      );
      return;
    }

    setState(() {
      messages.add(Message(text: answer, isUser: true));
      inputController.clear();
      isLoading = true;
    });
    _scrollToBottom();

    try {
      await ref
          .read(researchServiceProvider)
          .saveAnswer(
            submissionId: widget.submissionId,
            question: question,
            answer: answer,
            pillar: _lastAssistantPillar ?? widget.sector,
          );

      try {
        final nextQuestion = await _aiQuestionService.getNextQuestion(
          widget.submissionId,
        );

        if (!mounted) {
          return;
        }

        setState(() {
          messages.add(Message(text: nextQuestion.question, isUser: false));
          _lastAssistantQuestion = nextQuestion.question;
          _lastAssistantPillar = nextQuestion.pillar;
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        final message = error.toString().replaceFirst('Exception: ', '');
        setState(() {
          messages.add(Message(text: message, isUser: false));
        });
        _showMessage(message, isError: true);
      }
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        messages.add(
          Message(
            text:
                'Nao foi possivel salvar a resposta. Tente novamente antes de finalizar.',
            isUser: false,
          ),
        );
      });

      _showMessage(
        error.toString().replaceFirst('Exception: ', ''),
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
        _scrollToBottom();
      }
    }
  }

  Future<void> _completeResearch() async {
    if (!widget.allowRespond ||
        isLoading ||
        isRestoring ||
        isFinishing ||
        isCompleted) {
      return;
    }

    setState(() => isFinishing = true);

    try {
      final calculatedResult = await ref
          .read(researchServiceProvider)
          .completeSubmission(widget.submissionId);

      AiConsultingAnalysis? aiAnalysis;
      String? aiError;
      try {
        aiAnalysis = await ref
            .read(researchServiceProvider)
            .generateAiAnalysis(widget.submissionId);
      } catch (_) {
        aiError =
            'Nao foi possivel gerar a analise inteligente agora. Os resultados calculados continuam disponiveis.';
      }

      if (!mounted) {
        return;
      }

      setState(() {
        isCompleted = true;
        messages.add(
          Message(
            text:
                'Pesquisa finalizada com sucesso. ${calculatedResult.answersCount} respostas registradas e resultado calculado gerado.',
            isUser: false,
          ),
        );
      });

      _showMessage('Pesquisa finalizada com sucesso.');
      _scrollToBottom();

      await _showResultSheet(
        calculatedResult,
        aiAnalysis: aiAnalysis,
        aiError: aiError,
      );
      if (mounted) context.pop(true);
    } catch (error) {
      if (!mounted) {
        return;
      }

      _showMessage(
        error.toString().replaceFirst('Exception: ', ''),
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() => isFinishing = false);
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) {
        return;
      }

      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent + 120,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  void _showMessage(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: isError ? AppColors.danger : AppColors.success,
        content: Text(message),
      ),
    );
  }

  Future<void> _showResultSheet(
    ResearchCompletionResult result, {
    AiConsultingAnalysis? aiAnalysis,
    String? aiError,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        final submission = result.submission;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Resultado calculado',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Setor ${submission.department} | Funcao ${submission.respondentRole}',
                    style: const TextStyle(color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      _ResultChip(
                        label: 'Score geral',
                        value: submission.overallScore == null
                            ? 'Pendente'
                            : submission.overallScore!.toStringAsFixed(1),
                      ),
                      _ResultChip(
                        label: 'Respostas',
                        value: '${result.answersCount}',
                      ),
                      _ResultChip(
                        label: 'Concluida em',
                        value: submission.completedAt == null
                            ? '-'
                            : DateFormatter.formatDateTime(
                                submission.completedAt!,
                              ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  _ResultSection(
                    title: 'Resumo',
                    items: [
                      submission.summary?.trim().isNotEmpty == true
                          ? submission.summary!
                          : 'O resultado inicial ainda nao foi gerado por completo.',
                    ],
                  ),
                  _ResultSection(
                    title: 'Pontos Criticos',
                    items: submission.criticalPoints.isEmpty
                        ? const ['Nenhum ponto critico destacado nesta etapa.']
                        : submission.criticalPoints,
                  ),
                  _ResultSection(
                    title: 'Oportunidades',
                    items: submission.opportunities.isEmpty
                        ? const ['Nenhuma oportunidade destacada nesta etapa.']
                        : submission.opportunities,
                  ),
                  _ResultSection(
                    title: 'Recomendacoes',
                    items: submission.recommendations.isEmpty
                        ? const ['Nenhuma recomendacao inicial disponivel.']
                        : submission.recommendations,
                  ),
                  _ResultSection(
                    title: 'Proximos Passos',
                    items: submission.nextSteps.isEmpty
                        ? const ['Nenhum proximo passo sugerido ate o momento.']
                        : submission.nextSteps,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Analise da IA',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (aiAnalysis != null) ...[
                    Text(aiAnalysis.executiveSummary),
                    _ResultSection(
                      title: 'Pontos fortes',
                      items: aiAnalysis.strengths,
                    ),
                    _ResultSection(
                      title: 'Pontos de atencao',
                      items: aiAnalysis.attentionPoints,
                    ),
                    _ResultSection(
                      title: 'Recomendacoes consultivas',
                      items: aiAnalysis.recommendations
                          .map(
                            (item) =>
                                '${item.title} (${item.pillar}) - ${item.description}',
                          )
                          .toList(),
                    ),
                  ] else
                    Text(
                      aiError ?? 'Analise inteligente ainda nao gerada.',
                      style: const TextStyle(color: AppColors.textSecondary),
                    ),
                  if (submission.pillarScores.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Scores por Pilar',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 10),
                    for (final pillar in submission.pillarScores)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceMuted,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  pillar.pillar,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              Text(
                                '${pillar.score.toStringAsFixed(1)} | ${pillar.maturity}',
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                  const SizedBox(height: 12),
                  StatefulBuilder(
                    builder: (context, setSheetState) {
                      Future<void> handleGenerateActionPlan() async {
                        final sheetNavigator = Navigator.of(context);
                        setSheetState(() => isGeneratingActionPlan = true);
                        try {
                          final generated = await ref
                              .read(researchServiceProvider)
                              .generateActionPlan(submission.id);

                          if (!mounted) {
                            return;
                          }

                          _showMessage(
                            generated.alreadyGenerated
                                ? 'O plano desta pesquisa ja havia sido gerado. ${generated.tasks.length} tarefas carregadas.'
                                : 'Plano de acao gerado com sucesso. ${generated.createdCount} tarefas criadas.',
                          );

                          if (sheetNavigator.mounted) {
                            sheetNavigator.pop();
                          }

                          if (mounted) {
                            this.context.go('/tasks');
                          }
                        } catch (error) {
                          if (!mounted) {
                            return;
                          }
                          _showMessage(
                            error.toString().replaceFirst('Exception: ', ''),
                            isError: true,
                          );
                        } finally {
                          if (context.mounted) {
                            setSheetState(() => isGeneratingActionPlan = false);
                          }
                        }
                      }

                      return Wrap(
                        alignment: WrapAlignment.end,
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          OutlinedButton.icon(
                            onPressed: isGeneratingActionPlan
                                ? null
                                : handleGenerateActionPlan,
                            icon: isGeneratingActionPlan
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(
                                    Icons.playlist_add_check_circle_outlined,
                                  ),
                            label: Text(
                              isGeneratingActionPlan
                                  ? 'Gerando plano...'
                                  : 'Gerar plano de acao',
                            ),
                          ),
                          FilledButton(
                            onPressed: () => Navigator.of(context).pop(),
                            child: const Text('Fechar'),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return AppPageScaffold(
      title: 'Pesquisa Empresarial',
      subtitle: widget.allowRespond
          ? 'Responda em formato de conversa. Cada resposta e salva no backend.'
          : 'Visualização do fluxo; envio de respostas restrito aos perfis OWNER e EMPLOYEE.',
      actions: widget.allowRespond
          ? [
              FilledButton.icon(
                onPressed:
                    isLoading || isRestoring || isFinishing || isCompleted
                    ? null
                    : _completeResearch,
                icon: isFinishing
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.check_circle_outline),
                label: Text(isFinishing ? 'Finalizando...' : 'Finalizar'),
              ),
            ]
          : const [],
      child: Column(
        children: [
          Expanded(
            child: Card(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(20),
                itemCount: messages.length + (isLoading || isRestoring ? 1 : 0),
                itemBuilder: (context, index) {
                  if ((isLoading || isRestoring) && index == messages.length) {
                    return const _TypingBubble();
                  }

                  final message = messages[index];
                  return _MessageBubble(message: message);
                },
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (widget.allowRespond)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: inputController,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                      decoration: const InputDecoration(
                        hintText: 'Digite sua resposta...',
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  FilledButton.icon(
                    onPressed:
                        isLoading || isRestoring || isFinishing || isCompleted
                        ? null
                        : _sendMessage,
                    icon: const Icon(Icons.send),
                    label: const Text('Enviar'),
                  ),
                ],
              ),
            )
          else
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.visibility_outlined, color: AppColors.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Somente colaboradores (EMPLOYEE) enviam respostas nesta pesquisa.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
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

class _ResultSection extends StatelessWidget {
  const _ResultSection({required this.title, required this.items});

  final String title;
  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('• '),
                  Expanded(child: Text(item)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ResultChip extends StatelessWidget {
  const _ResultChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          Text(label, style: const TextStyle(color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});

  final Message message;

  @override
  Widget build(BuildContext context) {
    final alignment = message.isUser
        ? Alignment.centerRight
        : Alignment.centerLeft;
    final backgroundColor = message.isUser
        ? AppColors.primary
        : AppColors.primarySoft;
    final textColor = message.isUser ? Colors.white : AppColors.textPrimary;

    return Align(
      alignment: alignment,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 680),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          message.text,
          style: TextStyle(
            color: textColor,
            fontWeight: FontWeight.w500,
            height: 1.4,
          ),
        ),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.primarySoft,
          borderRadius: BorderRadius.circular(20),
        ),
        child: const SizedBox(
          width: 22,
          height: 22,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      ),
    );
  }
}
