# TravelPay mobile interface

The Figma TravelPe frames guide the onboarding, sign-in, dashboard, payment review, activity, and processing previews. The QR scanner retains its existing design.

The scanner keeps its existing camera and QR frame above a white bottom payment panel with safe-area padding. The panel shows the selected demo token and mock balance; Change and the account card share one token selector. A valid scan enables Pay and carries the selected token into payment review.

## Layout

Safe-area screens use scrollable content and compact side padding. The dashboard uses 20dp side padding and keeps its navigation outside the scroll area. Payment actions and navigation have at least 48dp targets. Artwork is bundled locally. The onboarding and processing illustrations come from the supplied Figma file.

## Visual roles

White `#ffffff` and pale blue surfaces support navy ink `#081332`, secondary slate `#5b6b85`, and primary blue `#005ae1`. The wallet balance sits on dark navy. Cards use 16dp corners and main buttons use broad pill shapes. The sign-in screen uses a black hero and deep blue bottom panel.

## Hierarchy and content

Entry: travel illustration, oversized sign-in headline, MetaMask sign-in, install link, development notice.

Dashboard: greeting and testnet status, actual pathUSD balance and refresh, four quick actions (Scan & Pay, Send, Receive, Add Money), scan banner, This Month summary, and activity. Unavailable monthly metrics show dashes. The fixed bottom bar follows Figma's five positions: Home, Payments, raised Scan action, Activity, Profile. Profile contains the connected wallet and disconnect action. Payments links to merchant scanning and the dedicated TravelPe Receive screen, with unavailable contact transfers clearly identified. Receive shows a versioned demo payment QR, selected demo receiving currency, account-derived TravelPe ID when connected, optional INR request and note, and native copy, share, and save actions. Activity uses search and filter controls with an empty state until transactions exist. Payment review follows the Figma merchant, amount, source wallet, estimate, and secure payment hierarchy.

Add Money and Review Payment mirror the supplied funding flow for visual preview. They label rates as illustrative and do not submit fiat funding. Payment success remains unavailable until a real funding or settlement flow exists.

Use real RPC balances only. Loading and RPC failures are distinct from zero. Sign-in errors stay near the primary action. Fixed and QR-entered amounts remain on the existing confirmation route. Never show invented transactions or settlement success.

## Verification limits

Native screenshots and physical MetaMask approval still require an Android device. Build and static checks do not verify native rendering or wallet handoff.

## Home reference and local preview

Home follows the supplied reference's avatar and notification header, blue gradient balance card, currency control, secondary equivalent, monthly indicator, and in-card Add Money, Send, and Receive actions. The preview uses the app's profile icon because the reference screenshot is not bundled with the repository. Balance and equivalent start masked and hide again on navigation or app backgrounding.

Explicit local UI preview may use clearly labeled illustrative balances and transactions, including Starbucks, Blinkit, and Received from Priya from the reference. The preview balance card displays the supplied reference values ₹12,450.75 and ≈ 148.32 USDC; these are fixed design fixtures, not a live conversion quote. Its currency selector identifies the selected preview token; switching currencies awaits integration. The connected wallet continues to show actual Tempo pathUSD only; sample history, conversion rates, and monthly growth are preview-only.
