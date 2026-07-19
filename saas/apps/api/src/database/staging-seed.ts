import { readStagingDataConfig, seedStagingData } from './staging-data';

try {
  const config = readStagingDataConfig('seed');
  await seedStagingData(config);
  console.log(JSON.stringify({
    ok: true,
    operation: 'staging-seed',
    dataset: 'consultoria-staging-synthetic-v1',
    containsRealClientData: false,
  }));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    operation: 'staging-seed',
    error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
  }));
  process.exitCode = 1;
}
