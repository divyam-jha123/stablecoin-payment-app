import type { IncomingMessage } from 'node:http';

export class RequestBodyError extends Error {
  constructor(
    readonly code: 'INVALID_JSON' | 'PAYLOAD_TOO_LARGE',
    message: string,
  ) {
    super(message);
    this.name = 'RequestBodyError';
  }
}

export async function readJsonBody(
  request: IncomingMessage,
  maximumBytes = 8_192,
): Promise<unknown> {
  const declaredLength = Number(request.headers['content-length']);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new RequestBodyError(
      'PAYLOAD_TOO_LARGE',
      'Request body is too large',
    );
  }

  const chunks: Buffer[] = [];
  let byteLength = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > maximumBytes) {
      throw new RequestBodyError(
        'PAYLOAD_TOO_LARGE',
        'Request body is too large',
      );
    }
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new RequestBodyError(
      'INVALID_JSON',
      'Request body must be valid JSON',
    );
  }
}
