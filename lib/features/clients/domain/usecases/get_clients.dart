import '../entities/client.dart';
import '../repositories/client_repository.dart';

class GetClients {
  const GetClients(this.repository);

  final ClientRepository repository;

  Future<List<Client>> call() => repository.fetchClients();
}
