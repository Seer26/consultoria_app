class LegalDocument {
  const LegalDocument({
    required this.documentType,
    required this.version,
    required this.title,
    required this.content,
  });

  final String documentType;
  final String version;
  final String title;
  final String content;

  String get id => '$documentType:$version';

  factory LegalDocument.fromMap(Map<String, dynamic> map) {
    final document = LegalDocument(
      documentType: map['documentType']?.toString() ?? '',
      version: map['version']?.toString() ?? '',
      title: map['title']?.toString() ?? '',
      content: map['content']?.toString() ?? '',
    );

    if (document.documentType.isEmpty ||
        document.version.isEmpty ||
        document.title.isEmpty ||
        document.content.isEmpty) {
      throw const FormatException('Documento juridico invalido.');
    }

    return document;
  }
}

class LegalAcceptanceStatusResult {
  const LegalAcceptanceStatusResult({
    required this.enforcementRequired,
    required this.pendingDocuments,
  });

  final bool enforcementRequired;
  final List<LegalDocument> pendingDocuments;
}
