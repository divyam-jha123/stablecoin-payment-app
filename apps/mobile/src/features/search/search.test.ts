import { describe, expect, it } from 'vitest';
import {
  normalizeQuery,
  searchPages,
  searchPagesFor,
  searchRecipients,
  searchTransactions,
  upiIdFromQuery,
} from './search';

const recipients = [
  { id: '1', name: 'Chai Point', vpa: 'chaipoint@okaxis' },
  { id: '2', name: 'Blue Tokai Coffee', vpa: 'bluetokai@ybl' },
  { id: '3', name: 'Ravi Kumar', vpa: null },
];

describe('search', () => {
  it('normalizes and caps the query', () => {
    expect(normalizeQuery('  Chai  ')).toBe('chai');
    expect(normalizeQuery('a'.repeat(500))).toHaveLength(120);
  });

  it('matches names and UPI IDs, prefix matches first', () => {
    expect(searchRecipients(recipients, 'coffee').map((r) => r.id)).toEqual([
      '2',
    ]);
    expect(searchRecipients(recipients, 'okaxis').map((r) => r.id)).toEqual([
      '1',
    ]);
    expect(searchRecipients(recipients, 'kumar ravi').map((r) => r.id)).toEqual(
      ['3'],
    );
    expect(searchRecipients(recipients, 'i').map((r) => r.id)).toEqual([
      '1',
      '2',
      '3',
    ]);
    expect(searchRecipients(recipients, 'ra')[0]?.id).toBe('3');
    expect(searchRecipients(recipients, '   ')).toEqual([]);
  });

  it('reads typed and spoken UPI IDs', () => {
    expect(upiIdFromQuery('Shop@OKAXIS')).toBe('shop@okaxis');
    expect(upiIdFromQuery('ravi kumar at ybl')).toBe('ravikumar@ybl');
    expect(upiIdFromQuery('chai point')).toBeNull();
    expect(upiIdFromQuery('@ybl')).toBeNull();
  });

  it('finds app pages by title and keywords', () => {
    const titles = (query: string) =>
      searchPagesFor(searchPages, query).map((page) => page.title);
    expect(titles('activity')[0]).toBe('Activity');
    expect(titles('payments')[0]).toBe('Payments');
    expect(titles('profile')[0]).toBe('Profile');
    expect(titles('history')).toContain('Activity');
    expect(titles('dark mode')).toEqual(['Theme']);
    expect(titles('face id')).toEqual(['Security']);
    expect(titles('scan')[0]).toBe('Scan UPI QR');
    expect(titles('zzz')).toEqual([]);
  });

  it('finds transactions by name, category and amount', () => {
    const transactions = [
      {
        id: 'a',
        name: 'Starbucks',
        category: 'Food',
        direction: 'Sent',
        amount: 830,
      },
      {
        id: 'b',
        name: 'Ravi',
        category: 'Transfer',
        direction: 'Received',
        amount: 500,
      },
    ];
    const ids = (query: string) =>
      searchTransactions(transactions, query, (amount) => `₹${amount}`).map(
        (item) => item.id,
      );
    expect(ids('starbucks')).toEqual(['a']);
    expect(ids('food')).toEqual(['a']);
    expect(ids('received')).toEqual(['b']);
    expect(ids('₹500')).toEqual(['b']);
    expect(ids('')).toEqual([]);
  });
});
