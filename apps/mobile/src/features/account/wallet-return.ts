import { AppState, Linking } from 'react-native';
import { createURL } from 'expo-linking';
import { walletFlowLog } from './wallet-flow-log';

// Expo Go uses an exp:// URL; installed builds use travellerpay://.
export function walletReturnUrl() {
  return createURL('wallet-return');
}

/** Ask the OS to foreground this app once sign-in has finished. */
export async function returnFromWallet() {
  if (AppState.currentState === 'active') return;
  try {
    await Linking.openURL(walletReturnUrl());
    walletFlowLog.info('Requested return to TravelPay');
  } catch (cause) {
    // A failed foreground request must not discard a verified sign-in.
    walletFlowLog.error(
      'Automatic return unavailable; return to the app manually',
      cause,
    );
  }
}
