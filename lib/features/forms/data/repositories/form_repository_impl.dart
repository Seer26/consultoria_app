import '../../domain/entities/create_form_input.dart';
import '../../domain/entities/form_template.dart';
import '../../domain/repositories/form_repository.dart';
import '../datasources/forms_remote_data_source.dart';

class FormRepositoryImpl implements FormRepository {
  FormRepositoryImpl(this._dataSource);

  final FormsRemoteDataSource _dataSource;

  @override
  Future<List<FormTemplate>> getForms({String? clientId}) {
    return _dataSource.fetchForms(clientId: clientId);
  }

  @override
  Future<FormTemplate> createForm(CreateFormInput input) {
    return _dataSource.createForm(input);
  }

  @override
  Future<void> submitResponse({
    required String formId,
    required String clientId,
    required Map<String, dynamic> answers,
  }) {
    return _dataSource.submitResponse(
      formId: formId,
      clientId: clientId,
      answers: answers,
    );
  }
}
