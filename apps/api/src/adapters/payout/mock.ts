import { createPayoutInputSchema } from './provider.js';
import type { CreatePayoutInput, PayoutProvider, PayoutResult, PayoutStatus } from './provider.js';

/** In-memory fixture only. Not connected to HTTP; durable orchestration is Week 3. */
export class MockPayoutProvider implements PayoutProvider {
  private readonly operations = new Map<string, { fingerprint: string; result: PayoutResult }>();
  private readonly keys = new Map<string, string>();

  async createPayout(raw: CreatePayoutInput): Promise<PayoutResult> {
    const input = createPayoutInputSchema.parse(raw);
    const fingerprint = JSON.stringify(input);
    const prior = this.operations.get(input.paymentId);
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw new Error('Payout idempotency conflict');
      return { ...prior.result };
    }
    if (this.keys.has(input.idempotencyKey)) throw new Error('Payout idempotency key already used');
    const result: PayoutResult = {
      id: `mock_payout_${input.paymentId}`,
      paymentId: input.paymentId,
      status: 'SUCCEEDED',
      mode: 'mock',
      simulated: true,
    };
    this.operations.set(input.paymentId, { fingerprint, result });
    this.keys.set(input.idempotencyKey, input.paymentId);
    return { ...result };
  }

  async getPayoutStatus(id: string): Promise<PayoutStatus> {
    for (const { result } of this.operations.values()) {
      if (result.id === id) return result.status;
    }
    throw new Error('Unknown mock payout');
  }
}
