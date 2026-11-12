import 'dart:typed_data';

import 'report_pdf_exporter_stub.dart'
    if (dart.library.html) 'report_pdf_exporter_web.dart'
    if (dart.library.io) 'report_pdf_exporter_io.dart'
    as exporter;

Future<void> exportReportPdf({
  required Uint8List bytes,
  required String filename,
}) {
  return exporter.exportReportPdf(bytes: bytes, filename: filename);
}
