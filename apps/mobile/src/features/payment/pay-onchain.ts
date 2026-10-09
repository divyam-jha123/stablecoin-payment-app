import { walletStore } from '../account/metamask';
import {
  keyCovers,
  paymentKeyStore,
  settlementAddress,
  transferCall,
} from '../account/payment-key';
import { publicClient } from '../account/tempo';
import { requiredPathUsdAtomic } from './amount';

/**
 * Pays a merchant from the traveller's own Tempo account into TravelPe's
 * settlement account. With tap to pay on and enough of today's limit left, the
 * on-device key signs it and MetaMask stays closed; otherwise this one payment
 * is approved in MetaMask. Resolves with the Tempo transaction hash.
 */
export async function payOnChain(input: {
  owner: string;
  inrAmount: string;
  reference: string;
}) {
  const settlement = settlementAddress();
  if (!settlement) {
    throw new Error(
      'Payments are unavailable: no TravelPe settlement account is set up for this build.',
    );
  }
  const amountAtomic = requiredPathUsdAtomic(input.inrAmount);
  const status = await paymentKeyStore.status(input.owner);
  if (keyCovers(status, amountAtomic)) {
    return paymentKeyStore.pay({
      key: status.key,
      settlement,
      amountAtomic,
      reference: input.reference,
    });
  }
  const hash = await walletStore.sendTransaction(
    transferCall({ settlement, amountAtomic, reference: input.reference }),
  );
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 90_000,
  });
  if (receipt.status !== 'success') {
    throw new Error('Tempo rejected the payment. No funds were moved.');
  }
  return hash;
}
