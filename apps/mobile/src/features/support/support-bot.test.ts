import { describe, expect, it } from 'vitest';
import {
  greeting,
  inr,
  replyToOption,
  replyToText,
  type BotPayment,
} from './support-bot';

const payment: BotPayment = {
  id: 'p1',
  name: 'Sample Merchant',
  amount: 250,
  time: 'Today · 9:12 AM',
  status: 'Demo payment. Nothing was sent on-chain.',
  receiptId: 'p1',
};

describe('support bot', () => {
  it('greets by first name with the help menu', () => {
    expect(greeting('Rupesh')).toMatchObject({
      text: '👋 Hello Rupesh! How can I help you today?',
      options: {
        style: 'menu',
        items: ['status', 'security', 'failed', 'human'],
      },
    });
  });

  it('asks about the latest payment for failed payment help', () => {
    expect(inr(1234.5)).toBe('₹1,234.50');
    expect(replyToOption('failed', [payment])).toMatchObject({
      text: 'I can help with that! Is it about your payment of ₹250.00 to Sample Merchant?',
      options: { style: 'pills', items: ['failed-yes', 'failed-no'] },
    });
    expect(replyToOption('failed-yes', [payment]).actions).toEqual([
      { label: 'View receipt', receiptId: 'p1' },
      { label: 'Raise a Support Ticket', route: '/support-ticket' },
    ]);
  });

  it('never invents a payment when there are none', () => {
    for (const option of ['status', 'failed', 'failed-yes'] as const)
      expect(replyToOption(option, []).text).toContain(
        'can’t find any payments',
      );
  });

  it('points to a ticket instead of a live agent', () => {
    expect(replyToOption('human', []).actions).toEqual([
      { label: 'Raise a Support Ticket', route: '/support-ticket' },
    ]);
  });

  it('answers typed questions from the help articles', () => {
    expect(replyToText('Where is my receipt?').text).toContain('Activity');
    expect(replyToText('blorp').options?.style).toBe('menu');
  });
});
