import {
  createEVMClient,
  type MetamaskConnectEVM,
} from '@metamask/connect-evm';
import { Linking } from 'react-native';
import { TEMPO_CHAIN, TEMPO_CHAIN_HEX } from './tempo';
import { createWalletStore, type WalletAdapter } from './wallet-store';
import { walletFlowLog } from './wallet-flow-log';

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
      return value;
    })
    .catch((error: unknown) => {
      walletFlowLog.error('MetaMask Connect SDK initialization failed', error);
      initializing = undefined;
      throw error;
    });
  return initializing;
}

async function walletRequest<T>(action: () => Promise<T>): Promise<T> {
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
            new Error('90 seconds elapsed'),
          );
          reject(
            new Error(
              'MetaMask did not respond. Open MetaMask to finish or reject the pending request, then retry.',
            ),
          );
        }, 90_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    if (linkFailure === rejectLink) linkFailure = undefined;
  }
}

const adapter: WalletAdapter = {
  async connect() {
    const version = ++generation;
    let removePairingListener: (() => void) | undefined;
    try {
      await walletRequest(async () => {
        const sdk = await getClient();
        if (version !== generation) return;
        const provider = sdk.getProvider();
        const opened = new Set<string>();
        const onPairingUri = (uri: string) => {
          if (version !== generation || opened.has(uri)) return;
          opened.add(uri);
          walletFlowLog.info('MetaMask pairing request created');
          openMetaMaskLink(uri);
        };
        // Headless mode emits this event instead of calling preferredOpenLink.
        // Register before connect: the SDK can emit the URI immediately.
        provider.on('display_uri', onPairingUri);
        removePairingListener = () =>
          provider.removeListener('display_uri', onPairingUri);
        walletFlowLog.info('Waiting for MetaMask connection approval');
        await sdk.connect({ chainIds: [TEMPO_CHAIN_HEX] });
        walletFlowLog.info('MetaMask connection approved');
      });
    } catch (cause) {
      walletFlowLog.error('MetaMask connection failed', cause);
      throw cause;
    } finally {
      // Also clean up on timeout/OS failure while the SDK promise is pending.
      if (version === generation) ++generation;
      removePairingListener?.();
    }
  },
  async switchToTempo() {
    try {
      await walletRequest(async () => {
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
    const address = client?.getAccount();
    const chain = client?.getChainId();
    return address && chain ? { address, chainId: Number(chain) } : null;
  },
  async signMessage(message) {
    const sdk = await getClient();
    const address = sdk.getAccount();
    if (!address) throw new Error('Connect a wallet before signing in.');
    walletFlowLog.info('Requesting sign-in signature from MetaMask');
    const signature = await walletRequest(() =>
      sdk.getProvider().request({
        method: 'personal_sign',
        params: [message, address],
      }),
    );
    if (typeof signature !== 'string' || !/^0x[0-9a-f]+$/i.test(signature)) {
      throw new Error('MetaMask returned an invalid signature.');
    }
    walletFlowLog.info('MetaMask returned sign-in signature');
    return signature as `0x${string}`;
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const walletStore = createWalletStore(adapter);
