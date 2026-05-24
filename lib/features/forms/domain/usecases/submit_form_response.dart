import '../repositories/form_repository.dart';

class SubmitFormResponse {
  const SubmitFormResponse(this._repository);

  final FormRepository _repository;

  Future<void> call({
    required String formId,
    required String clientId,
    required Map<String, dynamic> answers,
  }) {
    return _repository.submitResponse(
      formId: formId,
      clientId: clientId,
      answers: answers,
    );
  }
}
