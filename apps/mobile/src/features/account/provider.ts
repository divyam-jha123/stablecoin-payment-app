/** No custody or wallet SDK until the account decision and Android spike. */
export interface TempoAccountProvider {
  connect(): Promise<{ address: string; chainId: number }>;
  disconnect(): Promise<void>;
  getAccount(): Promise<{ address: string; chainId: number } | null>;
  submitTempoTransaction(input: {
    paymentId: string;
    tokenAddress: string;
    receiver: string;
    amountAtomic: string;
    memo: string;
    chainId: number;
  }): Promise<{ transactionHash: string }>;
}
