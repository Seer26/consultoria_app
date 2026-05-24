import 'business_area.dart';

class DiagnosisScaleQuestion {
  const DiagnosisScaleQuestion({
    required this.id,
    required this.area,
    required this.title,
    required this.helper,
  });

  final String id;
  final BusinessArea area;
  final String title;
  final String helper;
}
