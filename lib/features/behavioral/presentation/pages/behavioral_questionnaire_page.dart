import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/errors/api_error_presenter.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../domain/entities/behavioral_assessment.dart';
import '../providers/behavioral_providers.dart';
import '../widgets/likert_scale.dart';

class BehavioralQuestionnairePage extends ConsumerStatefulWidget {
  const BehavioralQuestionnairePage({super.key});
  @override
  ConsumerState<BehavioralQuestionnairePage> createState() =>
      _BehavioralQuestionnairePageState();
}

class _BehavioralQuestionnairePageState
    extends ConsumerState<BehavioralQuestionnairePage> {
  BehavioralQuestionnaire? _questionnaire;
  final _answers = <String, int>{};
  final _savedAnswers = <String, int>{};
  int _index = 0;
  bool _busy = false;
  bool _confirming = false;
  bool _completed = false;
  String? _error;

  Future<void> _start() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final service = ref.read(behavioralServiceProvider);
      final assessment = await service.startOrResume();
      if (!mounted) return;
      if (assessment.isCompleted) {
        setState(() => _completed = true);
        return;
      }
      final questionnaire = await service.questions(assessment.id);
      if (questionnaire.questions.isEmpty) {
        throw Exception(
          'O questionário ainda não está disponível. Tente novamente mais tarde.',
        );
      }
      if (!mounted) return;
      setState(() {
        _questionnaire = questionnaire;
        _answers
          ..clear()
          ..addAll(questionnaire.answers);
        _savedAnswers
          ..clear()
          ..addAll(questionnaire.answers);
        final firstPending = questionnaire.questions.indexWhere(
          (q) => !_answers.containsKey(q.id),
        );
        _index = firstPending < 0
            ? questionnaire.questions.length - 1
            : firstPending;
      });
    } catch (error) {
      if (mounted) setState(() => _error = userFriendlyError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _move({required bool forward}) async {
    if (_busy) return;
    final questionnaire = _questionnaire!;
    final question = questionnaire.questions[_index];
    final value = _answers[question.id];
    if (forward && value == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final service = ref.read(behavioralServiceProvider);
      if (value != null && _savedAnswers[question.id] != value) {
        await service.saveAnswer(
          questionnaire.assessment.id,
          question.id,
          value,
        );
        if (!mounted) return;
        _savedAnswers[question.id] = value;
      }
      if (!mounted) return;
      if (forward && _index == questionnaire.questions.length - 1) {
        if (questionnaire.questions.any(
          (q) => !_savedAnswers.containsKey(q.id),
        )) {
          throw Exception('Responda todas as afirmações antes de concluir.');
        }
        setState(() => _confirming = true);
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Concluir avaliação?'),
            content: const Text(
              'Após concluir, suas respostas não poderão ser alteradas.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Continuar respondendo'),
              ),
              FilledButton(
                key: const Key('behavioral-confirm-complete'),
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Concluir avaliação'),
              ),
            ],
          ),
        );
        if (!mounted) return;
        setState(() => _confirming = false);
        if (confirmed != true) return;
        await service.complete(questionnaire.assessment.id);
        if (mounted) setState(() => _completed = true);
      } else {
        setState(() => _index += forward ? 1 : -1);
      }
    } catch (error) {
      if (mounted) setState(() => _error = userFriendlyError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => AppPageScaffold(
    title: 'Perfil comportamental',
    subtitle:
        'Responda às afirmações de acordo com sua experiência no trabalho.',
    child: Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 760),
        child: _completed
            ? const SingleChildScrollView(
                child: AppEmptyState(
                  title: 'Avaliação concluída com sucesso.',
                  icon: Icons.check_circle_outline,
                ),
              )
            : _questionnaire == null
            ? _entry()
            : _question(),
      ),
    ),
  );

  Widget _entry() {
    if (_busy) return const AppLoadingState(message: 'Carregando avaliação...');
    return ListView(
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.psychology_outlined,
                  size: 36,
                  color: AppColors.primary,
                ),
                const SizedBox(height: 16),
                Text(
                  'Sua avaliação comportamental',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Escolha uma opção de 1 a 5 para cada afirmação. Suas respostas são salvas ao avançar ou voltar. Se houver uma avaliação em andamento, você continuará de onde parou.',
                ),
                const SizedBox(height: 12),
                const Text('A análise é de acesso exclusivo da consultoria.'),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  _errorMessage(),
                ],
                const SizedBox(height: 24),
                FilledButton.icon(
                  key: const Key('behavioral-start'),
                  onPressed: _start,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Iniciar ou retomar avaliação'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _errorMessage() => Semantics(
    liveRegion: true,
    child: Text(_error!, style: const TextStyle(color: AppColors.danger)),
  );

  Widget _question() {
    final questions = _questionnaire!.questions;
    final question = questions[_index];
    final value = _answers[question.id];
    final isLast = _index == questions.length - 1;
    return ListView(
      key: ValueKey(question.id),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Semantics(
                  label: 'Pergunta ${_index + 1} de ${questions.length}',
                  child: Text(
                    '${_index + 1}/${questions.length}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                const SizedBox(height: 8),
                LinearProgressIndicator(
                  value: (_index + 1) / questions.length,
                  color: AppColors.primary,
                  backgroundColor: AppColors.primarySoft,
                ),
                const SizedBox(height: 24),
                Text(
                  question.text,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 24),
                LikertScale(
                  value: value,
                  onChanged: _busy
                      ? null
                      : (value) => setState(() {
                          _answers[question.id] = value;
                          _error = null;
                        }),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  _errorMessage(),
                ],
                if (_busy && !_confirming) ...[
                  const SizedBox(height: 12),
                  const LinearProgressIndicator(),
                ],
                const SizedBox(height: 24),
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    OutlinedButton.icon(
                      key: const Key('behavioral-back'),
                      onPressed: _busy || _index == 0
                          ? null
                          : () => _move(forward: false),
                      icon: const Icon(Icons.arrow_back),
                      label: const Text('Voltar'),
                    ),
                    FilledButton.icon(
                      key: const Key('behavioral-next'),
                      onPressed: _busy || value == null
                          ? null
                          : () => _move(forward: true),
                      icon: Icon(isLast ? Icons.check : Icons.arrow_forward),
                      label: Text(isLast ? 'Concluir avaliação' : 'Avançar'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
