import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../domain/entities/message.dart';
import '../providers/chat_providers.dart';

class ChatPage extends ConsumerStatefulWidget {
  const ChatPage({super.key});

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final messages = ref.watch(chatControllerProvider);

    return AppPageScaffold(
      title: 'Chat',
      subtitle: 'Canal de acompanhamento pronto para futura persistencia, sincronizacao e estados remotos.',
      child: Column(
        children: [
          Card(
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              leading: const CircleAvatar(child: Icon(Icons.support_agent)),
              title: const Text('Canal de acompanhamento'),
              subtitle: const Text('Consultor online • respostas mockadas persistem na sessao atual'),
              trailing: TextButton(
                onPressed: () => ref.read(chatControllerProvider.notifier).clearConversation(),
                child: const Text('Limpar'),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: Card(
              child: Column(
                children: [
                  Expanded(
                    child: messages.isEmpty
                        ? const AppEmptyState(
                            title: 'Sem mensagens ainda',
                            message: 'Inicie a conversa para registrar alinhamentos, dúvidas e próximos passos.',
                            icon: Icons.chat_bubble_outline,
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(20),
                            itemCount: messages.length,
                            itemBuilder: (context, index) {
                              final message = messages[index];
                              return _ChatBubble(message: message);
                            },
                          ),
                  ),
                  const Divider(height: 1),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _controller,
                            decoration: const InputDecoration(
                              hintText: 'Escreva uma mensagem',
                              prefixIcon: Icon(Icons.chat_bubble_outline),
                            ),
                            onSubmitted: (_) => _send(),
                          ),
                        ),
                        const SizedBox(width: 8),
                        FilledButton.icon(
                          onPressed: _send,
                          icon: const Icon(Icons.send),
                          label: const Text('Enviar'),
                        ),
                      ],
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

  void _send() {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      return;
    }
    ref.read(chatControllerProvider.notifier).send(text);
    _controller.clear();
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isConsultant = message.role == 'consultant';
    final bubbleColor = isConsultant ? AppColors.primary : AppColors.surfaceMuted;
    final textColor = isConsultant ? Colors.white : AppColors.textPrimary;

    return Align(
      alignment: isConsultant ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 560),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: bubbleColor,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message.author,
              style: TextStyle(
                color: isConsultant ? Colors.white70 : AppColors.textSecondary,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            Text(message.text, style: TextStyle(color: textColor)),
            const SizedBox(height: 6),
            Text(
              DateFormatter.formatTime(message.sentAt),
              style: TextStyle(
                color: isConsultant ? Colors.white70 : AppColors.textSecondary,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
