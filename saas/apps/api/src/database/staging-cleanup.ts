import { cleanupStagingData, readStagingDataConfig } from './staging-data';

try {
  const config = readStagingDataConfig('cleanup');
  cleanupStagingData(config);
  console.log(JSON.stringify({
    ok: true,
    operation: 'staging-cleanup',
    dataset: 'consultoria-staging-synthetic-v1',
    deletedOnlyFixedSyntheticIds: true,
  }));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    operation: 'staging-cleanup',
    error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
  }));
  process.exitCode = 1;
}
