import { describe, expect, it } from 'vitest';
import {
  createTravelPeQr,
  parseTravelPeQr,
  travelPeIdForAddress,
  travelPePayeeName,
  travelPeRecipientAddress,
} from './travelpe-qr.js';

const request = {
  version: 1 as const,
  recipientId: 'divyam@travelpe',
  recipientName: 'Divyam Jha',
  currency: 'USDC' as const,
};

describe('TravelPe demo payment QR', () => {
  it('round trips the recipient, currency, optional INR amount and note', () => {
    const qr = createTravelPeQr({
      ...request,
      inrAmount: '250.50',
      note: 'Lunch & chai',
    });
    expect(qr).toContain('travelpe://pay?v=1&demo=1&');
    expect(parseTravelPeQr(qr)).toEqual({
      ...request,
      inrAmount: '250.50',
      note: 'Lunch & chai',
    });
  });

  it('keeps optional fields absent when no amount is requested', () => {
    expect(parseTravelPeQr(createTravelPeQr(request))).toEqual(request);
  });

  it('accepts a unique ID derived from a full wallet address', () => {
    const accountRequest = {
      ...request,
      recipientId: '1234567890123456789012345678901234567890@travelpe',
    };
    expect(parseTravelPeQr(createTravelPeQr(accountRequest))).toEqual(
      accountRequest,
    );
  });

  it('leaves the name out when the receiver has none', () => {
    const nameless = {
      version: 1 as const,
      recipientId: '1234567890123456789012345678901234567890@travelpe',
      currency: 'USDC' as const,
    };
    const qr = createTravelPeQr(nameless);
    expect(qr).not.toContain('name=');
    const parsed = parseTravelPeQr(qr);
    expect(parsed).toEqual(nameless);
    expect(travelPePayeeName(parsed)).toBe('0x1234…7890');
    expect(travelPePayeeName(request)).toBe('Divyam Jha');
  });

  it('maps a wallet address to its TravelPe ID and back', () => {
    const address = '0xAbCdEf0123456789aBcDeF0123456789AbCdEf01';
    const id = travelPeIdForAddress(address);
    expect(id).toBe('abcdef0123456789abcdef0123456789abcdef01@travelpe');
    expect(travelPeRecipientAddress(id)).toBe(address.toLowerCase());
    expect(travelPeRecipientAddress('divyam@travelpe')).toBeNull();
    expect(() => travelPeIdForAddress('0x1234')).toThrow();
  });

  it.each([
    'travelpe://pay?v=2&demo=1&to=divyam%40travelpe&name=Divyam&currency=USDC',
    'travelpe://pay?v=1&demo=1&to=divyam%40travelpe&name=Divyam&currency=BTC',
    'travelpe://pay?v=1&demo=1&to=divyam%40travelpe&name=Divyam&currency=USDC&am=0',
    'travelpe://pay?v=1&demo=1&to=divyam%40travelpe&name=Divyam&currency=USDC&am=1&am=2',
    'travelpe://pay?v=1&demo=1&to=divyam%40travelpe&name=Divyam&currency=USDC&extra=1',
    'travelpe://collect?v=1&demo=1&to=divyam%40travelpe&name=Divyam&currency=USDC',
    'travelpe://pay?v=1&to=divyam%40travelpe&name=Divyam&currency=USDC',
    'travelpe://pay?v=1&demo=1&to=divyam%40travelpe&name=&currency=USDC',
  ])('rejects invalid or unsupported details: %s', (qr) => {
    expect(() => parseTravelPeQr(qr)).toThrow();
  });
});
