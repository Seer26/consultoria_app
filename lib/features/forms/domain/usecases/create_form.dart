import '../entities/create_form_input.dart';
import '../entities/form_template.dart';
import '../repositories/form_repository.dart';

class CreateForm {
  const CreateForm(this._repository);

  final FormRepository _repository;

  Future<FormTemplate> call(CreateFormInput input) {
    return _repository.createForm(input);
  }
}
