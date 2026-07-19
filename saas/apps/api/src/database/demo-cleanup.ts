import { cleanupDemoData, readDemoDataConfig } from './demo-data';

try {
  const config = readDemoDataConfig('cleanup');
  cleanupDemoData(config);
  console.log(
    JSON.stringify({
      ok: true,
      operation: 'demo-cleanup',
      dataset: 'consultoria-demo-presentation-v1',
      deletedOnlyFixedSyntheticIds: true,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      operation: 'demo-cleanup',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    }),
  );
  process.exitCode = 1;
}
