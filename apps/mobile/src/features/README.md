# Mobile scaffold

The user will supply the visual design and choose the theme. Keep route placeholders neutral; do not add a palette, typography system, cards, mock balances or composed payment screens until then.

Account integration implements `account/provider.ts` after the architecture answer and Android spike. The scanner will consume the shared UPI parser. No camera, QR input UI, local payment store or payment flow is wired now.

The future flow is `scan → parseUpiQr → createPayment → getQuote → displayQuote → user approval → submitTempoTransaction → submit hash to API → poll verified/settlement state → receipt`.

TanStack Query is available for future API state. Add minimal Context state only when a feature needs it. Never store private keys or invent verified payment results.
