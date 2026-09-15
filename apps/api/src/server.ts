import { z } from 'zod';
import { createApiServer } from './app.js';

// Public scan infrastructure is active; payment creation and settlement remain disabled.
const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ENV: z
    .enum(['development', 'test', 'hackathon-demo'])
    .default('development'),
});
const config = environmentSchema.safeParse(process.env);
if (!config.success) {
  console.error(
    'Invalid PORT or APP_ENV. Production money movement is not supported.',
  );
  process.exit(1);
}

const server = createApiServer();

server.listen(config.data.PORT, '0.0.0.0', () => {
  console.info(
    JSON.stringify({
      event: 'api.started',
      port: config.data.PORT,
      paymentsEnabled: false,
    }),
  );
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close());
}
