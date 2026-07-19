# Backup externo de staging

## Objetivo

Manter uma cópia verificável fora do diretório do banco e do ciclo de vida normal da instância. Backup no mesmo volume do SQLite não protege contra perda do volume.

## Estado atual

O fluxo foi implementado com adapter de destino e validado usando diretório temporário que simula um mount externo. O teste comprovou backup consistente, manifesto, tamanho, SHA-256, cópia e validação SQLite. Nenhum storage real foi provisionado nesta sprint.

## Configuração por filesystem/mount

```dotenv
SQLITE_BACKUP_DIR=/var/backups/consultoria
SQLITE_BACKUP_RETENTION=14
BACKUP_EXTERNAL_PROVIDER=filesystem
BACKUP_EXTERNAL_DIRECTORY=/mnt/backup-externo
```

O diretório externo deve apontar para volume, bucket montado ou storage persistente distinto. A escolha do fornecedor permanece aberta.

## Execução

```powershell
npm.cmd --workspace @consultoria/api run db:backup:external
```

O comando:

1. cria backup SQLite consistente;
2. calcula tamanho e SHA-256;
3. grava manifesto sem segredos;
4. copia para o destino externo;
5. valida a cópia;
6. aplica retenção configurada;
7. emite alerta operacional sanitizado em caso de falha.

## Checklist para storage real

- [ ] Provisionar destino externo separado do volume do banco.
- [ ] Criar credencial de menor privilégio e armazená-la no cofre.
- [ ] Habilitar criptografia em trânsito e em repouso.
- [ ] Definir retenção e proteção contra exclusão acidental.
- [ ] Agendar execução e monitorar sucesso/idade do último backup.
- [ ] Validar checksum após transferência.
- [ ] Testar restore em staging isolado.
- [ ] Registrar RPO/RTO e responsáveis.
- [ ] Documentar rotação/revogação de credencial.

## Teste de restore

Nunca restaure diretamente sobre um staging em uso. Crie ambiente isolado, suspenda escrita, copie o artefato aprovado, valide SHA-256 e integridade SQLite, execute restore com confirmação e rode health/readiness/smoke. Só então registre a evidência e descarte o ambiente de teste conforme a política.
