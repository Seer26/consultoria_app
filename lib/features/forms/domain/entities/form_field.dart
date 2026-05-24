enum FormFieldType {
  shortText,
  longText,
  multipleChoice,
  checkbox,
  dropdown,
  yesNo,
  scale,
  date,
}

class FormFieldItem {
  const FormFieldItem({
    required this.id,
    required this.label,
    required this.type,
    required this.required,
    this.options = const [],
  });

  final String id;
  final String label;
  final FormFieldType type;
  final bool required;
  final List<String> options;
}
