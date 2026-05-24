import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/client.dart';
import '../../domain/usecases/get_clients.dart';

class ClientsController extends StateNotifier<AsyncValue<List<Client>>> {
  ClientsController(this._getClients) : super(const AsyncValue.loading()) {
    load();
  }

  final GetClients _getClients;

  Future<void> load() async {
    try {
      final clients = await _getClients();
      state = AsyncValue.data(clients);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void create(Client client) {
    final current = state.valueOrNull ?? const <Client>[];
    state = AsyncValue.data([client, ...current]);
  }

  void update(Client updatedClient) {
    final current = state.valueOrNull ?? const <Client>[];
    state = AsyncValue.data([
      for (final client in current)
        if (client.id == updatedClient.id) updatedClient else client,
    ]);
  }

  void archive(String id) {
    final current = state.valueOrNull ?? const <Client>[];
    state = AsyncValue.data([
      for (final client in current)
        if (client.id == id)
          client.copyWith(
            status: ClientStatus.closed,
            lastUpdatedAt: DateTime.now(),
          )
        else
          client,
    ]);
  }

  void remove(String id) {
    final current = state.valueOrNull ?? const <Client>[];
    state = AsyncValue.data(current.where((client) => client.id != id).toList());
  }
}
