# MetaMask Mobile / Tempo testnet acceptance

This increment connects a developer-controlled MetaMask account, reads its pathUSD balance and requests free testnet funds. Tap to pay (below) adds real pathUSD payments on testnet; INR never moves. No private key, recovery phrase or funded wallet has been created by the app.

## On your Android phone

1. Install MetaMask using its [official download page](https://metamask.io/download/). Create a disposable wallet and keep its recovery phrase only in your secure backup. Do not import a wallet holding valuable assets for this demo.
2. Start the mobile app yourself and open **Connect**. Tap **Connect MetaMask**, approve the connection and any Tempo testnet network request in MetaMask, then return to Traveller Pay manually if necessary.
3. Confirm that the displayed account matches MetaMask and the network says **Tempo Moderato testnet (42431)**. If not, use **Switch to Tempo testnet**. Rejecting that prompt must leave funding unavailable.
4. Tap **Get free testnet funds** once. The response only acknowledges faucet transaction hashes; it does not claim confirmation. Refresh the balance until pathUSD appears. The app also refreshes every 15 seconds while this screen is active. Check the displayed hashes on the [Tempo testnet explorer](https://explore.testnet.tempo.xyz).
5. Switch accounts/networks in MetaMask and return. Verify the account/network updates and that another account's balance is never displayed. Disconnect and reconnect; reject an approval and check retry behavior. If cancelling locally, reject pending wallet prompts as well.
6. Disable the phone's internet and refresh: the app must show a balance error, not an invented zero. A failed faucet response may still have reached the network: inspect the balance before retrying.

### Connection speed and progress

1. On a fresh install, sign in and watch the status below the wallet address. It should name the current connection, Tempo network, challenge, MetaMask signature, or backend verification step. A declined MetaMask approval must stop the flow without opening a second prompt.
2. Repeat with an already connected wallet and a valid backend session. The existing session check should finish without another signature. Compare the elapsed times in the development log's `MetaMask flow` entries.
3. Reconnect a previously signed-in account after its MetaMask session lapses. Check the SDK's combined connection/signing flow and the ordinary approval fallback if MetaMask reports an unsupported or unauthorized request. Confirm that selecting a different account never signs in as the remembered account.
4. Temporarily make the API unreachable during a session check, then restore it. The saved session must remain available for retry; a `401` response should clear an expired session. Test on a physical Android device because Metro export cannot verify wallet handoff timing.

### Returning from MetaMask

The SDK now receives a native return URL, and TravelPay requests foreground after sign-in succeeds or fails. Installed builds use `travellerpay://wallet-return`; Expo Go uses its current development URL. A warm callback preserves the current screen; a cold callback starts the usual authentication gate. A connection approval alone may still require network and signature approvals before sign-in finishes.

1. Reload the app fully after updating. Disconnect and reconnect if an existing MetaMask session still has the old app metadata.
2. Approve all sign-in requests in MetaMask. Confirm TravelPay returns to Home for an existing PIN, or PIN setup otherwise. Reject a request and confirm the error is visible when returning.
3. Test both an installed build and Expo Go on the target phone. The OS may block background foreground requests or suspend JavaScript; automatic return is best effort, and MetaMask's return notification/manual app switch remains the fallback. This cannot be verified by unit tests or bundle export.
4. Open the callback with the app terminated: it must follow the normal splash/authentication path, never bypass authentication.

## Tap to pay acceptance

Start the app with `EXPO_PUBLIC_SETTLEMENT_ADDRESS` set to a testnet address you control (see the README). Then, on the phone:

1. Connect and sign in. **Set your payment PIN** follows: tap **Set PIN**, type 4 digits on the phone keyboard, then type them again. Mismatched entries start over. Home follows. Open Profile → **Tap to pay** → **Turn on tap to pay**. Pick a daily limit and trip length, tap **Approve in MetaMask** and approve exactly **one** transaction in MetaMask. Return to the app: it shows **Confirming on Tempo…**, then **Tap to pay is on**.
2. Profile → **Tap to pay** shows the limit, today's remaining amount and the end date.
3. Scan a QR, choose **pathUSD** and tap Pay. **Enter PIN** appears with the amount and merchant; enter your TravelPe PIN and tap **Continue**. No fingerprint or face prompt appears, and MetaMask must **not** open. A wrong PIN shows the tries left; five wrong tries pause PIN entry for five minutes. The success screen's details show a Tempo transaction; check it on the explorer and confirm the pathUSD left your MetaMask account for the settlement address.
4. Pay again: still no MetaMask. Then pay more than today's remaining limit: MetaMask opens for that one payment only.
5. Profile → **Turn off tap to pay** and approve in MetaMask. The next payment opens MetaMask.
6. Reject the set-up approval in MetaMask: the app stays on set-up with an error and nothing changes.

## Returning user and app lock

1. On a first visit, the splash, onboarding, **Connect MetaMask** and **Set your payment PIN** lead to Home with no lock, even if you leave the app for a while during sign-in.
2. After signing in (with or without tap to pay), close the app completely and reopen it. The splash appears for about 2.2 seconds, then the phone’s native authentication prompt opens over it. Use Face ID, fingerprint or the same passcode/PIN used to unlock the phone. Only after successful authentication does Home appear with your balance. Onboarding, the login page and MetaMask must not appear, even after the backend has restarted.
3. Pay a QR with tap to pay: still no MetaMask and no fingerprint prompt.
4. Switch to another app for less than 30 seconds and come back: no lock. Stay away for 30 seconds or more: the splash appears and native authentication asks again. Cancelling keeps the splash visible; tap **Continue** to retry the system prompt.
5. On a phone with no screen lock, returning sign-in asks you to set one in device settings. The payment PIN cannot bypass device authentication.
6. Profile → **Security** → **Change PIN**: enter the current PIN, then the new one twice. The next payment needs the new PIN.
7. Profile → **Disconnect wallet**, then reopen the app: onboarding appears again, and signing in asks for a new PIN (this is how a forgotten PIN is reset).

USDC and USDT have no Tempo testnet contracts, so payments in those stay simulated. INR settlement is always simulated.

A scripted spike on October 9, 2026 confirmed on Moderato that an ordinary EOA transaction to `authorizeKey` succeeds, the access key pays the settlement address without the owner signing, transfers to any other address and over the limit are rejected, and fees are paid in pathUSD from the owner's account and count against the daily limit.

## Runtime setup and limits

Use the repository's pnpm commands in [SKILL.md](../SKILL.md). The agent does not start development servers. The SDK requires native random-value and AsyncStorage modules; the Android JavaScript export alone does not verify those modules or wallet deep links on a phone.

If your current Expo runtime reports a missing native module, use a native Android build. With Android Studio/SDK and a device configured, from the repository root run:

```sh
pnpm --filter @traveller/shared build
pnpm --filter @traveller/mobile exec expo run:android
```

That command generates/builds the native app and starts Metro; run it yourself when ready. No MetaMask/Reown project key or private-key environment variable is needed for this integration. SDK session storage is managed by MetaMask Connect, not a hand-persisted account address. On launch the app starts the SDK so a saved MetaMask session can be restored; if it has lapsed, the app still opens for the traveller who signed in on this phone, and MetaMask is only reopened when an approval is needed.

The RPC URL is fixed to `https://rpc.moderato.tempo.xyz`; every balance/faucet operation verifies chain ID 42431. pathUSD is `0x20c0000000000000000000000000000000000000`, with contract code, symbol, six decimals and USD currency checked before reading balances or requesting funds. Faucet calls use `tempo_fundAddress` and are never automatic or automatically retried. The 60-second button cooldown is local UX throttling, not a server-enforced faucet limit.

## Verification record

- Offline tests cover wallet state, rejection/cancellation, network guards, precise balances, token metadata and faucet responses.
- Android bundle export verifies bundling only, not an APK or physical-wallet behavior. An upstream noble-hashes export warning currently falls back to file resolution.
- Live read-only RPC verification on September 15, 2026 returned chain ID `42431`, contract code `0xef`, name/symbol `PathUSD`, decimals `6` and currency `USD` for the configured token address. The symbol check now uses the observed `PathUSD` capitalization; older documentation says `pathUSD`. No live faucet request or payment was submitted by the agent.
- Record the phone/OS, MetaMask version, successful account/network checks and faucet explorer hashes here after physical acceptance. Never record secrets or wallet session data.

References: [MetaMask React Native setup](https://docs.metamask.io/metamask-connect/evm/quickstart/react-native/), [MetaMask methods](https://docs.metamask.io/metamask-connect/evm/reference/methods/), [Tempo faucet](https://docs.tempo.xyz/quickstart/faucet).
