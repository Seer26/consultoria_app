import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:consultoria_app/core/router/app_router.dart';
import 'package:consultoria_app/features/auth/domain/entities/user.dart';
import 'package:consultoria_app/features/auth/presentation/pages/change_password_page.dart';
import 'package:consultoria_app/features/auth/presentation/state/auth_state.dart';
import 'package:consultoria_app/features/legal/domain/entities/legal_document.dart';
import 'package:consultoria_app/features/legal/presentation/state/legal_acceptance_state.dart';

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
  enforcementRequired: true,
  pendingDocuments: [
    LegalDocument(
      documentType: 'TERMS_OF_USE',
      version: 'v1',
      title: 'Termos',
      content: 'Conteudo sintetico',
    ),
  ],
);

Future<void> pumpPage(
  WidgetTester tester, {
  required Future<void> Function(String, String) changePassword,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      child: MaterialApp(
        home: ChangePasswordPage(changePassword: changePassword),
      ),
    ),
  );
}

Future<void> fillValidForm(WidgetTester tester) async {
  await tester.enterText(
    find.byKey(const Key('current-password-field')),
    'SenhaAtual123!',
  );
  await tester.enterText(
    find.byKey(const Key('new-password-field')),
    'SenhaNova123!',
  );
  await tester.enterText(
    find.byKey(const Key('confirm-password-field')),
    'SenhaNova123!',
  );
}

bool isObscured(WidgetTester tester, String fieldKey) {
  return tester
      .widget<EditableText>(
        find.descendant(
          of: find.byKey(Key(fieldKey)),
          matching: find.byType(EditableText),
        ),
      )
      .obscureText;
}

void main() {
  group('rota autenticada de alteracao de senha', () {
    for (final role in ['ADMIN', 'OWNER', 'EMPLOYEE']) {
      test('$role pode abrir a tela sem pendencia juridica', () {
        expect(
          resolveAppRedirect(
            authState: authenticated(role),
            legalState: clearLegal,
            location: '/change-password',
          ),
          isNull,
        );
      });
    }

    test('gate juridico prevalece sobre a tela de senha', () {
      expect(
        resolveAppRedirect(
          authState: authenticated('OWNER'),
          legalState: requiredLegal,
          location: '/change-password',
        ),
        '/legal-acceptance',
      );
    });
  });

  group('tela Alterar minha senha', () {
    testWidgets('carrega campos ocultos e exige todos os valores', (
      tester,
    ) async {
      await pumpPage(tester, changePassword: (_, _) async {});

      for (final key in [
        'current-password-field',
        'new-password-field',
        'confirm-password-field',
      ]) {
        expect(isObscured(tester, key), isTrue);
      }

      await tester.tap(find.byKey(const Key('change-password-submit')));
      await tester.pump();
      expect(find.text('Campo obrigatorio'), findsNWidgets(3));
    });

    testWidgets('mostrar e ocultar funciona de forma independente', (
      tester,
    ) async {
      await pumpPage(tester, changePassword: (_, _) async {});

      await tester.tap(find.byKey(const Key('current-password-visibility')));
      await tester.pump();

      expect(isObscured(tester, 'current-password-field'), isFalse);
      expect(isObscured(tester, 'new-password-field'), isTrue);
    });

    testWidgets('rejeita confirmacao diferente', (tester) async {
      var calls = 0;
      await pumpPage(tester, changePassword: (_, _) async => calls++);
      await fillValidForm(tester);
      await tester.enterText(
        find.byKey(const Key('confirm-password-field')),
        'SenhaDiferente123!',
      );

      await tester.tap(find.byKey(const Key('change-password-submit')));
      await tester.pump();

      expect(
        find.text('A confirmacao deve ser igual a nova senha.'),
        findsOneWidget,
      );
      expect(calls, 0);
    });

    testWidgets('rejeita senha nova igual a atual', (tester) async {
      await pumpPage(tester, changePassword: (_, _) async {});
      await tester.enterText(
        find.byKey(const Key('current-password-field')),
        'SenhaAtual123!',
      );
      await tester.enterText(
        find.byKey(const Key('new-password-field')),
        'SenhaAtual123!',
      );
      await tester.enterText(
        find.byKey(const Key('confirm-password-field')),
        'SenhaAtual123!',
      );

      await tester.tap(find.byKey(const Key('change-password-submit')));
      await tester.pump();

      expect(
        find.text('A nova senha deve ser diferente da senha atual.'),
        findsOneWidget,
      );
    });

    testWidgets('apresenta feedback local da politica minima', (tester) async {
      await pumpPage(tester, changePassword: (_, _) async {});
      await tester.enterText(
        find.byKey(const Key('current-password-field')),
        'SenhaAtual123!',
      );
      await tester.enterText(
        find.byKey(const Key('new-password-field')),
        '12345678',
      );
      await tester.enterText(
        find.byKey(const Key('confirm-password-field')),
        '12345678',
      );

      await tester.tap(find.byKey(const Key('change-password-submit')));
      await tester.pump();

      expect(
        find.text('A senha nao pode conter somente numeros'),
        findsOneWidget,
      );
    });

    testWidgets('exibe loading e bloqueia envio duplicado', (tester) async {
      final completer = Completer<void>();
      var calls = 0;
      await pumpPage(
        tester,
        changePassword: (_, _) {
          calls++;
          return completer.future;
        },
      );
      await fillValidForm(tester);

      await tester.tap(find.byKey(const Key('change-password-submit')));
      await tester.pump();

      final button = tester.widget<FilledButton>(
        find.byKey(const Key('change-password-submit')),
      );
      expect(button.onPressed, isNull);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(calls, 1);

      completer.complete();
      await tester.pumpAndSettle();
    });

    testWidgets('sucesso limpa campos e mantem a tela ativa', (tester) async {
      String? receivedCurrent;
      String? receivedNew;
      await pumpPage(
        tester,
        changePassword: (current, next) async {
          receivedCurrent = current;
          receivedNew = next;
        },
      );
      await fillValidForm(tester);

      await tester.tap(find.byKey(const Key('change-password-submit')));
      await tester.pumpAndSettle();

      expect(receivedCurrent, 'SenhaAtual123!');
      expect(receivedNew, 'SenhaNova123!');
      expect(find.byKey(const Key('change-password-success')), findsOneWidget);
      expect(find.text('Senha alterada com sucesso'), findsWidgets);
      for (final key in [
        'current-password-field',
        'new-password-field',
        'confirm-password-field',
      ]) {
        expect(
          tester.widget<TextFormField>(find.byKey(Key(key))).controller!.text,
          isEmpty,
        );
      }
    });

    for (final scenario in [
      ('senha atual incorreta', 'A senha atual informada esta incorreta.'),
      (
        'politica de senha do backend',
        'Use ao menos 8 caracteres e evite somente numeros, seu email ou senhas comuns.',
      ),
    ]) {
      testWidgets('exibe erro amigavel para ${scenario.$1}', (tester) async {
        await pumpPage(
          tester,
          changePassword: (_, _) async => throw Exception(scenario.$2),
        );
        await fillValidForm(tester);

        await tester.tap(find.byKey(const Key('change-password-submit')));
        await tester.pumpAndSettle();

        expect(find.text(scenario.$2), findsOneWidget);
      });
    }

    testWidgets('falha de rede preserva dados e permite retry', (tester) async {
      var calls = 0;
      await pumpPage(
        tester,
        changePassword: (_, _) async {
          calls++;
          if (calls == 1) {
            throw Exception(
              'API indisponivel. Verifique sua conexao e tente novamente.',
            );
          }
        },
      );
      await fillValidForm(tester);

      await tester.tap(find.byKey(const Key('change-password-submit')));
      await tester.pumpAndSettle();
      expect(
        find.text('API indisponivel. Verifique sua conexao e tente novamente.'),
        findsOneWidget,
      );
      expect(
        tester
            .widget<TextFormField>(
              find.byKey(const Key('current-password-field')),
            )
            .controller!
            .text,
        'SenhaAtual123!',
      );

      await tester.tap(find.byKey(const Key('change-password-submit')));
      await tester.pumpAndSettle();
      expect(calls, 2);
      expect(find.byKey(const Key('change-password-success')), findsOneWidget);
    });
  });
}
