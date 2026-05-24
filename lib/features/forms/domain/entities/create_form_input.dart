import '../entities/form_field.dart';

enum FormAudience { manager, employee }

enum FormStatus { draft, sent, archived }

class CreateFormInput {
  const CreateFormInput({
    required this.clientId,
    required this.clientName,
    required this.title,
    required this.description,
    required this.audience,
    this.status = FormStatus.draft,
    required this.fields,
  });

  final String clientId;
  final String clientName;
  final String title;
  final String description;
  final FormAudience audience;
  final FormStatus status;
  final List<FormFieldItem> fields;
}
