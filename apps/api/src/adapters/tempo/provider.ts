export interface GetBalanceInput {
  accountAddress: string;
  tokenAddress: string;
}

export interface Balance {
  tokenAddress: string;
  amountAtomic: string;
  decimals: number;
}

export interface VerifyTempoPaymentInput {
  paymentId: string;
  transactionHash: string;
  expected: {
    chainId: number;
    sender: string;
    receiver: string;
    tokenAddress: string;
    amountAtomic: string;
    memo: string;
    expiresAt: string;
  };
}

export interface VerifiedPayment {
  paymentId: string;
  transactionHash: string;
  chainId: number;
  blockHash: string;
  blockNumber: string;
  blockTimestamp: string;
  logIndex: number;
  sender: string;
  receiver: string;
  tokenAddress: string;
  amountAtomic: string;
  memo: string;
}

export interface TempoProvider {
  getBalance(input: GetBalanceInput): Promise<Balance>;
  verifyPayment(input: VerifyTempoPaymentInput): Promise<VerifiedPayment>;
}

/** Explicitly unavailable. A successful mock must never impersonate Tempo. */
export class UnconfiguredTempoProvider implements TempoProvider {
  getBalance(): Promise<Balance> {
    return Promise.reject(new Error('Tempo balance integration is not configured'));
  }

  verifyPayment(): Promise<VerifiedPayment> {
    return Promise.reject(new Error('Tempo verification is not implemented'));
  }
}
