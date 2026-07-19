import { readDemoDataConfig, seedDemoData } from './demo-data';

try {
  const config = readDemoDataConfig('seed');
  await seedDemoData(config);
  console.log(
    JSON.stringify({
      ok: true,
      operation: 'demo-seed',
      dataset: 'consultoria-demo-presentation-v1',
      company: 'Empresa Horizonte Consultoria Demo',
      containsRealClientData: false,
      idempotentFixedIds: true,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      operation: 'demo-seed',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    }),
  );
  process.exitCode = 1;
}
