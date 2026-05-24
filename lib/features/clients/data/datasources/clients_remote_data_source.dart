import '../../domain/entities/client.dart';
import '../models/client_dto.dart';

class ClientsRemoteDataSource {
  Future<List<ClientDto>> fetchClients() async {
    // TODO: replace mock with real API integration
    await Future.delayed(const Duration(milliseconds: 400));
    return [
      ClientDto(
        id: 'c-01',
        name: 'Alfa Tech',
        segment: 'Tecnologia',
        progress: 0.72,
        status: ClientStatus.active,
        nextStep: 'Oficina de OKRs',
        score: 86,
        lastUpdatedAt: DateTime.now().subtract(const Duration(hours: 3)),
        owner: 'Mariana Souza',
        contactEmail: 'contato@alfatech.com',
        notes: 'Time comercial engajado e em fase de padronizacao do funil.',
      ),
      ClientDto(
        id: 'c-02',
        name: 'Beta Foods',
        segment: 'Industria alimenticia',
        progress: 0.41,
        status: ClientStatus.paused,
        nextStep: 'Alinhar plano comercial',
        score: 63,
        lastUpdatedAt: DateTime.now().subtract(const Duration(days: 2)),
        owner: 'Bruno Lima',
        contactEmail: 'gestao@betafoods.com',
        notes: 'Projeto pausado aguardando aprovacao orcamentaria.',
      ),
      ClientDto(
        id: 'c-03',
        name: 'Clara Financas',
        segment: 'Servicos financeiros',
        progress: 0.9,
        status: ClientStatus.active,
        nextStep: 'Fechamento Q1',
        score: 92,
        lastUpdatedAt: DateTime.now().subtract(const Duration(hours: 8)),
        owner: 'Paula Costa',
        contactEmail: 'board@clarafinancas.com',
        notes: 'Conta madura, com foco atual em governanca e rotinas de diretoria.',
      ),
      ClientDto(
        id: 'c-04',
        name: 'Delta Health',
        segment: 'Saude',
        progress: 0.16,
        status: ClientStatus.closed,
        nextStep: 'Encerrar consultoria',
        score: 35,
        lastUpdatedAt: DateTime.now().subtract(const Duration(days: 7)),
        owner: 'Rafael Nunes',
        contactEmail: 'operacao@deltahealth.com',
        notes: 'Conta migrada para modo de encerramento e handoff final.',
      ),
    ];
  }
}
