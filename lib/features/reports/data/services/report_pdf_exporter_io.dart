import 'dart:typed_data';

import 'package:printing/printing.dart';

Future<void> exportReportPdf({
  required Uint8List bytes,
  required String filename,
}) async {
  // Para desktop/mobile nesta etapa, abrimos o PDF no fluxo nativo do package printing.
  // Persistencia direta em arquivo pode ser adicionada depois com path_provider/file APIs.
  await Printing.layoutPdf(name: filename, onLayout: (_) async => bytes);
}
