import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/datasources/clients_remote_data_source.dart';
import '../../data/repositories/client_repository_impl.dart';
import '../../domain/entities/client.dart';
import '../../domain/repositories/client_repository.dart';
import '../../domain/usecases/get_clients.dart';
import '../controllers/clients_controller.dart';

final clientRepositoryProvider = Provider<ClientRepository>((ref) {
  return ClientRepositoryImpl(ClientsRemoteDataSource());
});

final getClientsProvider = Provider<GetClients>((ref) {
  return GetClients(ref.read(clientRepositoryProvider));
});

final clientsControllerProvider =
    StateNotifierProvider<ClientsController, AsyncValue<List<Client>>>((ref) {
      return ClientsController(ref.read(getClientsProvider));
    });

final selectedClientProvider = Provider.family<Client?, String>((
  ref,
  clientId,
) {
  final clients =
      ref.watch(clientsControllerProvider).valueOrNull ?? const <Client>[];
  for (final client in clients) {
    if (client.id == clientId) {
      return client;
    }
  }
  return null;
});
