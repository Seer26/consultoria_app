import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/message.dart';
import '../controllers/chat_controller.dart';

final chatControllerProvider =
    StateNotifierProvider<ChatController, List<ChatMessage>>((ref) {
  return ChatController();
});
