# 20-day build roadmap

**Hard build window: September 15–October 4, 2026, inclusive.** Canonical architecture: [ARCHITECTURE.md](ARCHITECTURE.md).

Current phase: **Week 1 — QR scanning merged; MetaMask Mobile connection and Tempo testnet funding implementation**. This document tracks delivered evidence, not calendar-based claims of completion. Architectural proposals awaiting user answers remain marked in the architecture document.

Latest user steering resumes implementation and selects MetaMask Mobile. The account increment covers connect/disconnect, testnet switching, pathUSD balances and manual faucet requests. Physical Android acceptance and live network checks remain pending; see [wallet testing](WALLET_TESTING.md). Payment signing and backend authentication are separate unfinished work. No scanner redesign is included.

Approved decision on September 15, 2026: the MVP will use a real Tempo testnet transaction plus independent verification, followed by a test-mode settlement/payout black box. Conversion and UPI payout are simulated and move no INR. A provider sandbox may replace the local mock while preserving this disclosure. Production off-ramp work stays outside the build while partner discussions proceed.

Approved local-development path on September 15, 2026: use a disposable developer-controlled wallet funded by the official Tempo testnet faucet. This exercises a real testnet transaction without purchasing mainnet assets. The wallet holds no valuable assets, its secrets never enter the repository or backend, and the completed demo continues to identify INR conversion and UPI payout as simulated.

## Week 1 — Foundation, Tempo and UPI scanning

**September 15–20 (6 calendar days)**

Goal: connect a Tempo account, show supported stablecoin balances, scan a real UPI QR, and reach confirmation.

- [ ] Confirm material architecture decisions; record official Tempo network, token, fee, memo and account findings.
- [ ] Scaffold mobile/API/shared workspace, environment, TypeScript, lint, formatting and meaningful tests.
- [ ] Define payment state transitions, provider contracts, database schema and REST contract.
- [ ] Create the ten route shells: Welcome, Connect/Sign In, Home, Scanner, Confirmation, Processing, Success, Failed, Activity, Details.
- [ ] Prove Android wallet connection and signing compatibility by September 18; document actual wallet and version. Escalate a failed gate promptly rather than inventing custody.
- [ ] Create a disposable account in the selected wallet application, fund it from the official Tempo testnet faucet and confirm the approved test asset metadata on chain.
- [ ] Implement authenticated backend session, wallet connect/disconnect/reconnect and safe persistence.
- [ ] Read approved Tempo test-stablecoin balances; verify metadata/network configuration.
- [ ] Camera permission and QR detection; parse `pa`, `pn`, `am`, `cu`; handle missing amount and invalid payloads.
- [ ] Unit-test URI/VPA/amount/currency parsing and malformed inputs.
- [ ] Produce Android development build and test on a physical device.

**Definition of done:** Open → connect/authenticate Tempo account → see actual test balances → scan existing UPI QR → see merchant → see/enter INR → confirmation. Real payment need not yet be wired. If this is broken, do not begin secondary features. Freeze fundamental architecture after Week 1 unless evidence forces a correction.

## Week 2 — Real Tempo payment

**September 21–27 (7 calendar days)**

Goal: QR → expiring quote → real Tempo stablecoin payment → independent backend verification. This is the critical engineering week.

- [ ] Exact INR/stablecoin quote calculation, explicit rate direction/fees, expiry and mock/live pricing disclosure.
- [ ] Durable payment creation, unique payment ID, immutable quote/transfer intent and awaiting-signature state.
- [ ] Account ownership authorization and account-scoped idempotency with request-fingerprint conflicts.
- [ ] Wallet-approved TIP-20 transfer with payment memo; retain transaction hash through reconnect/network loss.
- [ ] Server reads Tempo evidence and verifies chain, success, sender, receiver, token, atomic amount, memo and inclusion time.
- [ ] Atomically consume chain/hash once; persist confirmation and block evidence; never trust mobile success.
- [ ] Implement CREATED → QUOTED → AWAITING_SIGNATURE → ONCHAIN_PENDING → ONCHAIN_CONFIRMED, with correct pre-submission expiry/cancellation and definitive failure handling.
- [ ] Test replay, concurrent duplicate submission, stale quote, wrong token/amount/sender/receiver/memo and invalid receipts.
- [ ] Recover slow confirmations, lost responses and RPC outages without recharging the traveller.
- [ ] Prefer one reliable token; only add second asset or sponsor when core path is stable.

**Definition of done:** Scan → INR → quote → select supported test stablecoin → approve → real Tempo transfer → backend verifies → app shows onchain confirmation. Do not start cosmetic work while this gate is unreliable.

## Week 3 — Simulated INR settlement and end-to-end demo

**September 28–October 4 (7 calendar days)**

Goal: complete the experience around the working, verified Tempo payment.

- [ ] Persist one fiat settlement and payout intent per verified payment; stable provider idempotency keys.
- [ ] ONCHAIN_CONFIRMED → SETTLEMENT_PENDING → PAYOUT_PENDING → COMPLETED only after positive provider statuses.
- [ ] Deterministic mock fiat conversion and mock UPI payout; optional sandbox only with suitable configured credentials.
- [ ] Provider status reconciliation, bounded retry, restart recovery and duplicate payout prevention under concurrency.
- [ ] Distinct settlement/payout failure states; retry downstream processing without another Tempo payment.
- [ ] Receipt and minimal account-owned activity/details. All success receipts prominently disclose simulated INR.
- [ ] Reliability matrix below passes before typography, spacing, loading/skeletons, haptics and progress polish.
- [ ] Reliable Android APK, test account in established wallet, test balance, repeatable merchant QR, deployed backend/database and documented demo reset.
- [ ] Rehearse the 2–3 minute demo on judge-facing hardware without development tools.

**Definition of done:** Tempo account → balance → normal UPI QR → merchant/INR → quote → approve → real Tempo testnet payment → independent verification → black-box simulated conversion → mock/sandbox UPI payout → test workflow COMPLETED → receipt stating **“Tempo test payment confirmed — INR settlement simulated.”**

## Reliability acceptance matrix

| Scenario | Required result |
| --- | --- |
| Malformed/non-UPI QR, unsupported currency | Clear error; no payment created |
| QR missing amount | Manual INR input validated exactly |
| Expired quote | No new signing; refresh creates new intent; late funds reconciled |
| Rejected signature | Safe cancellation before submission |
| Failed Tempo transaction | Never confirmed or settled |
| RPC outage / slow confirmation | Pending/retry, no false failure or success |
| Insufficient token balance including fee | Explain inability to pay; no gas-token onboarding |
| Wrong sender/receiver/token/amount/memo | Verification rejected; payout blocked |
| Duplicate transaction / concurrent retry | One consumed chain transaction and one payment outcome |
| Payout failure / timeout | Explicit pending/failure; query before retry; no second charge |
| Network interruption / app restart | Recover authoritative server state |
| Backend restart during settlement | Resume persisted operation; at most one payout |

## Priority order — mandatory

1. Scan normal UPI QR.
2. Connect/authenticate Tempo account.
3. Show stablecoin balance.
4. Generate INR → stablecoin quote.
5. Execute real Tempo payment.
6. Backend verify Tempo payment.
7. Payment state machine.
8. Payment reference/reconciliation.
9. Mock/sandbox INR settlement.
10. Complete success/failure UX.
11. Activity/history.
12. Fee abstraction.
13. UI polish.
14. Second stablecoin.
15. Optional source-chain support (post-MVP; no initial implementation).

Never sacrifice 1–10 to implement 13+. Dependencies such as state guards are built when needed, even when lower in the product-priority list.

## Cut list and scope enforcement

First cut advanced activity filters, analytics, custom animations, profiles, exports and push. Then cut the second stablecoin. Then cut sophisticated sponsorship; preserve stablecoin fee payment without separate gas tokens. Never cut one Tempo USD stablecoin → QR → real transfer → server verification → simulated payout.

Explicitly out of the 20 days: public Play/App Store publication, NPCI/TPAP approval, FIU registration, production KYC/AML/off-ramp, direct banking, merchant app/dashboard, loyalty, rewards, referrals, physical cards, Ethereum/Base/Polygon/Bitcoin integration, full Solana/SOL support, many tokens, complex admin, Kubernetes and microservices.

## Final demo (2–3 minutes)

Open app → show real test USD balance → show ordinary Indian UPI QR → scan → merchant and ₹500 → stablecoin equivalent → Pay → wallet approval → real Tempo transfer → backend verifies → mock/sandbox INR settlement → **“₹500 payment demo complete — INR settlement simulated”**.

Explain: “The merchant keeps their existing UPI QR. The traveller paid test stablecoins through Tempo. This prototype simulates the merchant's INR settlement; a regulated partner is needed for production.” Judges must not mistake the simulation for a real bank transfer.

## After October 4

Bug fixes → demo reliability → presentation → architecture diagrams → demo video → submission copy. Do not expand scope if the core path finishes early.

## Maintenance rule

Update checkboxes only with verifiable evidence. For a change, record completion evidence or blocker and next action; keep weekly phases, never create 20 daily task lists. Material architecture changes require the user's answer and an updated decision row. No unapproved scope expansion.
