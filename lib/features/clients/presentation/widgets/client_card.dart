import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../domain/entities/client.dart';

class ClientCard extends StatelessWidget {
  const ClientCard({
    super.key,
    required this.client,
    this.onOpen,
    this.onEdit,
    this.onArchive,
    this.onRemove,
  });

  final Client client;
  final VoidCallback? onOpen;
  final VoidCallback? onEdit;
  final VoidCallback? onArchive;
  final VoidCallback? onRemove;

  Color get _statusColor {
    switch (client.status) {
      case ClientStatus.active:
        return AppColors.success;
      case ClientStatus.paused:
        return AppColors.amber;
      case ClientStatus.closed:
        return AppColors.textMuted;
    }
  }

  String get _statusLabel {
    switch (client.status) {
      case ClientStatus.active:
        return 'Ativo';
      case ClientStatus.paused:
        return 'Pausado';
      case ClientStatus.closed:
        return 'Arquivado';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: _statusColor.withValues(alpha: 0.12),
                  foregroundColor: _statusColor,
                  child: Text(
                    client.name.substring(0, 1),
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        client.name,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${client.segment} • ${client.owner}',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                      ),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  onSelected: (value) {
                    switch (value) {
                      case 'open':
                        onOpen?.call();
                        return;
                      case 'edit':
                        onEdit?.call();
                        return;
                      case 'archive':
                        onArchive?.call();
                        return;
                      case 'remove':
                        onRemove?.call();
                        return;
                    }
                  },
                  itemBuilder: (context) => const [
                    PopupMenuItem(value: 'open', child: Text('Abrir detalhes')),
                    PopupMenuItem(value: 'edit', child: Text('Editar cliente')),
                    PopupMenuItem(value: 'archive', child: Text('Arquivar')),
                    PopupMenuItem(value: 'remove', child: Text('Remover')),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(
                  label: Text(_statusLabel),
                  backgroundColor: _statusColor.withValues(alpha: 0.12),
                  labelStyle: TextStyle(color: _statusColor),
                ),
                Chip(label: Text('Score ${client.score}')),
                Chip(label: Text('Atualizado ${DateFormatter.formatRelative(client.lastUpdatedAt)}')),
              ],
            ),
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: client.progress,
              minHeight: 10,
              borderRadius: BorderRadius.circular(999),
              backgroundColor: AppColors.surfaceMuted,
              valueColor: AlwaysStoppedAnimation<Color>(_statusColor),
            ),
            const SizedBox(height: 8),
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              runSpacing: 6,
              spacing: 12,
              children: [
                Text('Progresso ${(client.progress * 100).round()}%'),
                Text(
                  client.contactEmail,
                  style: const TextStyle(color: AppColors.textSecondary),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surfaceMuted,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Proximo passo',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    client.nextStep,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  if (client.notes.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(client.notes),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                OutlinedButton.icon(
                  onPressed: onOpen,
                  icon: const Icon(Icons.open_in_new),
                  label: const Text('Detalhes'),
                ),
                TextButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Editar'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
