import '../entities/form_template.dart';
import '../repositories/form_repository.dart';

class GetForms {
  const GetForms(this._repository);

  final FormRepository _repository;

  Future<List<FormTemplate>> call({String? clientId}) {
    return _repository.getForms(clientId: clientId);
  }
}
