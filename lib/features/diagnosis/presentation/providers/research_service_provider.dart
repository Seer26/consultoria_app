import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../data/services/research_service.dart';

final researchServiceProvider = Provider<ResearchService>((ref) {
  return ResearchService(ref.watch(dioProvider));
});
