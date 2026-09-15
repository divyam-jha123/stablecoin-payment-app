import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AppState, Button, Linking, ScrollView, Text } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { walletStore } from '../src/features/account/metamask';
import { TEMPO_CHAIN, tempoService } from '../src/features/account/tempo';
import { walletError } from '../src/features/account/wallet-store';

export default function Connect() {
  const wallet = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
  );
  const address = wallet.account?.address;
  const onTempo = wallet.account?.chainId === TEMPO_CHAIN.id;
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [funding, setFunding] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<{
    address: string;
    text: string;
  } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const fundingLock = useRef(false);

  useEffect(() => walletStore.start(), []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      void walletStore.refresh();
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      if (state === 'active') void walletStore.refresh();
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);

  const balance = useQuery({
    queryKey: ['tempo-pathUSD', address, wallet.account?.chainId],
    queryFn: () => tempoService.balance(address!),
    enabled: Boolean(address && onTempo && focused && active && !wallet.busy),
    retry: false,
    refetchInterval: focused && active ? 15_000 : false,
    staleTime: 0,
  });

  async function fund() {
    const current = walletStore.getSnapshot();
    if (
      !address ||
      !onTempo ||
      current.busy ||
      fundingLock.current ||
      cooldown > 0 ||
      current.account?.address !== address ||
      current.account.chainId !== TEMPO_CHAIN.id
    )
      return;
    fundingLock.current = true;
    setFunding(true);
    setCooldown(60);
    setNotice(null);
    try {
      const hashes = await tempoService.fund(address);
      setNotice({
        address,
        text: `Faucet request accepted (${hashes.length} transaction(s)). This is not confirmation yet. Refresh the balance to check delivery.\n${hashes.join('\n')}`,
      });
      if (walletStore.getSnapshot().account?.address === address)
        await balance.refetch();
    } catch (error) {
      setNotice({
        address,
        text: `Faucet request could not be confirmed: ${walletError(error)} Refresh the balance before retrying; the request may have reached the network.`,
      });
    } finally {
      fundingLock.current = false;
      setFunding(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text accessibilityRole="header">Connect MetaMask Mobile</Text>
        <Text>
          Use a disposable developer-controlled wallet. Only Tempo Moderato
          testnet is supported here. Test assets have no monetary value; no INR
          is transferred.
        </Text>
        <Text>
          Create the wallet in MetaMask. Never enter your recovery phrase or
          private key in Traveller Pay. Connecting a wallet is not backend
          sign-in.
        </Text>
        <Button
          title="Install MetaMask"
          onPress={() => {
            setLinkError(null);
            void Linking.openURL('https://metamask.io/download/').catch(() =>
              setLinkError(
                'Could not open the download page. Install MetaMask from its official website or app-store listing.',
              ),
            );
          }}
        />
        {linkError && <Text accessibilityRole="alert">{linkError}</Text>}
        {!wallet.account && (
          <Button
            title={wallet.busy ? 'Waiting for MetaMask…' : 'Connect MetaMask'}
            disabled={wallet.busy || funding}
            onPress={() => {
              void walletStore.connect();
            }}
          />
        )}
        {wallet.busy && (
          <Text accessibilityLiveRegion="polite">
            Approve the request in MetaMask, then return here. If you cancel
            here, also reject any pending request in MetaMask.
          </Text>
        )}
        {wallet.error && <Text accessibilityRole="alert">{wallet.error}</Text>}
        {wallet.account && (
          <>
            <Text selectable>Account: {address}</Text>
            <Text>
              Network:{' '}
              {onTempo
                ? 'Tempo Moderato testnet (42431)'
                : `Unsupported network (${wallet.account.chainId})`}
            </Text>
            {!onTempo && (
              <Button
                title="Switch to Tempo testnet"
                disabled={wallet.busy || funding}
                onPress={() => {
                  void walletStore.switchToTempo();
                }}
              />
            )}
            {onTempo && (
              <>
                <Text accessibilityLiveRegion="polite">
                  {balance.isError
                    ? 'Balance unavailable. Check your connection and refresh.'
                    : balance.data !== undefined
                      ? `${balance.data} pathUSD (test balance)`
                      : 'Reading pathUSD balance…'}
                </Text>
                {balance.isError && <Text>{walletError(balance.error)}</Text>}
                <Button
                  title={balance.isFetching ? 'Refreshing…' : 'Refresh balance'}
                  disabled={balance.isFetching || wallet.busy}
                  onPress={() => {
                    void balance.refetch();
                  }}
                />
                <Button
                  title={
                    funding
                      ? 'Requesting test funds…'
                      : cooldown > 0
                        ? `Request test funds again in ${cooldown}s`
                        : 'Get free testnet funds'
                  }
                  disabled={wallet.busy || funding || cooldown > 0}
                  onPress={() => {
                    void fund();
                  }}
                />
                {notice && notice.address === address && (
                  <Text selectable accessibilityLiveRegion="polite">
                    {notice.text}
                  </Text>
                )}
              </>
            )}
          </>
        )}
        {(wallet.account || wallet.busy) && (
          <Button
            title={wallet.busy ? 'Cancel connection' : 'Disconnect'}
            disabled={funding}
            onPress={() => {
              setNotice(null);
              void walletStore.disconnect();
            }}
          />
        )}
        <Link href="/scanner">Scan a merchant QR</Link>
      </ScrollView>
    </SafeAreaView>
  );
}
