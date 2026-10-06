export const ILLUSTRATIVE_INR_PER_PATH_USD = '83.00';

const PATH_USD_DECIMALS = 6;

function decimalToAtomic(value: string, decimals: number): bigint {
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(value)) {
    throw new Error('Amount must be a positive decimal');
  }

  const [whole = '0', fraction = ''] = value.split('.');
  if (fraction.length > decimals) {
    throw new Error(`Amount supports up to ${decimals} decimal places`);
  }

  return (
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(fraction.padEnd(decimals, '0') || '0')
  );
}

export function requiredPathUsdAtomic(inrAmount: string): bigint {
  const inrPaise = decimalToAtomic(inrAmount, 2);
  const ratePaise = decimalToAtomic(ILLUSTRATIVE_INR_PER_PATH_USD, 2);
  const scale = 10n ** BigInt(PATH_USD_DECIMALS);
  return (inrPaise * scale + ratePaise - 1n) / ratePaise;
}

export function pathUsdBalanceAtomic(balance: string): bigint {
  return decimalToAtomic(balance, PATH_USD_DECIMALS);
}

export function formatPathUsdAtomic(amount: bigint): string {
  const scale = 10n ** BigInt(PATH_USD_DECIMALS);
  const whole = amount / scale;
  const fraction = (amount % scale)
    .toString()
    .padStart(PATH_USD_DECIMALS, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
