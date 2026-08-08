import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:consultoria_app/core/router/app_router.dart';
import 'package:consultoria_app/features/auth/domain/entities/user.dart';
import 'package:consultoria_app/features/auth/presentation/state/auth_state.dart';
import 'package:consultoria_app/features/legal/data/services/legal_acceptance_service.dart';
import 'package:consultoria_app/features/legal/domain/entities/legal_document.dart';
import 'package:consultoria_app/features/legal/presentation/controllers/legal_acceptance_controller.dart';
import 'package:consultoria_app/features/legal/presentation/pages/legal_acceptance_page.dart';
import 'package:consultoria_app/features/legal/presentation/providers/legal_acceptance_providers.dart';
import 'package:consultoria_app/features/legal/presentation/state/legal_acceptance_state.dart';

const termsV1 = LegalDocument(
  documentType: 'TERMS_OF_USE',
  version: 'v1',
  title: 'Termos de Uso',
  content: 'Conteudo sintetico dos termos para o teste.',
);

const privacyV1 = LegalDocument(
  documentType: 'PRIVACY_POLICY',
  version: 'v1',
  title: 'Politica de Privacidade',
  content: 'Conteudo sintetico da politica para o teste.',
);

AuthState authenticated(String role) => AuthState(
  status: AuthStatus.authenticated,
  user: User(
    id: 'user-$role',
    name: 'Usuario $role',
    email: '${role.toLowerCase()}@example.test',
    role: role,
    companyId: role == 'ADMIN' ? null : 'company-test',
  ),
);

const clearLegal = LegalAcceptanceState(status: LegalAcceptanceStatus.clear);

const requiredLegal = LegalAcceptanceState(
  status: LegalAcceptanceStatus.required,
  pendingDocuments: [termsV1, privacyV1],
);

class FakeLegalApi implements LegalAcceptanceApi {
  FakeLegalApi({List<LegalDocument>? pending})
    : pending = List.of(pending ?? const []);

  List<LegalDocument> pending;
  bool failFetch = false;
  bool failAccept = false;
  int fetchCalls = 0;
  int acceptCalls = 0;

  @override
  Future<List<LegalDocument>> getPendingDocuments() async {
    fetchCalls += 1;
    if (failFetch) throw Exception('synthetic fetch failure');
    return List.of(pending);
  }

  @override
  Future<void> acceptDocument(LegalDocument document) async {
    acceptCalls += 1;
    if (failAccept) throw Exception('synthetic post failure');
    pending.removeWhere((item) => item.id == document.id);
  }
}

void main() {
  group('redirecionamento juridico obrigatorio', () {
    test('login sem pendencia segue para dashboard OWNER', () {
      expect(
        resolveAppRedirect(
          authState: authenticated('OWNER'),
          legalState: clearLegal,
          location: '/',
        ),
        '/owner',
      );
    });

    test('login com pendencia segue para tela juridica', () {
      expect(
        resolveAppRedirect(
          authState: authenticated('OWNER'),
          legalState: requiredLegal,
          location: '/owner',
        ),
        '/legal-acceptance',
      );
    });

    for (final role in ['ADMIN', 'OWNER', 'EMPLOYEE']) {
      test('$role nao pode ignorar pendencia', () {
        expect(
          resolveAppRedirect(
            authState: authenticated(role),
            legalState: requiredLegal,
            location: role == 'ADMIN'
                ? '/admin'
                : role == 'OWNER'
                ? '/owner'
                : '/employee',
          ),
          '/legal-acceptance',
        );
      });
    }

    test('restauracao de sessao aguarda consulta e bloqueia deep link', () {
      expect(
        resolveAppRedirect(
          authState: authenticated('EMPLOYEE'),
          legalState: const LegalAcceptanceState(
            status: LegalAcceptanceStatus.loading,
          ),
          location: '/tasks',
        ),
        '/',
      );
      expect(
        resolveAppRedirect(
          authState: authenticated('EMPLOYEE'),
          legalState: requiredLegal,
          location: '/tasks',
        ),
        '/legal-acceptance',
      );
    });

    test('aceite concluido sai da tela juridica para dashboard da role', () {
      expect(
        resolveAppRedirect(
          authState: authenticated('ADMIN'),
          legalState: clearLegal,
          location: '/legal-acceptance',
        ),
        '/admin',
      );
    });
  });

  group('controller juridico', () {
    test('nova versao retornada pelo backend volta a ficar pendente', () async {
      final api = FakeLegalApi(
        pending: const [
          LegalDocument(
            documentType: 'TERMS_OF_USE',
            version: 'v2',
            title: 'Termos atualizados',
            content: 'Nova versao sintetica.',
          ),
        ],
      );
      final controller = LegalAcceptanceController(api);

      await controller.checkPending();

      expect(controller.state.status, LegalAcceptanceStatus.required);
      expect(controller.state.pendingDocuments.single.version, 'v2');
    });

    test(
      'aceite bem-sucedido so libera apos nova consulta sem pendencia',
      () async {
        final api = FakeLegalApi(pending: const [termsV1]);
        final controller = LegalAcceptanceController(api);
        await controller.checkPending();

        await controller.accept(termsV1);

        expect(api.acceptCalls, 1);
        expect(api.fetchCalls, 2);
        expect(controller.state.status, LegalAcceptanceStatus.clear);
      },
    );

    test('falha no POST preserva documento e bloqueio', () async {
      final api = FakeLegalApi(pending: const [termsV1])..failAccept = true;
      final controller = LegalAcceptanceController(api);
      await controller.checkPending();

      await controller.accept(termsV1);

      expect(controller.state.status, LegalAcceptanceStatus.error);
      expect(controller.state.pendingDocuments.single.id, termsV1.id);
    });

    test('retry recupera falha de carregamento', () async {
      final api = FakeLegalApi(pending: const [termsV1])..failFetch = true;
      final controller = LegalAcceptanceController(api);
      await controller.checkPending();
      expect(controller.state.status, LegalAcceptanceStatus.error);

      api.failFetch = false;
      await controller.checkPending();

      expect(controller.state.status, LegalAcceptanceStatus.required);
      expect(api.fetchCalls, 2);
    });
  });

  group('tela juridica', () {
    testWidgets('botao fica desabilitado antes da confirmacao', (tester) async {
      final controller = LegalAcceptanceController(
        FakeLegalApi(pending: const [termsV1]),
      );
      await controller.checkPending();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            legalAcceptanceControllerProvider.overrideWith((ref) => controller),
          ],
          child: const MaterialApp(home: LegalAcceptancePage()),
        ),
      );

      final button = tester.widget<FilledButton>(
        find.byKey(const Key('legal-accept-button')),
      );
      expect(button.onPressed, isNull);
      expect(find.text('Termos de Uso'), findsOneWidget);
      expect(find.textContaining('Versao v1'), findsOneWidget);
    });

    testWidgets('falha no aceite permanece na tela e oferece retry', (
      tester,
    ) async {
      final api = FakeLegalApi(pending: const [termsV1])..failAccept = true;
      final controller = LegalAcceptanceController(api);
      await controller.checkPending();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            legalAcceptanceControllerProvider.overrideWith((ref) => controller),
          ],
          child: const MaterialApp(home: LegalAcceptancePage()),
        ),
      );
      await tester.tap(find.byType(Checkbox));
      await tester.pump();
      await tester.tap(find.byKey(const Key('legal-accept-button')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('legal-document-title')), findsOneWidget);
      expect(find.byKey(const Key('legal-retry-button')), findsOneWidget);
      expect(controller.state.status, LegalAcceptanceStatus.error);
    });

    testWidgets('logout permanece disponivel durante o bloqueio', (
      tester,
    ) async {
      var loggedOut = false;
      final controller = LegalAcceptanceController(
        FakeLegalApi(pending: const [termsV1]),
      );
      await controller.checkPending();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            legalAcceptanceControllerProvider.overrideWith((ref) => controller),
          ],
          child: MaterialApp(
            home: LegalAcceptancePage(onLogout: () async => loggedOut = true),
          ),
        ),
      );

      await tester.tap(find.byKey(const Key('legal-logout-button')));
      await tester.pump();
      expect(loggedOut, isTrue);
    });
  });
}
