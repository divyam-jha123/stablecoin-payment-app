import { createServer } from 'node:http';
import { z } from 'zod';

// Health-only bootstrap. The proposed Express/payment service is not wired yet.
const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ENV: z.enum(['development', 'test', 'hackathon-demo']).default('development'),
});
const config = environmentSchema.safeParse(process.env);
if (!config.success) {
  console.error('Invalid PORT or APP_ENV. Production money movement is not supported.');
  process.exit(1);
}

const server = createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200);
    response.end(JSON.stringify({ status: 'ok', service: 'traveller-api', paymentsEnabled: false, settlementMode: 'mock' }));
    return;
  }
  response.writeHead(404);
  response.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'This route is not available in the scaffold.' } }));
});

server.listen(config.data.PORT, '0.0.0.0', () => {
  console.info(JSON.stringify({ event: 'api.started', port: config.data.PORT, paymentsEnabled: false }));
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close());
}
