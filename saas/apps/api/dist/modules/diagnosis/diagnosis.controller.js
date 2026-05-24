export class DiagnosisController {
    constructor(service) {
        this.service = service;
        this.getQuestionnaire = (_request, response) => {
            response.json(this.service.getQuestionnaire());
        };
        this.submit = (request, response) => {
            const result = this.service.submit(request.body);
            response.status(201).json(result);
        };
    }
}
