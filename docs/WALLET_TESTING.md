# MetaMask Mobile / Tempo testnet acceptance

This increment connects a developer-controlled MetaMask account, reads its pathUSD balance and requests free testnet funds. It does not sign payments, authenticate to the backend or move INR. No private key, recovery phrase or funded wallet has been created by the app.

## On your Android phone

1. Install MetaMask using its [official download page](https://metamask.io/download/). Create a disposable wallet and keep its recovery phrase only in your secure backup. Do not import a wallet holding valuable assets for this demo.
2. Start the mobile app yourself and open **Connect**. Tap **Connect MetaMask**, approve the connection and any Tempo testnet network request in MetaMask, then return to Traveller Pay manually if necessary.
3. Confirm that the displayed account matches MetaMask and the network says **Tempo Moderato testnet (42431)**. If not, use **Switch to Tempo testnet**. Rejecting that prompt must leave funding unavailable.
4. Tap **Get free testnet funds** once. The response only acknowledges faucet transaction hashes; it does not claim confirmation. Refresh the balance until pathUSD appears. The app also refreshes every 15 seconds while this screen is active. Check the displayed hashes on the [Tempo testnet explorer](https://explore.testnet.tempo.xyz).
5. Switch accounts/networks in MetaMask and return. Verify the account/network updates and that another account's balance is never displayed. Disconnect and reconnect; reject an approval and check retry behavior. If cancelling locally, reject pending wallet prompts as well.
6. Disable the phone's internet and refresh: the app must show a balance error, not an invented zero. A failed faucet response may still have reached the network: inspect the balance before retrying.

## Runtime setup and limits

Use the repository's pnpm commands in [SKILL.md](../SKILL.md). The agent does not start development servers. The SDK requires native random-value and AsyncStorage modules; the Android JavaScript export alone does not verify those modules or wallet deep links on a phone.

If your current Expo runtime reports a missing native module, use a native Android build. With Android Studio/SDK and a device configured, from the repository root run:

```sh
pnpm --filter @traveller/shared build
pnpm --filter @traveller/mobile exec expo run:android
```

That command generates/builds the native app and starts Metro; run it yourself when ready. No MetaMask/Reown project key or private-key environment variable is needed for this integration. SDK session storage is managed by MetaMask Connect, not a hand-persisted account address. Reopen Connect and explicitly connect again after a cold restart; automatic wallet restoration is not claimed.

The RPC URL is fixed to `https://rpc.moderato.tempo.xyz`; every balance/faucet operation verifies chain ID 42431. pathUSD is `0x20c0000000000000000000000000000000000000`, with contract code, symbol, six decimals and USD currency checked before reading balances or requesting funds. Faucet calls use `tempo_fundAddress` and are never automatic or automatically retried. The 60-second button cooldown is local UX throttling, not a server-enforced faucet limit.

## Verification record

- Offline tests cover wallet state, rejection/cancellation, network guards, precise balances, token metadata and faucet responses.
- Android bundle export verifies bundling only, not an APK or physical-wallet behavior. An upstream noble-hashes export warning currently falls back to file resolution.
- Live read-only RPC verification on September 15, 2026 returned chain ID `42431`, contract code `0xef`, name/symbol `PathUSD`, decimals `6` and currency `USD` for the configured token address. The symbol check now uses the observed `PathUSD` capitalization; older documentation says `pathUSD`. No live faucet request or payment was submitted by the agent.
- Record the phone/OS, MetaMask version, successful account/network checks and faucet explorer hashes here after physical acceptance. Never record secrets or wallet session data.

References: [MetaMask React Native setup](https://docs.metamask.io/metamask-connect/evm/quickstart/react-native/), [MetaMask methods](https://docs.metamask.io/metamask-connect/evm/reference/methods/), [Tempo faucet](https://docs.tempo.xyz/quickstart/faucet).
