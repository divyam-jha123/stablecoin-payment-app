/** Future payment-signing contract. MetaMask connection is implemented separately;
 * backend authentication and transaction submission are not implemented yet. */
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
