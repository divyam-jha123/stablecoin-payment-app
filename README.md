# Traveller payments on Tempo

An Android-first hackathon payment app for international travellers in India: scan an existing UPI QR, pay a USD stablecoin on Tempo, and demonstrate simulated INR merchant settlement.

The current prototype includes an Expo mobile interface, MetaMask sign-in, a Tempo testnet balance, QR scanning and payment review. Payment submission and real INR settlement are not enabled.

Tempo is the core payment network. Its stablecoin payments, transfer memos and stablecoin fees underpin the planned verification and reconciliation flow. See the research and pending architecture choices in [ARCHITECTURE.md](docs/ARCHITECTURE.md), and the hard **September 15–October 4, 2026** build window in [ROADMAP.md](docs/ROADMAP.md).

Approved MVP settlement mode: a real Tempo testnet payment is independently verified, then a mock or provider-sandbox black box simulates fiat conversion and UPI payout. No stablecoin is sold and no INR reaches a merchant. Receipts must state this explicitly.

Local development uses a disposable developer-controlled wallet funded with free assets from the official Tempo testnet faucet. The wallet contains no valuable assets and signs the real testnet transaction; its private key or recovery phrase must never be placed in this repository, application configuration or the backend.

## Prerequisites and setup

- Node.js 24.13+ (24.x), pnpm 12.3.4.
- Android device with compatible Expo Go, or an Android emulator. Wallet handoff still needs physical-device verification.

```sh
pnpm install
cp .env.example .env
pnpm --filter @traveller/shared build
```

The repository pins the current Expo 57 template dependency family. Do not independently upgrade React Native or React; use Expo's compatibility check when adding native modules.

## Run

```sh
# Terminal 1: local API on port 3000
pnpm dev:api

# Terminal 2: Expo Router mobile app
pnpm dev:mobile

# Or start both
pnpm dev
```

Open the Expo terminal QR on an Android device, or press `a` with a configured emulator.

To make real testnet payments in wallet mode, set the Tempo address that receives them before starting Expo:

```sh
EXPO_PUBLIC_SETTLEMENT_ADDRESS=0xYourTestnetSettlementAddress pnpm dev:mobile
```

Use a testnet address you control, such as a second MetaMask account. Turn on **tap to pay** from Profile: one MetaMask approval lets the app pay from your own account without opening MetaMask again, up to a daily limit and only to that address. Funds stay in MetaMask until you pay. Without the variable, tap to pay and on-chain payments are unavailable.

Your first visit goes from onboarding and wallet connection to setting a 4-digit payment PIN, then the dashboard. Each payment is approved with that PIN; it is stored only as a salted hash on the phone. On later launches, the splash appears first, then the phone's native authentication prompt opens over it. Use your fingerprint, Face ID or the same passcode/PIN used to unlock your phone to open the dashboard. The operating system handles that credential; TravelPe never receives or stores it. During those sessions it locks again after 30 seconds or more in the background.

### Preview the dashboard without a wallet

From the repository root, start Expo with the UI preview flag:

```sh
EXPO_PUBLIC_UI_PREVIEW=1 pnpm dev:mobile
```

Open the app in Expo Go and tap **Get Started**, then **Continue**. Set and confirm a 4-digit PIN to reach the dashboard. Tap the PIN boxes to focus the field; on the iPhone simulator you can type the digits with your Mac keyboard. If the simulator's software keyboard is hidden, use **I/O → Keyboard → Toggle Software Keyboard** (⌘K). On later launches, preview shows the splash, then opens the phone’s native authentication prompt. Use device authentication to reach the dashboard; the payment PIN is only for payments. If Expo is already running, restart it with the command above so it picks up the environment variable.

To start again after signing in, tap **Forgot PIN?** on the PIN screen and choose **Reset preview**. This clears the saved preview PIN and simulated payments, then opens onboarding. Clearing Metro's cache with `pnpm dev:mobile -- --clear` only refreshes bundled code; it does not clear saved app data. For a full simulator reset, use **Device → Erase All Content and Settings** in the Simulator app.

This mode is for visual review in development. It includes a sample balance, monthly totals, and illustrative transactions; activity search and filters work on the sample data. Payments made in preview are simulated. Processing holds on each step so it can be reviewed: use the **UI preview** bar at the bottom of the screen to move between steps or go on to the success or failed screen. Success, failed, and transaction details screens have the same bar for moving through the flow, and it can be hidden while you review a screen. Completed payments come off the sample balance and appear in monthly totals and activity; they are saved on the device only. This mode does not connect a wallet, read a balance, scan a live QR, or submit a payment on-chain. Start normally with `pnpm dev:mobile` to use the wallet flow.

```sh
curl http://localhost:3000/health
```

The API reports `paymentsEnabled: false`. It has no payment routes. Express + PostgreSQL + Prisma remains a documented proposal awaiting the architecture answer; the standard-library health bootstrap makes the scaffold runnable without committing that decision. No database or provider credentials are required now.

The standalone shared QR parser is tested with payloads such as:

```text
upi://pay?pa=merchant@upi&pn=Coffee%20Shop&am=250&cu=INR
```

The mobile app has the supplied TravelPe design on its onboarding, sign-in, dashboard and payment review screens. The QR scanner keeps its existing design. Activity and funding screens show development states where payment services are not connected.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm build
```

`build` compiles shared/API TypeScript and exports an Android JavaScript bundle. It does **not** produce an APK. Physical-device and native APK verification belongs to the remaining Week 1 gate. Tests cover QR parsing, payment state guards, fail-closed Tempo placeholders and deterministic isolated mock provider retries.

## Structure and boundaries

- `apps/mobile`: Expo Router app with wallet sign-in, testnet balance, QR scanning, payment review and local UI preview.
- `apps/api`: health bootstrap and Tempo/pricing/fiat/payout provider contracts. Mocks are isolated helpers, not connected payment services.
- `packages/shared`: Zod domain schemas, central payment statuses, QR parser and tests.
- `docs`: canonical architecture and weekly roadmap.

## Limitations and next phase

The prototype uses Tempo test funds. Payment submission, durable transaction history and real INR settlement remain future work.

Mock fiat settlement and payout return explicitly simulated results and remember idempotency only within one instance. They do not provide durable duplicate-payment protection; database orchestration must precede any real payment wiring. Tempo/pricing placeholders reject operations. No real INR, production off-ramp, KYC/AML, banking or UPI provider is implemented. SOL/Solana and public app-store releases are out of scope.

Real stablecoin-to-INR services may be regulated and require appropriate partners. Every eventual demo receipt must disclose that INR settlement is simulated.
