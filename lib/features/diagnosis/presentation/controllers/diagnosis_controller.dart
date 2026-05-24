import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/diagnosis_question.dart';
import '../../domain/usecases/get_questions.dart';
import '../../domain/usecases/submit_diagnosis.dart';

class DiagnosisController extends StateNotifier<AsyncValue<List<DiagnosisQuestion>>> {
  DiagnosisController(this._getQuestions, this._submit) : super(const AsyncValue.loading()) {
    load();
  }

  final GetQuestions _getQuestions;
  final SubmitDiagnosis _submit;

  Future<void> load() async {
    try {
      final questions = await _getQuestions();
      state = AsyncValue.data(questions);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> submit(Map<String, dynamic> payload) async {
    await _submit(payload);
  }
}
