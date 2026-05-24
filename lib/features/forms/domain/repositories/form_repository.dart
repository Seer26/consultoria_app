import '../entities/create_form_input.dart';
import '../entities/form_template.dart';

abstract class FormRepository {
  Future<List<FormTemplate>> getForms({String? clientId});

  Future<FormTemplate> createForm(CreateFormInput input);

  Future<void> submitResponse({
    required String formId,
    required String clientId,
    required Map<String, dynamic> answers,
  });
}
