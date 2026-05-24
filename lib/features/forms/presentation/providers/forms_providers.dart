import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../data/datasources/forms_remote_data_source.dart';
import '../../data/repositories/form_repository_impl.dart';
import '../../domain/entities/form_template.dart';
import '../../domain/repositories/form_repository.dart';
import '../../domain/usecases/create_form.dart';
import '../../domain/usecases/get_forms.dart';
import '../../domain/usecases/submit_form_response.dart';
import '../controllers/forms_controller.dart';

final formsDataSourceProvider = Provider<FormsRemoteDataSource>((ref) {
  return FormsRemoteDataSource(ref.read(dioProvider));
});

final formRepositoryProvider = Provider<FormRepository>((ref) {
  return FormRepositoryImpl(ref.read(formsDataSourceProvider));
});

final getFormsProvider = Provider<GetForms>((ref) {
  return GetForms(ref.read(formRepositoryProvider));
});

final createFormProvider = Provider<CreateForm>((ref) {
  return CreateForm(ref.read(formRepositoryProvider));
});

final submitFormResponseProvider = Provider<SubmitFormResponse>((ref) {
  return SubmitFormResponse(ref.read(formRepositoryProvider));
});

final formsControllerProvider =
    StateNotifierProvider<FormsController, AsyncValue<List<FormTemplate>>>((ref) {
  return FormsController(
    ref.read(getFormsProvider),
    ref.read(createFormProvider),
    ref.read(submitFormResponseProvider),
  );
});

final selectedFormClientIdProvider = StateProvider<String?>((ref) => null);
