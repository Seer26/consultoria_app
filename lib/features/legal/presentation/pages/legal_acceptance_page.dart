import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/legal_document.dart';
import '../providers/legal_acceptance_providers.dart';
import '../state/legal_acceptance_state.dart';

class LegalAcceptancePage extends ConsumerWidget {
  const LegalAcceptancePage({super.key, this.onLogout});

  final Future<void> Function()? onLogout;

  Future<void> _logout(WidgetRef ref) async {
    if (onLogout != null) {
      await onLogout!();
      return;
    }
    await ref.read(authControllerProvider.notifier).logout();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(legalAcceptanceControllerProvider);

    return PopScope(
      canPop: false,
      child: Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          title: const Text('Documentos obrigatorios'),
          actions: [
            TextButton.icon(
              key: const Key('legal-logout-button'),
              onPressed: () => _logout(ref),
              icon: const Icon(Icons.logout_outlined),
              label: const Text('Sair'),
            ),
          ],
        ),
        body: SafeArea(child: _body(context, ref, state)),
      ),
    );
  }

  Widget _body(
    BuildContext context,
    WidgetRef ref,
    LegalAcceptanceState state,
  ) {
    if (state.isChecking) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.pendingDocuments.isEmpty) {
      if (state.status == LegalAcceptanceStatus.clear) {
        return const Center(child: CircularProgressIndicator());
      }
      return _LegalLoadError(
        message: state.error ?? 'Nao foi possivel carregar os documentos.',
        onRetry: () =>
            ref.read(legalAcceptanceControllerProvider.notifier).checkPending(),
      );
    }

    final document = state.pendingDocuments.first;
    return _LegalDocumentCard(
      key: ValueKey(document.id),
      document: document,
      current: 1,
      total: state.pendingDocuments.length,
      error: state.error,
      submitting: state.isSubmitting,
      onAccept: () =>
          ref.read(legalAcceptanceControllerProvider.notifier).accept(document),
      onRetry: () =>
          ref.read(legalAcceptanceControllerProvider.notifier).checkPending(),
    );
  }
}

class _LegalDocumentCard extends StatefulWidget {
  const _LegalDocumentCard({
    super.key,
    required this.document,
    required this.current,
    required this.total,
    required this.error,
    required this.submitting,
    required this.onAccept,
    required this.onRetry,
  });

  final LegalDocument document;
  final int current;
  final int total;
  final String? error;
  final bool submitting;
  final Future<void> Function() onAccept;
  final Future<void> Function() onRetry;

  @override
  State<_LegalDocumentCard> createState() => _LegalDocumentCardState();
}

class _LegalDocumentCardState extends State<_LegalDocumentCard> {
  bool _confirmed = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 920),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Leitura e aceite obrigatorios',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Revise o documento antes de continuar para o aplicativo. Documento ${widget.current} de ${widget.total}.',
                    style: const TextStyle(color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          widget.document.title,
                          key: const Key('legal-document-title'),
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                      ),
                      Chip(label: Text('Versao ${widget.document.version}')),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: Container(
                      key: const Key('legal-document-scroll'),
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceMuted,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: SingleChildScrollView(
                        child: SelectableText(widget.document.content),
                      ),
                    ),
                  ),
                  if (widget.error != null) ...[
                    const SizedBox(height: 12),
                    MaterialBanner(
                      content: Text(widget.error!),
                      actions: [
                        TextButton(
                          key: const Key('legal-retry-button'),
                          onPressed: widget.submitting ? null : widget.onRetry,
                          child: const Text('Tentar novamente'),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 12),
                  CheckboxListTile(
                    key: const Key('legal-confirmation-checkbox'),
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    value: _confirmed,
                    onChanged: widget.submitting
                        ? null
                        : (value) => setState(() {
                            _confirmed = value == true;
                          }),
                    title: const Text(
                      'Li o documento acima e confirmo o aceite desta versao.',
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      key: const Key('legal-accept-button'),
                      onPressed: !_confirmed || widget.submitting
                          ? null
                          : widget.onAccept,
                      icon: widget.submitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.verified_user_outlined),
                      label: const Text('Aceitar e continuar'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LegalLoadError extends StatelessWidget {
  const _LegalLoadError({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.gavel_outlined, size: 52),
            const SizedBox(height: 16),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.icon(
              key: const Key('legal-retry-button'),
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
    );
  }
}
