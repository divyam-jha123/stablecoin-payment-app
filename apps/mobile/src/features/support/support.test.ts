import { describe, expect, it } from 'vitest';
import {
  createSupportTicketStore,
  DEFAULT_FAQ_COUNT,
  FAQS,
  findFaqs,
  SUPPORT_TICKETS_KEY,
  ticketReference,
  type TicketStorage,
} from './support';

function memoryStorage(initial: Record<string, string> = {}): TicketStorage {
  const data = { ...initial };
  return {
    getItem: async (key) => data[key] ?? null,
    setItem: async (key, value) => {
      data[key] = value;
    },
  };
}

const valid = {
  issueType: 'Transaction Issue',
  transaction: { id: 'p1', label: 'Sample Merchant - ₹250.00' },
  description: 'Payment failed but my balance went down.',
  attachmentUri: null,
};

describe('support', () => {
  it('shows the first FAQs until a search or topic is chosen', () => {
    expect(findFaqs('', null)).toEqual(FAQS.slice(0, DEFAULT_FAQ_COUNT));
    expect(
      findFaqs('', 'security').every((faq) => faq.topic === 'security'),
    ).toBe(true);
    expect(findFaqs('  LOSE my PHONE ', null).map((faq) => faq.id)).toEqual([
      'lost-phone',
    ]);
    expect(findFaqs('no such words here', null)).toEqual([]);
  });

  it('makes readable ticket references', () => {
    expect(ticketReference(() => 0)).toBe('TKT-AAAAAA');
    expect(ticketReference()).toMatch(/^TKT-[A-HJ-NP-Z2-9]{6}$/);
  });

  it('validates tickets before saving them', () => {
    const store = createSupportTicketStore();
    expect(
      store.add('0xabc', { ...valid, description: ' short ' }),
    ).toMatchObject({
      ok: false,
      error: 'Tell us a little more about the issue.',
    });
    expect(store.add('0xabc', { ...valid, issueType: 'Refund' }).ok).toBe(
      false,
    );
    const saved = store.add('0xabc', { ...valid, transaction: null }, 5);
    expect(saved).toMatchObject({
      ok: true,
      ticket: { owner: '0xabc', createdAt: 5, transaction: null },
    });
    expect(store.getSnapshot()).toHaveLength(1);
  });

  it('persists tickets and ignores corrupt saved entries', async () => {
    const storage = memoryStorage({
      [SUPPORT_TICKETS_KEY]: JSON.stringify([{ id: 1 }, 'bad']),
    });
    const store = createSupportTicketStore(storage);
    const result = store.add('ui-preview', valid, 10);
    await store.hydrate();
    expect(store.getSnapshot()).toHaveLength(1);

    const reloaded = createSupportTicketStore(storage);
    await reloaded.hydrate();
    expect(reloaded.getSnapshot()).toEqual([
      result.ok ? result.ticket : undefined,
    ]);
  });
});
