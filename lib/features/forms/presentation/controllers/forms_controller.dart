import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/create_form_input.dart';
import '../../domain/entities/form_template.dart';
import '../../domain/usecases/create_form.dart';
import '../../domain/usecases/get_forms.dart';
import '../../domain/usecases/submit_form_response.dart';

class FormsController extends StateNotifier<AsyncValue<List<FormTemplate>>> {
  FormsController(this._getForms, this._createForm, this._submitFormResponse)
    : super(const AsyncValue.loading()) {
    load();
  }

  final GetForms _getForms;
  final CreateForm _createForm;
  final SubmitFormResponse _submitFormResponse;

  Future<void> load({String? clientId}) async {
    try {
      final forms = await _getForms(clientId: clientId);
      state = AsyncValue.data(forms);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> create(CreateFormInput input, {String? clientId}) async {
    await _createForm(input);
    await load(clientId: clientId);
  }

  Future<void> submit({
    required String formId,
    required String clientId,
    required Map<String, dynamic> answers,
  }) async {
    await _submitFormResponse(
      formId: formId,
      clientId: clientId,
      answers: answers,
    );
    final current = state.valueOrNull ?? const <FormTemplate>[];
    state = AsyncValue.data([
      for (final form in current)
        if (form.id == formId)
          form.copyWith(responsesCount: form.responsesCount + 1)
        else
          form,
    ]);
  }

  void duplicate(FormTemplate template) {
    final current = state.valueOrNull ?? const <FormTemplate>[];
    state = AsyncValue.data([
      template.copyWith(
        id: 'f-${DateTime.now().microsecondsSinceEpoch}',
        title: '${template.title} (copia)',
        createdAt: DateTime.now(),
        responsesCount: 0,
      ),
      ...current,
    ]);
  }

  void updateTemplate(FormTemplate template) {
    final current = state.valueOrNull ?? const <FormTemplate>[];
    state = AsyncValue.data([
      for (final item in current)
        if (item.id == template.id) template else item,
    ]);
  }

  void deleteTemplate(String id) {
    final current = state.valueOrNull ?? const <FormTemplate>[];
    state = AsyncValue.data(current.where((item) => item.id != id).toList());
  }

  void updateStatus(String id, FormStatus status) {
    final current = state.valueOrNull ?? const <FormTemplate>[];
    state = AsyncValue.data([
      for (final item in current)
        if (item.id == id) item.copyWith(status: status) else item,
    ]);
  }
}
