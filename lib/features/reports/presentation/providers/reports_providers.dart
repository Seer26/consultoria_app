import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../data/services/reports_service.dart';
import '../../domain/entities/report.dart';

final reportsServiceProvider = Provider<ReportsService>((ref) {
  return ReportsService(ref.watch(dioProvider));
});

final reportsProvider = FutureProvider<List<ReportSummary>>((ref) async {
  return ref.watch(reportsServiceProvider).listResearchReports();
});

final executiveReportProvider = FutureProvider.family<ExecutiveReport, String>((
  ref,
  submissionId,
) async {
  return ref.watch(reportsServiceProvider).getExecutiveReport(submissionId);
});
