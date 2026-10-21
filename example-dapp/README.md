# SIWS reference examples

The local playground below is the publicly reproducible example. [Phantom Sandbox](https://sandbox.phantom.dev/) is the team's maintained QA environment and requires access credentials; it is not a public demo. The original personal Vercel deployment is retired.

## What this example does

The browser playground connects to Wallet Standard wallets and demonstrates message signing, SIWS, explicit byte serialization through JSON, and local signature verification. Signatures are requested by the buttons, not automatically on page load. The deliberately invalid-origin request checks the wallet's phishing protection.

This is **not backend authentication**. It generates playground inputs in the browser, verifies locally, and does not establish a server session. Browser connection state and successful local verification must not grant access to protected resources.

The separate [server-only challenge helper](server/challenges.ts) demonstrates a session-bound, five-minute, single-use challenge. It keeps the expected input on the server and consumes it before verification. See the [integration guide](../README.md#dapp-integration) for session middleware, CSRF protection, request limits, and shared-storage requirements before using this pattern in a service. Do not import this helper into the browser bundle.

## Run locally

Use Node.js **22 or later** and npm. From `example-dapp`:

```sh
npm ci
npm start
```

Open [http://localhost:3000](http://localhost:3000), select a supported wallet, connect, and choose **Sign In**. A successful result reports a locally verified address and explicitly notes that no backend session was created. An unsupported wallet reports a capability error instead of treating connection as authentication.

Choose **Sign In Error** to send a deliberately mismatched domain/URI. Phantom should reject it before prompting. Verify this with a real wallet; the automated tests do not exercise the extension UI.

## Checks

```sh
npm test
npm run tsc
GENERATE_SOURCEMAP=false CI=true npm run build
```

Tests use Node's test runner through `tsx`, real synthetic Ed25519 signatures, and JSON round trips. They cover signer/address binding, malformed transport, expected challenge fields, expiration, session binding, single-use consumption, and message templates. CI runs these checks on Node 22 and 24. Source-map generation is disabled for the CI build because upstream dependencies reference source files that they do not publish.

The existing Create React App tooling is retained for this maintenance change. The manifest overrides its old TypeScript peer range for the compiler required by current Solana types, aligns its React Refresh runtime with Babel's runtime, and pins the mobile adapter's React Native peer to a React-18-compatible version. These compatibility constraints do not add native-app support.

A tooling migration and remaining transitive dependency advisories are separate work; a successful build is not a claim that the whole dependency tree is vulnerability-free. Keep the development server local rather than exposing it to untrusted users.

## x402 interoperability

x402's SIWX extension uses the SIWS-style Solana message format with its own signing and verification flow. It does not use this playground. See the [profile and origin-binding notes](../README.md#siws-caip-122-and-x402). This repository's unit tests are not a substitute for a live x402/Phantom integration test, particularly when the browser frontend and API use different origins or chain-ID representations.
