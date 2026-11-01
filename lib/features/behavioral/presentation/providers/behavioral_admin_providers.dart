import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/di/providers.dart';
import '../../data/services/behavioral_admin_service.dart';

final behavioralAdminServiceProvider = Provider<BehavioralAdminService>(
  (ref) => BehavioralAdminService(ref.watch(dioProvider)),
);
