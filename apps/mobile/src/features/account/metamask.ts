import {
  createEVMClient,
  type MetamaskConnectEVM,
} from '@metamask/connect-evm';
import { Linking } from 'react-native';
import { accountAddress, TEMPO_CHAIN, TEMPO_CHAIN_HEX } from './tempo';
import { rememberedAccount } from './remembered-account';
import {
  createWalletStore,
  type StageListener,
  type WalletAdapter,
} from './wallet-store';
import { walletFlowLog } from './wallet-flow-log';
import { walletReturnUrl } from './wallet-return';

let client: MetamaskConnectEVM | undefined;
let initializing: Promise<MetamaskConnectEVM> | undefined;
let generation = 0;
let linkFailure: ((error: Error) => void) | undefined;
const listeners = new Set<() => void>();

function openMetaMaskLink(url: string) {
  // Capture the active request: a late OS failure must not reject a newer one.
  const reject = linkFailure;
  walletFlowLog.info('Opening MetaMask app via deep link');
  void Linking.openURL(url)
    .then(() => walletFlowLog.info('Android accepted MetaMask deep link'))
    .catch((cause: unknown) => {
      walletFlowLog.error('Android could not open MetaMask', cause);
      reject?.(
        new Error(
          'Could not open MetaMask. Install MetaMask Mobile, then try again.',
        ),
      );
    });
}

async function getClient() {
  if (!initializing) walletFlowLog.info('Initializing MetaMask Connect SDK');
  initializing ??= createEVMClient({
    dapp: {
      name: 'Traveller Pay',
      url: 'https://github.com/divyam-jha123/stablecoin-payment-app',
      nativeScheme: walletReturnUrl(),
    },
    api: {
      supportedNetworks: {
        [TEMPO_CHAIN_HEX]: TEMPO_CHAIN.rpcUrls.default.http[0],
      },
    },
    ui: { preferExtension: false, headless: true },
    mobile: {
      preferredOpenLink: openMetaMaskLink,
    },
    analytics: { enabled: false },
    // Native app: no browser extension discovery or DOM CustomEvent required.
    skipAutoAnnounce: true,
    debug: false,
  })
    .then((value) => {
      walletFlowLog.info('MetaMask Connect SDK ready');
      client = value;
      const changed = () => listeners.forEach((listener) => listener());
      const provider = value.getProvider();
      provider.on('accountsChanged', changed);
      provider.on('chainChanged', changed);
      provider.on('disconnect', changed);
      changed();
      return value;
    })
    .catch((error: unknown) => {
      walletFlowLog.error('MetaMask Connect SDK initialization failed', error);
      initializing = undefined;
      throw error;
    });
  return initializing;
}

async function walletRequest<T>(
  action: () => Promise<T>,
  timeoutMs = 90_000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectLink: ((error: Error) => void) | undefined;
  try {
    return await Promise.race([
      action(),
      new Promise<never>((_, reject) => {
        rejectLink = reject;
        linkFailure = rejectLink;
        timer = setTimeout(() => {
          walletFlowLog.error(
            'MetaMask request timed out',
            new Error(`${timeoutMs} milliseconds elapsed`),
          );
          reject(
            new Error(
              'MetaMask did not respond. Open MetaMask to finish or reject the pending request, then retry.',
            ),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    if (linkFailure === rejectLink) linkFailure = undefined;
  }
}

function isUnauthorized(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 4100
  );
}

async function withPairing<T>(
  action: (sdk: MetamaskConnectEVM) => Promise<T>,
  onStage?: StageListener,
  timeoutMs = 90_000,
): Promise<T | undefined> {
  const version = ++generation;
  let removePairingListener: (() => void) | undefined;
  try {
    return await walletRequest(async () => {
      onStage?.('preparing');
      const sdk = await getClient();
      if (version !== generation) return undefined;
      const provider = sdk.getProvider();
      const opened = new Set<string>();
      const onPairingUri = (uri: string) => {
        if (version !== generation || opened.has(uri)) return;
        opened.add(uri);
        walletFlowLog.info('MetaMask pairing request created');
        onStage?.('connecting');
        openMetaMaskLink(uri);
      };
      provider.on('display_uri', onPairingUri);
      removePairingListener = () =>
        provider.removeListener('display_uri', onPairingUri);
      onStage?.('connecting');
      return action(sdk);
    }, timeoutMs);
  } finally {
    if (version === generation) ++generation;
    removePairingListener?.();
  }
}

const adapter: WalletAdapter = {
  async connect(onStage) {
    try {
      await withPairing(async (sdk) => {
        walletFlowLog.info('Waiting for MetaMask connection approval');
        await sdk.connect({ chainIds: [TEMPO_CHAIN_HEX] });
        walletFlowLog.info('MetaMask connection approved');
      }, onStage);
    } catch (cause) {
      walletFlowLog.error('MetaMask connection failed', cause);
      throw cause;
    }
  },
  async connectAndSign(message, onStage) {
    const result = await withPairing(
      async (sdk) => {
        walletFlowLog.info(
          'Requesting combined MetaMask connection and sign-in',
        );
        onStage?.('combined');
        return sdk.connectAndSign({
          message,
          chainIds: [TEMPO_CHAIN_HEX],
        });
      },
      onStage,
      180_000,
    );
    if (!result) throw new Error('MetaMask connection was cancelled.');
    const address = accountAddress(result.accounts[0] ?? '');
    if (!/^0x[0-9a-f]+$/i.test(result.signature))
      throw new Error('MetaMask returned an invalid signature.');
    return {
      account: { address, chainId: Number(result.chainId) },
      signature: result.signature as `0x${string}`,
    };
  },
  async switchToTempo(onStage) {
    try {
      await walletRequest(async () => {
        onStage?.('network');
        const sdk = await getClient();
        walletFlowLog.info(
          'Requesting Tempo network switch or addition in MetaMask',
        );
        await sdk.switchChain({
          chainId: TEMPO_CHAIN_HEX,
          chainConfiguration: {
            chainId: TEMPO_CHAIN_HEX,
            chainName: TEMPO_CHAIN.name,
            // MetaMask requires 18 here when adding an EVM network. Tempo's
            // pathUSD token remains 6 decimals on-chain and in balance reads.
            nativeCurrency: { ...TEMPO_CHAIN.nativeCurrency, decimals: 18 },
            rpcUrls: [...TEMPO_CHAIN.rpcUrls.default.http],
            blockExplorerUrls: [TEMPO_CHAIN.blockExplorers.default.url],
          },
        });
        walletFlowLog.info('MetaMask accepted Tempo network request');
      });
    } catch (cause) {
      walletFlowLog.error('Tempo network switch or addition failed', cause);
      throw cause;
    }
  },
  async disconnect() {
    ++generation;
    await walletRequest(async () => {
      const sdk = client ?? (initializing ? await initializing : undefined);
      if (sdk) await sdk.disconnect();
    });
  },
  async account() {
    // Start the SDK on first read so a saved MetaMask session is restored
    // after a cold start. Don't wait long: the remembered account covers it.
    const sdk =
      client ??
      (await Promise.race([
        getClient().catch(() => undefined),
        new Promise<undefined>((resolve) => setTimeout(resolve, 750)),
      ]));
    const address = sdk?.getAccount();
    const chain = sdk?.getChainId();
    return address && chain ? { address, chainId: Number(chain) } : null;
  },
  async signMessage(message, onStage) {
    const sdk = await getClient();
    // Signed in from a previous launch but MetaMask's session lapsed.
    if (!sdk.getAccount()) await adapter.connect(onStage);
    const sign = () => {
      const address = sdk.getAccount();
      if (!address) throw new Error('Connect a wallet before signing in.');
      walletFlowLog.info('Requesting sign-in signature from MetaMask');
      onStage?.('signing');
      return walletRequest(() =>
        sdk.getProvider().request({
          method: 'personal_sign',
          params: [message, address],
        }),
      );
    };
    let signature: unknown;
    try {
      signature = await sign();
    } catch (cause) {
      if (!isUnauthorized(cause)) throw cause;
      // Adding Tempo in MetaMask selects it locally, but the session from the
      // first approval only covers chains MetaMask knew then. Ask again now
      // that Tempo exists so signing on Tempo is authorized.
      walletFlowLog.error('MetaMask has not authorized Tempo yet', cause);
      walletFlowLog.info('Requesting MetaMask approval for Tempo');
      await adapter.connect(onStage);
      signature = await sign();
    }
    if (typeof signature !== 'string' || !/^0x[0-9a-f]+$/i.test(signature)) {
      throw new Error('MetaMask returned an invalid signature.');
    }
    walletFlowLog.info('MetaMask returned sign-in signature');
    return signature as `0x${string}`;
  },
  async sendTransaction(call) {
    const sdk = await getClient();
    // Signed in from a previous launch but MetaMask's session lapsed.
    if (!sdk.getAccount()) await adapter.connect();
    const send = () => {
      const from = sdk.getAccount();
      if (!from) throw new Error('Connect a wallet before approving.');
      walletFlowLog.info('Requesting transaction approval from MetaMask');
      return walletRequest(() =>
        sdk.getProvider().request({
          method: 'eth_sendTransaction',
          params: [{ from, to: call.to, data: call.data }],
        }),
      );
    };
    let hash: unknown;
    try {
      hash = await send();
    } catch (cause) {
      if (!isUnauthorized(cause)) throw cause;
      // Same as signing: re-approve so the session covers Tempo, then retry.
      walletFlowLog.error('MetaMask has not authorized Tempo yet', cause);
      await adapter.connect();
      hash = await send();
    }
    if (typeof hash !== 'string' || !/^0x[0-9a-f]{64}$/i.test(hash)) {
      throw new Error('MetaMask returned an invalid transaction.');
    }
    walletFlowLog.info('MetaMask submitted the transaction');
    return hash as `0x${string}`;
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const walletStore = createWalletStore(adapter, rememberedAccount);
