import { describe, expect, it, vi } from 'vitest';
import {
  createPublicClient,
  custom,
  encodeFunctionResult,
  toFunctionSelector,
} from 'viem';
import { Abis } from 'viem/tempo';
import { createTempoService, TEMPO_CHAIN, TEMPO_CHAIN_HEX } from './tempo';

const address = '0x1234567890123456789012345678901234567890';
const hash = `0x${'a'.repeat(64)}`;
function fixture({
  chain = TEMPO_CHAIN_HEX as string,
  symbol = 'PathUSD',
  decimals = 6,
  currency = 'USD',
  code = '0xef',
  amount = 1234567n,
  hashes = [hash] as unknown,
} = {}) {
  const request = vi.fn(
    async ({
      method,
      params,
    }: {
      method: string;
      params?: readonly unknown[];
    }) => {
      if (method === 'eth_chainId') return chain;
      if (method === 'eth_getCode') return code;
      if (method === 'tempo_fundAddress') return hashes;
      if (method === 'eth_call') {
        const call = params?.[0] as { data: string; to: string };
        expect(call.to.toLowerCase()).toBe(
          '0x20c0000000000000000000000000000000000000',
        );
        const selector = call.data.slice(0, 10);
        if (selector === toFunctionSelector('currency()'))
          return encodeFunctionResult({
            abi: Abis.tip20,
            functionName: 'currency',
            result: currency,
          });
        if (selector === toFunctionSelector('symbol()'))
          return encodeFunctionResult({
            abi: Abis.tip20,
            functionName: 'symbol',
            result: symbol,
          });
        if (selector === toFunctionSelector('decimals()'))
          return encodeFunctionResult({
            abi: Abis.tip20,
            functionName: 'decimals',
            result: decimals,
          });
        if (selector === toFunctionSelector('balanceOf(address)'))
          return encodeFunctionResult({
            abi: Abis.tip20,
            functionName: 'balanceOf',
            result: amount,
          });
      }
      throw new Error(`Unexpected RPC: ${method}`);
    },
  );
  const client = createPublicClient({
    chain: TEMPO_CHAIN,
    transport: custom({ request }, { retryCount: 0 }),
  });
  return { service: createTempoService(client), request };
}

describe('Tempo testnet balance and faucet', () => {
  it('accepts the live Moderato PathUSD metadata for balance and faucet checks', async () => {
    // Observed read-only on Moderato: code=0xef, symbol=PathUSD, decimals=6, currency=USD.
    const { service } = fixture();
    expect(await service.balance(address)).toBe('1.234567');
    expect(await service.fund(address)).toEqual([hash]);
  });
  it('matches the chain ID used in wallet requests', () =>
    expect(Number(TEMPO_CHAIN_HEX)).toBe(TEMPO_CHAIN.id));
  it('reads six-decimal balances without floating-point rounding', async () => {
    expect(await fixture().service.balance(address)).toBe('1.234567');
    expect(
      await fixture({ amount: 9007199254740993123456n }).service.balance(
        address,
      ),
    ).toBe('9007199254740993.123456');
    expect(await fixture({ amount: 0n }).service.balance(address)).toBe('0');
  });
  it.each([
    { symbol: 'USDC' },
    { symbol: 'pathUSD' },
    { decimals: 18 },
    { currency: 'EUR' },
    { code: '0x' },
  ])('rejects mismatched token metadata %j', async (options) => {
    await expect(fixture(options).service.balance(address)).rejects.toThrow(
      /metadata/,
    );
    const { service, request } = fixture(options);
    await expect(service.fund(address)).rejects.toThrow(/metadata/);
    expect(
      request.mock.calls.some(([call]) => call.method === 'tempo_fundAddress'),
    ).toBe(false);
  });
  it('refuses reads and faucet requests on any other RPC network', async () => {
    const { service, request } = fixture({ chain: '0x1' });
    await expect(service.balance(address)).rejects.toThrow(/not connected/);
    await expect(service.fund(address)).rejects.toThrow(/not connected/);
    expect(
      request.mock.calls.every(([call]) => call.method === 'eth_chainId'),
    ).toBe(true);
  });
  it('only submits the public address to the testnet faucet once', async () => {
    const { service, request } = fixture();
    expect(await service.fund(address)).toEqual([hash]);
    expect(
      request.mock.calls
        .map(([call]) => call)
        .filter((call) => call.method === 'tempo_fundAddress'),
    ).toEqual([{ method: 'tempo_fundAddress', params: [address] }]);
  });
  it.each([[], ['bad'], null])(
    'does not report malformed faucet results as accepted: %j',
    async (hashes) => {
      await expect(fixture({ hashes }).service.fund(address)).rejects.toThrow(
        /no valid/,
      );
    },
  );
  it('rejects invalid addresses before any RPC request', async () => {
    const { service, request } = fixture();
    await expect(service.fund('secret')).rejects.toThrow(/invalid/);
    expect(request).not.toHaveBeenCalled();
  });
  it('does not turn an RPC outage into a zero balance', async () => {
    const { service, request } = fixture();
    request.mockRejectedValue(new Error('offline'));
    await expect(service.balance(address)).rejects.toThrow(/offline/);
  });
});
