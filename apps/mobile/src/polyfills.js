import { Buffer } from 'buffer';

globalThis.Buffer ??= Buffer;
// MetaMask's native transport shares some browser-oriented dependencies.
globalThis.window ??= globalThis;
globalThis.window.location ??= {
  hostname: 'traveller-pay',
  href: 'https://github.com/divyam-jha123/stablecoin-payment-app',
};
globalThis.window.addEventListener ??= () => {};
globalThis.window.removeEventListener ??= () => {};
globalThis.window.dispatchEvent ??= () => true;
