import 'package:dio/dio.dart';

import '../../domain/entities/create_form_input.dart';
import '../../domain/entities/form_field.dart';
import '../../domain/entities/form_template.dart';

class FormsRemoteDataSource {
  FormsRemoteDataSource(this._dio);

  final Dio _dio;

  static int _formCounter = 3;
  static final List<FormTemplate> _forms = [
    FormTemplate(
      id: 'f-01',
      clientId: 'c-01',
      clientName: 'Alfa Tech',
      title: 'Pulso comercial trimestral',
      description:
          'Questionario enviado para a lideranca mapear gargalos de vendas e previsibilidade.',
      audience: FormAudience.manager,
      status: FormStatus.sent,
      createdAt: DateTime(2026, 1, 10),
      responsesCount: 4,
      fields: [
        FormFieldItem(
          id: 'q-1',
          label: 'Quais canais geram mais leads hoje?',
          type: FormFieldType.longText,
          required: true,
        ),
        FormFieldItem(
          id: 'q-2',
          label: 'Existe CRM implementado?',
          type: FormFieldType.yesNo,
          required: true,
        ),
        FormFieldItem(
          id: 'q-3',
          label: 'Qual a previsao de faturamento do trimestre?',
          type: FormFieldType.dropdown,
          required: true,
          options: ['Abaixo da meta', 'Na meta', 'Acima da meta'],
        ),
      ],
    ),
    FormTemplate(
      id: 'f-02',
      clientId: 'c-03',
      clientName: 'Clara Financas',
      title: 'Rotina operacional da equipe',
      description:
          'Levantamento enviado aos colaboradores para mapear padronizacao e ritos da operacao.',
      audience: FormAudience.employee,
      status: FormStatus.draft,
      createdAt: DateTime(2026, 1, 18),
      responsesCount: 2,
      fields: [
        FormFieldItem(
          id: 'q-4',
          label: 'Como voce avalia a padronizacao dos processos?',
          type: FormFieldType.scale,
          required: true,
          options: ['1', '2', '3', '4', '5'],
        ),
        FormFieldItem(
          id: 'q-5',
          label: 'Selecione os gargalos mais frequentes',
          type: FormFieldType.checkbox,
          required: false,
          options: ['Retrabalho', 'Atrasos', 'Falta de dono', 'Sistema'],
        ),
        FormFieldItem(
          id: 'q-6',
          label: 'Quando a equipe revisa prioridades?',
          type: FormFieldType.date,
          required: false,
        ),
      ],
    ),
  ];

  Future<List<FormTemplate>> fetchForms({String? clientId}) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/forms',
        queryParameters: {
          if (clientId != null && clientId.isNotEmpty) 'clientId': clientId,
        },
      );
      final payload = response.data ?? <dynamic>[];
      final forms = payload
          .whereType<Map<String, dynamic>>()
          .map(_fromApi)
          .toList(growable: false);
      if (forms.isNotEmpty) {
        return forms;
      }
    } on DioException {
      // Keep mock fallback while backend endpoints are being stabilized.
    }

    await Future.delayed(const Duration(milliseconds: 250));
    if (clientId == null || clientId.isEmpty) {
      return List.unmodifiable(_forms);
    }
    return _forms
        .where((form) => form.clientId == clientId)
        .toList(growable: false);
  }

  Future<FormTemplate> createForm(CreateFormInput input) async {
    final payload = {
      'clientId': input.clientId,
      'clientName': input.clientName,
      'title': input.title,
      'description': input.description,
      'audience': input.audience.name,
      'status': input.status.name,
      'fields': input.fields.map(_fieldToApi).toList(growable: false),
    };

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/forms',
        data: payload,
      );
      final body = response.data;
      if (body != null) {
        final created = _fromApi(body);
        _upsertLocal(created);
        return created;
      }
    } on DioException {
      // Keep mock fallback while backend endpoints are being stabilized.
    }

    await Future.delayed(const Duration(milliseconds: 200));
    _formCounter += 1;
    final form = FormTemplate(
      id: 'f-${_formCounter.toString().padLeft(2, '0')}',
      clientId: input.clientId,
      clientName: input.clientName,
      title: input.title,
      description: input.description,
      audience: input.audience,
      status: input.status,
      createdAt: DateTime.now(),
      fields: input.fields,
      responsesCount: 0,
    );

    _forms.insert(0, form);
    return form;
  }

  Future<void> submitResponse({
    required String formId,
    required String clientId,
    required Map<String, dynamic> answers,
  }) async {
    try {
      await _dio.post<void>(
        '/forms/$formId/responses',
        data: {
          'clientId': clientId,
          'answers': answers,
          'submittedAt': DateTime.now().toIso8601String(),
        },
      );
      return;
    } on DioException {
      // Keep mock fallback while backend endpoints are being stabilized.
    }

    await Future.delayed(const Duration(milliseconds: 300));

    final formExists = _forms.any(
      (form) => form.id == formId && form.clientId == clientId,
    );
    if (!formExists) {
      throw Exception('Formulario nao encontrado para a empresa informada.');
    }

    if (answers.isEmpty) {
      throw Exception('Responda ao menos um campo antes de enviar.');
    }

    final index = _forms.indexWhere((form) => form.id == formId);
    if (index >= 0) {
      final current = _forms[index];
      _forms[index] = current.copyWith(
        responsesCount: current.responsesCount + 1,
      );
    }
  }

  FormTemplate _fromApi(Map<String, dynamic> json) {
    final rawFields = (json['fields'] as List<dynamic>? ?? <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .toList(growable: false);
    return FormTemplate(
      id: json['id']?.toString() ?? 'f-unknown',
      clientId: json['clientId']?.toString() ?? '',
      clientName: json['clientName']?.toString() ?? 'Empresa',
      title: json['title']?.toString() ?? 'Formulario',
      description: json['description']?.toString() ?? '',
      audience: _parseAudience(json['audience']?.toString()),
      status: _parseStatus(json['status']?.toString()),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      fields: rawFields.map(_fieldFromApi).toList(growable: false),
      responsesCount: json['responsesCount'] is int
          ? json['responsesCount'] as int
          : 0,
    );
  }

  FormFieldItem _fieldFromApi(Map<String, dynamic> json) {
    final typeRaw = json['type']?.toString() ?? 'shortText';
    return FormFieldItem(
      id: json['id']?.toString() ?? 'q-unknown',
      label: json['label']?.toString() ?? '',
      type: _parseFieldType(typeRaw),
      required: json['required'] == true,
      options: (json['options'] as List<dynamic>? ?? const <dynamic>[])
          .map((opt) => opt.toString())
          .toList(growable: false),
    );
  }

  Map<String, dynamic> _fieldToApi(FormFieldItem field) {
    return {
      'id': field.id,
      'label': field.label,
      'type': field.type.name,
      'required': field.required,
      'options': field.options,
    };
  }

  FormFieldType _parseFieldType(String raw) {
    switch (raw) {
      case 'longText':
        return FormFieldType.longText;
      case 'multipleChoice':
        return FormFieldType.multipleChoice;
      case 'checkbox':
        return FormFieldType.checkbox;
      case 'dropdown':
        return FormFieldType.dropdown;
      case 'yesNo':
        return FormFieldType.yesNo;
      case 'scale':
        return FormFieldType.scale;
      case 'date':
        return FormFieldType.date;
      case 'shortText':
      default:
        return FormFieldType.shortText;
    }
  }

  FormAudience _parseAudience(String? raw) {
    switch (raw) {
      case 'employee':
        return FormAudience.employee;
      case 'manager':
      default:
        return FormAudience.manager;
    }
  }

  FormStatus _parseStatus(String? raw) {
    switch (raw) {
      case 'sent':
        return FormStatus.sent;
      case 'archived':
        return FormStatus.archived;
      case 'draft':
      default:
        return FormStatus.draft;
    }
  }

  void _upsertLocal(FormTemplate form) {
    final index = _forms.indexWhere((item) => item.id == form.id);
    if (index >= 0) {
      _forms[index] = form;
      return;
    }
    _forms.insert(0, form);
  }
}
