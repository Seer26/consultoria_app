import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/failure.dart';
import '../../domain/entities/client.dart';
import '../../domain/repositories/client_repository.dart';
import '../datasources/clients_remote_data_source.dart';

class ClientRepositoryImpl implements ClientRepository {
  ClientRepositoryImpl(this.remoteDataSource);

  final ClientsRemoteDataSource remoteDataSource;

  @override
  Future<List<Client>> fetchClients() async {
    try {
      final dtos = await remoteDataSource.fetchClients();
      return dtos.map((dto) => dto.toDomain()).toList();
    } catch (e) {
      throw ServerFailure('Falha ao carregar clientes: $e');
    }
  }
}

final clientRepositoryProvider = Provider<ClientRepository>((ref) {
  return ClientRepositoryImpl(ClientsRemoteDataSource());
});
