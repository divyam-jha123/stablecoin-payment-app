import { useRef, useState, useSyncExternalStore } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { walletStore } from './metamask';
import { DEVICE_PIN_OWNER, pinStore } from './payment-pin';
import { rememberedAccount } from './remembered-account';
import { recordLoginActivity } from './login-activity-store';
import {
  authenticateWallet,
  requestSignInChallenge,
  verifySignInChallenge,
} from './session';
import { TEMPO_CHAIN } from './tempo';
import { walletError, type ConnectStage } from './wallet-store';
import { walletFlowLog } from './wallet-flow-log';
import { returnFromWallet } from './wallet-return';
import { uiPreviewEnabled } from '../../ui-preview';

export const stageText: Record<ConnectStage, string> = {
  preparing: 'Preparing MetaMask connection…',
  connecting: 'Approve the connection in MetaMask, then return here.',
  combined: 'Approve connection and sign-in in MetaMask, then return here.',
  network: 'Approve Tempo testnet in MetaMask, then return here.',
  'checking-session': 'Checking your existing sign-in…',
  challenge: 'Preparing your secure sign-in…',
  signing: 'Confirm your sign-in in MetaMask, then return here.',
  verifying: 'Verifying your wallet signature…',
  saving: 'Saving your sign-in…',
};

function canRetryCombined(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error))
    return false;
  return (
    error.code === 4100 ||
    error.code === 4902 ||
    error.code === -32601 ||
    error.code === -32602
  );
}

/** Text for the in-progress state of a MetaMask sign-in. */
export function connectStatusText(stage: ConnectStage | null) {
  return stage ? stageText[stage] : 'Connecting to MetaMask…';
}

/**
 * MetaMask connection and backend sign-in, shared by the login screen and by
 * Home, so a signed-in traveller can connect a wallet without going back.
 * `onDone` runs after sign-in; by default it opens Home. PIN setup belongs to Google signup or payment settings.
 */
export function useWalletSignIn(options?: { onDone?: () => void }) {
  const queryClient = useQueryClient();
  const wallet = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
  );
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<ConnectStage | null>(null);
  const lock = useRef(false);

  function finish() {
    if (options?.onDone) options.onDone();
    else router.replace('/home');
  }

  async function signIn() {
    if (uiPreviewEnabled) {
      finish();
      return;
    }
    if (lock.current || walletStore.getSnapshot().busy) return;
    walletFlowLog.begin();
    lock.current = true;
    setSigning(true);
    setError(null);
    setStage('preparing');
    try {
      let combined:
        | {
            account: { address: string; chainId: number };
            signature: `0x${string}`;
            challenge: Awaited<ReturnType<typeof requestSignInChallenge>>;
          }
        | undefined;
      const remembered = await rememberedAccount.load();
      const liveAccount = remembered
        ? await walletStore.liveAccount()
        : walletStore.getSnapshot().account;
      if (remembered && !liveAccount && walletStore.connectAndSign) {
        const challenge = await requestSignInChallenge(remembered, setStage);
        try {
          const signed = await walletStore.connectAndSign(
            challenge.message,
            setStage,
          );
          if (signed.account.address.toLowerCase() !== remembered.toLowerCase())
            throw new Error(
              'MetaMask selected a different account. Sign in with the wallet you used before.',
            );
          combined = { ...signed, challenge };
          await walletStore.refresh();
        } catch (cause) {
          if (!canRetryCombined(cause)) throw cause;
          walletFlowLog.info(
            'Combined sign-in unavailable; using wallet approval steps',
          );
        }
      }
      if (!combined && !liveAccount) {
        walletFlowLog.info('Starting MetaMask connection');
        await walletStore.connect(setStage);
      } else if (!combined && liveAccount?.chainId !== TEMPO_CHAIN.id) {
        walletFlowLog.info('Wallet connected; requesting Tempo network');
        await walletStore.switchToTempo(setStage);
      } else if (!combined) {
        walletFlowLog.info('Wallet already connected on Tempo');
        await walletStore.refresh();
      }
      if (combined && combined.account.chainId !== TEMPO_CHAIN.id)
        await walletStore.switchToTempo(setStage);
      const current = walletStore.getSnapshot();
      if (!current.account || current.account.chainId !== TEMPO_CHAIN.id) {
        throw new Error(
          current.error ?? 'Connect MetaMask on Tempo testnet to continue.',
        );
      }
      walletFlowLog.info('Wallet account confirmed on Tempo testnet');
      const account = current.account;
      if (
        combined &&
        account.address.toLowerCase() !== combined.account.address.toLowerCase()
      )
        throw new Error(
          'Your wallet changed during sign-in. Please try again.',
        );
      // Cancel a pending restore so it cannot overwrite this sign-in result.
      walletFlowLog.info('Cancelling any pending session check');
      await queryClient.cancelQueries({ queryKey: ['session'] });
      walletFlowLog.info('Starting backend wallet sign-in');
      if (combined)
        await verifySignInChallenge(
          account,
          combined.challenge,
          combined.signature,
          setStage,
        );
      else await authenticateWallet(account, walletStore.signMessage, setStage);
      walletFlowLog.info('Backend wallet sign-in completed');
      await walletStore.refresh();
      const after = walletStore.getSnapshot().account;
      if (
        after?.address.toLowerCase() !== account.address.toLowerCase() ||
        after.chainId !== account.chainId
      ) {
        throw new Error(
          'Your wallet changed during sign-in. Please try again.',
        );
      }
      walletFlowLog.info('Wallet still matches signed-in account');
      // Next launch opens straight to Home, behind the app lock.
      await rememberedAccount.remember(account.address);
      recordLoginActivity('sign-in', account.address);
      queryClient.setQueryData(
        ['session', account.address, account.chainId],
        true,
      );
      await pinStore
        .adopt(account.address, DEVICE_PIN_OWNER)
        .catch(() => undefined);
      walletFlowLog.info('Session marked ready; opening next screen');
      finish();
      void returnFromWallet();
    } catch (cause) {
      walletFlowLog.error('Sign-in stopped', cause);
      walletFlowLog.stop();
      setError(walletError(cause));
      void returnFromWallet();
    } finally {
      setSigning(false);
      setStage(null);
      lock.current = false;
    }
  }

  return {
    signIn,
    signing,
    busy: signing || wallet.busy,
    stage,
    error: error ?? wallet.error ?? null,
  };
}
