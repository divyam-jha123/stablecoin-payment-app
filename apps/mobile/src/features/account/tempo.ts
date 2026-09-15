import {
  createPublicClient,
  formatUnits,
  http,
  isAddress,
  type Address,
  type PublicClient,
  type Transport,
} from 'viem';
import { tempoModerato } from 'viem/chains';
import { Abis, Actions } from 'viem/tempo';

export const TEMPO_CHAIN = tempoModerato;
export const TEMPO_CHAIN_HEX = '0xa5bf' as const;
export const PATH_USD = '0x20c0000000000000000000000000000000000000' as const;

export const publicClient = createPublicClient({
  chain: TEMPO_CHAIN,
  transport: http(TEMPO_CHAIN.rpcUrls.default.http[0], {
    timeout: 10_000,
    retryCount: 0,
  }),
});

export function accountAddress(value: string): Address {
  if (!isAddress(value))
    throw new Error('The wallet returned an invalid account address.');
  return value;
}

// Inject the RPC client for deterministic offline tests. No signing client or key is needed.
export function createTempoService(
  client: PublicClient<Transport, typeof TEMPO_CHAIN> = publicClient,
) {
  async function verifyTestnet() {
    if ((await client.getChainId()) !== TEMPO_CHAIN.id) {
      throw new Error('The RPC is not connected to Tempo Moderato testnet.');
    }
    const [code, symbol, decimals, currency] = await Promise.all([
      client.getCode({ address: PATH_USD }),
      client.readContract({
        address: PATH_USD,
        abi: Abis.tip20,
        functionName: 'symbol',
      }),
      client.readContract({
        address: PATH_USD,
        abi: Abis.tip20,
        functionName: 'decimals',
      }),
      client.readContract({
        address: PATH_USD,
        abi: Abis.tip20,
        functionName: 'currency',
      }),
    ]);
    if (
      !code ||
      code === '0x' ||
      // Moderato's live token reports "PathUSD", unlike older docs' "pathUSD".
      symbol !== 'PathUSD' ||
      decimals !== 6 ||
      currency !== 'USD'
    ) {
      throw new Error(
        'The test token contract or metadata does not match pathUSD.',
      );
    }
  }

  return {
    async balance(address: string) {
      const account = accountAddress(address);
      await verifyTestnet();
      const amount = await client.readContract({
        address: PATH_USD,
        abi: Abis.tip20,
        functionName: 'balanceOf',
        args: [account],
      });
      return formatUnits(amount, 6);
    },
    async fund(address: string) {
      const account = accountAddress(address);
      await verifyTestnet();
      const hashes = await Actions.faucet.fund(client, { account });
      if (
        !Array.isArray(hashes) ||
        hashes.length === 0 ||
        hashes.some((hash) => !/^0x[\da-f]{64}$/i.test(hash))
      ) {
        throw new Error(
          'The faucet returned no valid transaction hashes. Refresh the balance before retrying.',
        );
      }
      return hashes;
    },
  };
}

export const tempoService = createTempoService();
