import { router } from 'expo-router';
import { pinStore } from '../account/payment-pin';
import { pinOwner } from '../account/pin-owner';
import { paymentParams, type PaymentRequest } from './payment-authorization';

/**
 * Asks for the payment PIN (or to set one first) before this payment runs.
 * The PIN screen grants the approval that processing needs.
 */
export async function openPaymentPin(request: PaymentRequest) {
  const owner = pinOwner();
  const hasPin = owner
    ? await pinStore.hasPin(owner).catch(() => false)
    : false;
  router.push({
    pathname: hasPin ? '/pin-entry' : '/pin-setup',
    params: { mode: 'verify', next: 'pay', ...paymentParams(request) },
  });
}
