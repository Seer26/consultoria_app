import 'dart:typed_data';

Future<void> exportReportPdf({
  required Uint8List bytes,
  required String filename,
}) async {
  throw UnsupportedError('Exportacao de PDF nao suportada nesta plataforma.');
}
