export class DashboardController {
    constructor(service) {
        this.service = service;
        this.getAdminOverview = (request, response) => {
            response.json(this.service.getAdminOverview(request.auth));
        };
        this.getCompanyDashboard = (request, response) => {
            response.json(this.service.getCompanyDashboard(request.auth));
        };
        this.getEmployeeDashboard = (request, response) => {
            response.json(this.service.getEmployeeDashboard(request.auth));
        };
    }
}
