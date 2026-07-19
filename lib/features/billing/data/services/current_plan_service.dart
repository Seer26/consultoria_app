import 'package:dio/dio.dart';

class CurrentPlanService {
  CurrentPlanService(this._dio);

  final Dio _dio;

  Future<CurrentPlanSnapshot> getCurrentPlan() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/billing/current-plan',
      );
      return CurrentPlanSnapshot.fromMap(response.data ?? const {});
    } on DioException catch (error) {
      throw Exception(_extractError(error));
    } catch (error) {
      throw Exception('Falha ao carregar o plano atual: $error');
    }
  }

  String _extractError(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['error'] != null) {
      switch (data['error'].toString()) {
        case 'COMPANY_ID_REQUIRED':
          return 'Nao foi possivel identificar a empresa do usuario.';
        case 'COMPANY_NOT_FOUND':
          return 'Empresa nao encontrada.';
        case 'PLAN_NOT_FOUND':
          return 'Plano da empresa nao encontrado.';
      }
    }

    return 'Falha ao carregar o plano atual.';
  }
}

class CurrentPlanSnapshot {
  const CurrentPlanSnapshot({
    required this.companyId,
    required this.planName,
    required this.planSlug,
    required this.planDescription,
    required this.subscriptionStatus,
    required this.currentPeriodStart,
    required this.currentPeriodEnd,
    required this.usageItems,
  });

  final String companyId;
  final String planName;
  final String planSlug;
  final String? planDescription;
  final String subscriptionStatus;
  final DateTime? currentPeriodStart;
  final DateTime? currentPeriodEnd;
  final List<PlanUsageItem> usageItems;

  factory CurrentPlanSnapshot.fromMap(Map<String, dynamic> map) {
    final plan = _readMap(map['plan']);
    final subscription = _readMap(map['subscription']);
    final usage = _readMap(map['usage']);

    return CurrentPlanSnapshot(
      companyId: map['companyId']?.toString() ?? '',
      planName: plan['name']?.toString() ?? 'Plano',
      planSlug: plan['slug']?.toString() ?? '',
      planDescription: plan['description']?.toString(),
      subscriptionStatus: subscription['status']?.toString() ?? '',
      currentPeriodStart: DateTime.tryParse(
        subscription['currentPeriodStart']?.toString() ?? '',
      ),
      currentPeriodEnd: DateTime.tryParse(
        subscription['currentPeriodEnd']?.toString() ?? '',
      ),
      usageItems: [
        PlanUsageItem.fromMap(_readMap(usage['users'])),
        PlanUsageItem.fromMap(_readMap(usage['researchSubmissionsMonthly'])),
        PlanUsageItem.fromMap(_readMap(usage['reportPdfsMonthly'])),
        PlanUsageItem.fromMap(_readMap(usage['activeActionTasks'])),
        PlanUsageItem.fromMap(_readMap(usage['aiQuestionsMonthly'])),
      ].where((item) => item.feature.isNotEmpty).toList(),
    );
  }

  static Map<String, dynamic> _readMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    return const {};
  }
}

class PlanUsageItem {
  const PlanUsageItem({
    required this.feature,
    required this.label,
    required this.used,
    required this.limit,
    required this.remaining,
    required this.period,
  });

  final String feature;
  final String label;
  final int used;
  final int limit;
  final int remaining;
  final String? period;

  double get progress {
    if (limit <= 0) {
      return 0;
    }

    return (used / limit).clamp(0, 1).toDouble();
  }

  bool get isNearLimit => progress >= 0.8;
  bool get isBlocked => remaining <= 0;

  factory PlanUsageItem.fromMap(Map<String, dynamic> map) {
    return PlanUsageItem(
      feature: map['feature']?.toString() ?? '',
      label: map['label']?.toString() ?? '',
      used: (map['used'] as num?)?.toInt() ?? 0,
      limit: (map['limit'] as num?)?.toInt() ?? 0,
      remaining: (map['remaining'] as num?)?.toInt() ?? 0,
      period: map['period']?.toString(),
    );
  }
}
