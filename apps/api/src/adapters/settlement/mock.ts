import { initiateSettlementInputSchema } from './provider.js';
import type { FiatSettlementProvider, InitiateSettlementInput, SettlementResult } from './provider.js';

/** Simulates the provider response only; performs no conversion or money movement. */
export class MockFiatSettlementProvider implements FiatSettlementProvider {
  private readonly operations = new Map<string, { fingerprint: string; result: SettlementResult }>();
  private readonly keys = new Set<string>();

  async initiateSettlement(raw: InitiateSettlementInput): Promise<SettlementResult> {
    const input = initiateSettlementInputSchema.parse(raw);
    const fingerprint = JSON.stringify(input);
    const prior = this.operations.get(input.paymentId);
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw new Error('Settlement idempotency conflict');
      return { ...prior.result };
    }
    if (this.keys.has(input.idempotencyKey)) throw new Error('Settlement idempotency key already used');
    const result: SettlementResult = { id: `mock_settlement_${input.paymentId}`, paymentId: input.paymentId, status: 'SUCCEEDED', mode: 'mock', simulated: true };
    this.operations.set(input.paymentId, { fingerprint, result });
    this.keys.add(input.idempotencyKey);
    return { ...result };
  }
}
