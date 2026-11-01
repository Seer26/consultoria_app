import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/di/providers.dart';
import '../../data/services/behavioral_service.dart';

// No eager request: opening the route never creates an assessment.
final behavioralServiceProvider = Provider<BehavioralService>((ref) {
  return BehavioralService(ref.watch(dioProvider));
});
