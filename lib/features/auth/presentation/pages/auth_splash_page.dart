import 'package:flutter/material.dart';

/// Tela mínima enquanto [AuthStatus] ainda é `unknown` (bootstrap da sessão).
class AuthSplashPage extends StatelessWidget {
  const AuthSplashPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
