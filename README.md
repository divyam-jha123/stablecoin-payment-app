# Traveller payments on Tempo

An Android-first hackathon payment app for international travellers in India: scan an existing UPI QR, pay a USD stablecoin on Tempo, and demonstrate simulated INR merchant settlement.

**Active scope: infrastructure discussion and Markdown documentation only.** Code work is paused at the user's request. Existing scaffold files are unfinished and unverified; the commands below describe their intended use when implementation resumes. No account connection, live balances, quotes, Tempo transfer, database workflow or INR money movement is enabled.

Tempo is the core payment network. Its stablecoin payments, transfer memos and stablecoin fees underpin the planned verification and reconciliation flow. See the research and pending architecture choices in [ARCHITECTURE.md](docs/ARCHITECTURE.md), and the hard **September 15–October 4, 2026** build window in [ROADMAP.md](docs/ROADMAP.md).

Approved MVP settlement mode: a real Tempo testnet payment is independently verified, then a mock or provider-sandbox black box simulates fiat conversion and UPI payout. No stablecoin is sold and no INR reaches a merchant. Receipts must state this explicitly.

## Prerequisites and setup

- Node.js 24.13+ (24.x), pnpm 12.3.4.
- Android device with compatible Expo Go for the screen scaffold, or an Android emulator. Wallet integration will receive a separate native-build compatibility check.

```sh
pnpm install
cp .env.example .env
pnpm --filter @traveller/shared build
```

The repository pins the current Expo 57 template dependency family. Do not independently upgrade React Native or React; use Expo's compatibility check when adding native modules.

## Run

```sh
# Terminal 1: health-only Node bootstrap on port 3000
pnpm dev:api

# Terminal 2: Expo Router mobile screen scaffold
pnpm dev:mobile

# Or start both
pnpm dev
```

Open the Expo terminal QR on an Android device, or press `a` with a configured emulator. Expo Go can preview these shells; it does not prove the later wallet SDK works. `pnpm --filter @traveller/mobile android` opens the scaffold on Android.

```sh
curl http://localhost:3000/health
```

The API reports `paymentsEnabled: false`. It has no payment routes. Express + PostgreSQL + Prisma remains a documented proposal awaiting the architecture answer; the standard-library health bootstrap makes the scaffold runnable without committing that decision. No database or provider credentials are required now.

The standalone shared QR parser is tested with payloads such as:

```text
upi://pay?pa=merchant@upi&pn=Coffee%20Shop&am=250&cu=INR
```

Mobile routes are neutral placeholders. The user will supply the design and theme; no palette, typography system, sample balances or interactive payment preview is included. Camera integration and manual amount entry remain Week 1 tasks.

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

- `apps/mobile`: ten neutral Expo Router screen placeholders and an account-provider interface; design/theme deferred to the user.
- `apps/api`: health bootstrap and Tempo/pricing/fiat/payout provider contracts. Mocks are isolated helpers, not connected payment services.
- `packages/shared`: Zod domain schemas, central payment statuses, QR parser and tests.
- `docs`: canonical architecture and weekly roadmap.

## Limitations and next phase

Current phase is **Week 1: architecture discussion/documentation; implementation paused**. The account model, first test stablecoin and proposed backend architecture still need the user's architecture answer. Faucet research confirms USD test-token options; USDC/USDT addresses are deliberately not invented or enabled.

Mock fiat settlement and payout return explicitly simulated results and remember idempotency only within one instance. They do not provide durable duplicate-payment protection; database orchestration must precede any real payment wiring. Tempo/pricing placeholders reject operations. No real INR, production off-ramp, KYC/AML, banking or UPI provider is implemented. SOL/Solana and public app-store releases are out of scope.

Real stablecoin-to-INR services may be regulated and require appropriate partners. Every eventual demo receipt must disclose that INR settlement is simulated.
