import {
  createEVMClient,
  type MetamaskConnectEVM,
} from '@metamask/connect-evm';
import { Linking } from 'react-native';
import { TEMPO_CHAIN, TEMPO_CHAIN_HEX } from './tempo';
import { createWalletStore, type WalletAdapter } from './wallet-store';

let client: MetamaskConnectEVM | undefined;
let initializing: Promise<MetamaskConnectEVM> | undefined;
let generation = 0;
let linkFailure: ((error: Error) => void) | undefined;
const listeners = new Set<() => void>();

function openMetaMaskLink(url: string) {
  // Capture the active request: a late OS failure must not reject a newer one.
  const reject = linkFailure;
  void Linking.openURL(url).catch(() =>
    reject?.(
      new Error(
        'Could not open MetaMask. Install MetaMask Mobile, then try again.',
      ),
    ),
  );
}

async function getClient() {
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
      client = value;
      const changed = () => listeners.forEach((listener) => listener());
      const provider = value.getProvider();
      provider.on('accountsChanged', changed);
      provider.on('chainChanged', changed);
      provider.on('disconnect', changed);
      return value;
    })
    .catch((error: unknown) => {
      initializing = undefined;
      throw error;
    });
  return initializing;
}

async function walletRequest(action: () => Promise<unknown>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectLink: ((error: Error) => void) | undefined;
  try {
    await Promise.race([
      action(),
      new Promise<never>((_, reject) => {
        rejectLink = reject;
        linkFailure = rejectLink;
        timer = setTimeout(
          () =>
            reject(
              new Error(
                'MetaMask did not respond. Open MetaMask to finish or reject the pending request, then retry.',
              ),
            ),
          90_000,
        );
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
          openMetaMaskLink(uri);
        };
        // Headless mode emits this event instead of calling preferredOpenLink.
        // Register before connect: the SDK can emit the URI immediately.
        provider.on('display_uri', onPairingUri);
        removePairingListener = () =>
          provider.removeListener('display_uri', onPairingUri);
        await sdk.connect({ chainIds: [TEMPO_CHAIN_HEX] });
      });
    } finally {
      // Also clean up on timeout/OS failure while the SDK promise is pending.
      if (version === generation) ++generation;
      removePairingListener?.();
    }
  },
  switchToTempo: () =>
    walletRequest(async () => {
      const sdk = await getClient();
      await sdk.switchChain({
        chainId: TEMPO_CHAIN_HEX,
        chainConfiguration: {
          chainId: TEMPO_CHAIN_HEX,
          chainName: TEMPO_CHAIN.name,
          nativeCurrency: TEMPO_CHAIN.nativeCurrency,
          rpcUrls: [...TEMPO_CHAIN.rpcUrls.default.http],
          blockExplorerUrls: [TEMPO_CHAIN.blockExplorers.default.url],
        },
      });
    }),
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
  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const walletStore = createWalletStore(adapter);
