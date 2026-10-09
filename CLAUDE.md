# CLAUDE.md

Context for coding agents working in this repository. Read [SKILL.md](SKILL.md) first for commands, commit style and server rules (`AGENTS.md` points there too). The user's latest explicit instructions take precedence.

## Project

TravelPe / TravelPay: an Android-first Expo app for travellers in India to scan a UPI QR and pay with a USD stablecoin on the Tempo testnet. INR settlement is simulated; no real INR moves.

| Path              | What lives there                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `apps/mobile`     | Expo Router app. Screens in `app/`, components in `src/components/`, logic in `src/features/`                                       |
| `apps/api`        | Standard-library HTTP API (`/health`, `/v1/auth/*`, `/v1/qr/parse`) and provider contracts with mocks                               |
| `packages/shared` | Zod schemas, UPI/TravelPe QR parsers, payment statuses. Build it (`pnpm --filter @traveller/shared build`) before typechecking apps |
| `docs`            | Architecture and roadmap                                                                                                            |

Design references: [apps/mobile/DESIGN.md](apps/mobile/DESIGN.md), assets in `apps/mobile/assets/figma/`, and the Figma file `https://www.figma.com/design/Ux0RM4NaINN6SKZgaOC2y2/Untitled`.

## Two run modes, one design

The mobile app runs in two modes:

- **Wallet mode** (`pnpm dev:mobile`): MetaMask sign-in, real Tempo testnet balance, live QR scanning.
- **UI preview** (`EXPO_PUBLIC_UI_PREVIEW=1 pnpm dev:mobile`): the README section "Preview the dashboard without a wallet". No wallet; sample balance and transactions; payments are simulated and saved on the device. Controlled by `uiPreviewEnabled` in [apps/mobile/src/ui-preview.ts](apps/mobile/src/ui-preview.ts), and only ever true in development.

The user designs and reviews mostly in UI preview. **Every visual, layout, copy or flow change made while working in preview must also apply to wallet mode.** The two modes are the same screens with the same design; preview only swaps where the data comes from.

When changing a screen:

1. Put `uiPreviewEnabled` branches on **data**, not on markup. Prefer `const balance = uiPreviewEnabled ? previewDashboard.balance : liveBalance` feeding one shared component over `uiPreviewEnabled ? <PreviewCard /> : <WalletCard />`.
2. If a layout branch already exists (for example the preview-only quick-action spacing in `app/home.tsx`), update both sides, or fold them into one when practical.
3. New components, styles, animations and navigation steps go into the shared path, so wallet users get them too.
4. Wallet mode must show real data only. Where preview shows a sample value that has no live source yet, wallet mode shows a loading, empty or dash state in the same layout, never an invented number. Errors and zero stay distinct from loading.
5. Before calling a change done, check that the wallet-mode branch of every touched screen still renders the new design: read it, and typecheck, lint and test.
6. If a change truly only makes sense in preview, say so to the user rather than silently leaving wallet mode behind.

What may differ between the modes:

| Allowed to differ in preview                                                                     | Must stay identical                              |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Data source: fixtures in `src/preview-data.ts`, simulated payments recorded with `address: null` | Layout, components, colours, typography, spacing |
| No wallet connection, RPC balance or on-chain submission                                         | Copy and labels (except sample names and values) |
| Dev-only controls: the **UI preview** bar (`src/components/preview-flow-bar.tsx`)                | Screen order, navigation and animations          |
| Sample QR buttons on the scanner instead of the camera                                           | Validation, disabled states and error handling   |

## Product rules

- Never show invented transactions, balances or settlement success in wallet mode. Simulated payments must be labelled as demo or simulated where receipts appear.
- Payments convert INR to any supported token (USDC, USDT, pathUSD today), not only USDC. Coin animations, emblems, labels and copy must use the selected token: use `TokenEmblem` from `apps/mobile/src/components/payment-logos.tsx`, never a hard-coded USDC emblem.
- Merchant names, amounts and QR fields are untrusted input; validate with the shared Zod schemas.
- Keep the white and pale-blue visual language (navy ink `#081332`, primary blue `#005ae1`); see DESIGN.md.

## Working agreements

- Never push or merge into `main` without asking first.
- Do not start or stop the user's dev servers; give them the commands instead (see SKILL.md).
- Preserve uncommitted work. Back it up (for example `git stash -u`) before any reset or branch alignment.
- Keep README content suitable for public readers; internal instructions belong here or in SKILL.md.
