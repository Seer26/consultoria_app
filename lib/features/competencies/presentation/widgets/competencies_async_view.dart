import 'package:flutter/material.dart';
import '../../../../core/errors/api_error_presenter.dart';
import '../../../../core/widgets/app_state_widgets.dart';

List<Widget> competenciesBackActions(BuildContext context) => [
  if (Navigator.of(context).canPop())
    TextButton.icon(
      onPressed: () => Navigator.of(context).maybePop(),
      icon: const Icon(Icons.arrow_back),
      label: const Text('Voltar'),
    ),
];

class CompetenciesAsyncView<T> extends StatelessWidget {
  const CompetenciesAsyncView({
    super.key,
    required this.future,
    required this.onRetry,
    required this.builder,
  });
  final Future<T> future;
  final VoidCallback onRetry;
  final Widget Function(T) builder;
  @override
  Widget build(BuildContext context) => FutureBuilder<T>(
    future: future,
    builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) {
        return const AppLoadingState(message: 'Carregando competências...');
      }
      if (snapshot.hasError) {
        return SingleChildScrollView(
          child: AppErrorState(
            title: 'Não foi possível carregar as competências',
            message: userFriendlyError(snapshot.error!),
            onRetry: onRetry,
          ),
        );
      }
      return builder(snapshot.data as T);
    },
  );
}
