class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.author,
    required this.role,
    required this.text,
    required this.sentAt,
  });

  final String id;
  final String author;
  final String role; // consultant or client
  final String text;
  final DateTime sentAt;
}
