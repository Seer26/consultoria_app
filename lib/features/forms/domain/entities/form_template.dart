import 'create_form_input.dart';
import 'form_field.dart';

class FormTemplate {
  const FormTemplate({
    required this.id,
    required this.clientId,
    required this.clientName,
    required this.title,
    required this.description,
    required this.audience,
    required this.status,
    required this.createdAt,
    required this.fields,
    this.responsesCount = 0,
  });

  final String id;
  final String clientId;
  final String clientName;
  final String title;
  final String description;
  final FormAudience audience;
  final FormStatus status;
  final DateTime createdAt;
  final List<FormFieldItem> fields;
  final int responsesCount;

  FormTemplate copyWith({
    String? id,
    String? clientId,
    String? clientName,
    String? title,
    String? description,
    FormAudience? audience,
    FormStatus? status,
    DateTime? createdAt,
    List<FormFieldItem>? fields,
    int? responsesCount,
  }) {
    return FormTemplate(
      id: id ?? this.id,
      clientId: clientId ?? this.clientId,
      clientName: clientName ?? this.clientName,
      title: title ?? this.title,
      description: description ?? this.description,
      audience: audience ?? this.audience,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      fields: fields ?? this.fields,
      responsesCount: responsesCount ?? this.responsesCount,
    );
  }
}
