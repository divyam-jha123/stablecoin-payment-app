import { z } from 'zod';
import { createApiServer } from './app.js';
import { configureAuth, minimumSessionSecretLength } from './auth.js';

// Public scan infrastructure is active; payment creation and settlement remain disabled.
const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ENV: z
    .enum(['development', 'test', 'hackathon-demo'])
    .default('development'),
  // An empty value (as in .env.example) counts as unset.
  SESSION_SECRET: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(minimumSessionSecretLength).optional(),
  ),
});
const config = environmentSchema.safeParse(process.env);
if (!config.success) {
  console.error(
    `Invalid PORT, APP_ENV or SESSION_SECRET (at least ${minimumSessionSecretLength} characters). Production money movement is not supported.`,
  );
  process.exit(1);
}

if (config.data.SESSION_SECRET) {
  configureAuth({ sessionSecret: config.data.SESSION_SECRET });
} else if (config.data.APP_ENV === 'hackathon-demo') {
  // A per-process key would sign everyone out on every restart.
  console.error(
    'Set SESSION_SECRET to keep sign-in sessions valid across restarts.',
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
      persistentSessions: Boolean(config.data.SESSION_SECRET),
    }),
  );
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close());
}
