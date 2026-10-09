# MetaMask disconnect patch

`@metamask/connect-multichain@1.2.0` starts `wallet_revokeSession` in the
background during disconnect, then clears local session state. When MetaMask is
inactive, that background request can fail with
`Failed to resume session: Resume timeout` after local disconnect has succeeded.
The SDK logs it directly to `console.error`, so catching `sdk.disconnect()` in
the app cannot handle it.

This patch sends only that exact error to the SDK's debug logger. Other
revocation errors still use `console.error`. Remote revocation remains best
effort; local cleanup and the revocation attempt are unchanged. It does not
claim that permissions were removed inside an unreachable MetaMask wallet.

The patch covers all shipped JavaScript entry points, including React Native.
`pnpm install` applies it automatically. Reassess the patch when upgrading the
SDK and remove it when upstream handles this expected timeout.
