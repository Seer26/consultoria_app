import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/message.dart';

class ChatController extends StateNotifier<List<ChatMessage>> {
  ChatController() : super(_seed);

  static final List<ChatMessage> _seed = [
    ChatMessage(
      id: 'm1',
      author: 'Consultor',
      role: 'consultant',
      text: 'Bem-vindo! Vamos revisar o diagnostico inicial.',
      sentAt: DateTime.now().subtract(const Duration(minutes: 40)),
    ),
    ChatMessage(
      id: 'm2',
      author: 'Cliente',
      role: 'client',
      text: 'Enviei os dados de faturamento no portal.',
      sentAt: DateTime.now().subtract(const Duration(minutes: 18)),
    ),
  ];

  void send(String text) {
    final newMessage = ChatMessage(
      id: 'm${state.length + 1}',
      author: 'Consultor',
      role: 'consultant',
      text: text,
      sentAt: DateTime.now(),
    );
    state = [...state, newMessage];
  }

  void clearConversation() {
    state = const [];
  }
}
