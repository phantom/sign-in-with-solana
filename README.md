# Sign In With Solana

- [Introduction](#introduction)
- [Motivation](#motivation)
- [Specification](#specification)
  - [Sign-In Input Fields](#sign-in-input-fields)
  - [Sign-In Output Fields](#sign-in-output-fields)
  - [ABNF Message Format](#abnf-message-format)
  - [Minimal Message Template](#minimal-message-template)
  - [Maximal Message Template](#maximal-message-template)
- [Dapp Integration](#dapp-integration)
  - [Overview](#overview)
  - [Dependencies](#dependencies)
  - [Sign-In Input Generation](#sign-in-input-generation-backend)
  - [Sign-In Output Verification](#sign-in-output-verification-backend)
  - [Frontend Integration](#frontend-integration)
  - [SIWS, CAIP-122, and x402](#siws-caip-122-and-x402)
- [Wallet Integration](#wallet-integration)
  - [Overview](#overview-1)
  - [Dependencies](#dependencies-1)
  - [Wallet-Standard Wrapper and Provider Method](#wallet-standard-wrapper-and-provider-method)
  - [Message Construction](#message-construction)
  - [Message Parsing](#message-parsing)
  - [Message Verification](#message-verification)
- [Full Feature Demo](#full-feature-demo)
- [Reference Implementation](#reference-implementation)

## Introduction

Sign In With Solana (SIWS) lets applications authenticate their users and prove ownership of their addresses. SIWS aims to standardize message formats in order to improve authentication UX and security, replacing the traditionally clunky `connect` + `signMessage` flow with a one-click `signIn` method.

## Motivation

Centralised entities like Google, Facebook and X dictate our digital identities. They define our digital identifiers (usernames, email addresses) and exercise control over our data, reputations, and digital footprints. This presents two significant concerns:

1.  Censorship: They possess the power to ban, block, or limit specific users at their discretion
2.  Impedes Innovation: Users and apps are restricted and cannot customize their login experiences or dictate what data they can transfer

A decentralised authentication approach widely used to tackle the above revolves around signing off-chain messages. This approach is safer than entering passwords and entrusting authentication control to the dapp, however, it faces some significant challenges:

1. The user experience is inconsistent, as every dapp has its unique message format, leaving users unsure of what to expect
2. The lack of standardization in message formats forces wallets to display confusing messages in plaintext, further baffling users
3. Malicious websites pretending to be legitimate dapps can trick users into signing messages, and neither the wallet nor the user can intervene
4. The traditional `connect` + `signMessage` requires multiple unintuitive steps

Sign In With Solana offers a comprehensive solution to these challenges and more. The [technical specification](#specification) for SIWS is modeled after [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361) (Sign In With Ethereum) but extends beyond its capabilities. SIWS shifts the responsibility of message construction from dapps to the wallet, resulting in consistent, user-friendly interfaces and enhanced end-user security.

Additionally, SIWS standardises the message format, which enables wallets to scrutinize message data to ensure its legitimacy or raise red flags for suspicious activity. Domain binding is a key feature of SIWS, enabling wallets to alert users if a website is impersonating another entity

## Specification

### Sign-In Input Fields

Unlike EIP-4361 or legacy Solana messages, dapps do not need to construct a message themselves in order to make a sign-in request. Rather, dapps construct the `signInInput` object containing a set of standard message parameters. All fields are optional. Fields are strings except `resources`, which is an array of URI strings. Dapps can optionally send a minimal (empty) `signInInput` object to the wallet.

- `domain`: Optional EIP-4361 domain requesting the sign-in. If not provided, the wallet must determine the domain to include in the message.
- `address`: Optional Solana address performing the sign-in. The address is case-sensitive. If not provided, the wallet must determine the Address to include in the message.
- `statement`: Optional EIP-4361 Statement. The statement is a human readable string and should not have new-line characters (`\n`). If not provided, the wallet must not include Statement in the message.
- `uri`: Optional EIP-4361 URI. The URL that is requesting the sign-in. If not provided, the wallet must not include URI in the message.
- `version`: Optional EIP-4361 version. If not provided, the wallet must not include Version in the message.
- `chainId`: Optional EIP-4361 Chain ID. The chainId can be one of the following: `mainnet`, `testnet`, `devnet`, `localnet`, `solana:mainnet`, `solana:testnet`, `solana:devnet`. If not provided, the wallet must not include Chain ID in the message.
- `nonce`: Optional EIP-4361 Nonce. It should be an alphanumeric string containing a minimum of 8 characters. If not provided, the wallet must not include Nonce in the message.
- `issuedAt`: Optional ISO 8601 datetime string. This represents the time at which the sign-in request was issued to the wallet. Wallets may enforce issuance-time tolerances; the backend must independently enforce challenge freshness. If not provided, the wallet must not include Issued At in the message.
- `expirationTime`: Optional ISO 8601 datetime string. This represents the time at which the sign-in request should expire. If not provided, the wallet must not include Expiration Time in the message.
- `notBefore`: Optional ISO 8601 datetime string. This represents the time at which the sign-in request becomes valid. If not provided, the wallet must not include Not Before in the message.
- `requestId`: Optional EIP-4361 Request ID. An application-specific identifier for the request. This field is not itself a signature and does not replace nonce tracking or replay protection. If not provided, the wallet must not include Request ID in the message.
- `resources`: Optional EIP-4361 Resources. An array of URI strings the dapp wants the user to be aware of. The wallet serializes each URI on a new line prefixed by `- `. If not provided, the wallet must not include Resources in the message.

### Sign-In Output Fields

Once the user is successfully signed-in, the wallet returns back the `signInOutput` object to the dapp, which can be used for verifying the sign-in process.

- `account` [`WalletAccount`]: Account that was signed in. Verify this address against both the signed address and the signing public key. If the input specifies an address, verification must reject a different one.
- `signedMessage` [`Uint8Array`]: Message bytes that were signed. The wallet is responsible for constructing this message using the `signInInput`.
- `signature` [`Uint8Array`]: Message signature produced. If the signature type is not provided, the signature must be Ed25519.
- `signatureType` [`"ed25519"`]: Optional type of the message signature produced. If not provided, the signature must be Ed25519.

### ABNF Message Format

The Sign In With Solana message constructed by the wallet using `signInInput` should follow the `sign-in-with-solana` Augmented Backus–Naur Form expression:

```
sign-in-with-solana =
  message-domain %s" wants you to sign in with your Solana account:" LF
  message-address
  [ LF LF message-statement ]
  [ LF advanced-fields ]

advanced-fields =
  [ LF %s"URI: " message-uri ]
  [ LF %s"Version: " message-version ]
  [ LF %s"Chain ID: " message-chain-id ]
  [ LF %s"Nonce: " message-nonce ]
  [ LF %s"Issued At: " message-issued-at ]
  [ LF %s"Expiration Time: " message-expiration-time ]
  [ LF %s"Not Before: " message-not-before ]
  [ LF %s"Request ID: " message-request-id ]
  [ LF %s"Resources:" message-resources ]

message-domain          = authority
message-address         = 32*44( %x31-39 / %x41-48 / %x4A-4E / %x50-5A / %x61-6B / %x6D-7A )
message-statement       = 1*( reserved / unreserved / " " )
message-uri             = URI
message-version         = "1"
message-chain-id        = %s"mainnet" / %s"testnet" / %s"devnet" / %s"localnet" / %s"solana:mainnet" / %s"solana:testnet" / %s"solana:devnet"
message-nonce           = 8*( ALPHA / DIGIT )
message-issued-at       = date-time
message-expiration-time = date-time
message-not-before      = date-time
message-request-id      = *pchar
message-resources       = *( LF "- " URI )
```

### Minimal Message Template

If the dapp sends an empty `signInInput`, the wallet should construct a minimal sign-in message using the requesting domain and address as follows:

```
${domain} wants you to sign in with your Solana account:
${address}
```

### Maximal Message Template

This is an informal format in which the wallet should construct the message if all optional fields are provided in `signInInput`:

```
${domain} wants you to sign in with your Solana account:
${address}

${statement}

URI: ${uri}
Version: ${version}
Chain ID: ${chain-id}
Nonce: ${nonce}
Issued At: ${issued-at}
Expiration Time: ${expiration-time}
Not Before: ${not-before}
Request ID: ${request-id}
Resources:
- ${resources[0]}
- ${resources[1]}
...
- ${resources[n]}
```

## Dapp Integration

SIWS is supported by the [Solana Wallet Standard](https://github.com/anza-xyz/wallet-standard) and [Wallet Adapter](https://github.com/anza-xyz/wallet-adapter). A wallet connection alone is not proof of ownership and must not create an authenticated application session.

### Overview

1. Establish an anonymous server session and request a short-lived challenge from your backend.
2. The backend generates a cryptographically random nonce and stores the expected input against that session. Set the domain and URI from trusted application configuration, not client input or request host headers.
3. On an explicit user action, call the wallet's `signIn` method with that challenge.
4. Encode the returned bytes explicitly and send only the output to your backend. Do not accept a client-submitted input as the expected challenge.
5. Atomically consume the session's stored challenge, reject expired challenges, and verify the output against the stored input.
6. Only after successful verification, rotate the session identifier and establish an authenticated session for the verified address.

If `signIn` is unavailable, implement a separately verified `signMessage` flow using the same challenge policy, or report that the wallet is unsupported. Falling back to `connect` is not authentication.

### Dependencies

Use `@solana/wallet-standard-util` **1.2.0 or later**, which binds the account address, signed address, and signing public key. Older examples pinned 1.1.0; do not copy that pin. The 1.2.0 release requires **Node.js 22 or later** on the backend. See the [example manifest](example-dapp/package.json) and lockfile for a compatible, tested dependency set.

`verifySignIn` checks the signed fields and signature. It does not enforce current time, manage challenges, prevent replay, or establish a session. These are backend responsibilities.

### Sign-In Input Generation (Backend)

The tested [server-only reference helper](example-dapp/server/challenges.ts) issues a fresh 128-bit nonce, includes the configured origin and a five-minute expiration, and keeps the expected input separate from the browser's response:

```ts
import { InMemorySignInChallenges } from "./server/challenges";

// Trusted deployment configuration: the origin of the browser application.
const challenges = new InMemorySignInChallenges("https://app.example.com");

// In your challenge endpoint, after establishing an anonymous server session:
const input = challenges.issue(session.id);
// Return input as JSON with Cache-Control: no-store.
```

`session.id` must come from trusted server session middleware backed by an unpredictable, HttpOnly, Secure, SameSite cookie. Never take it from a request body. Use HTTPS outside local development, protect the endpoints against CSRF, limit request bodies, and rate-limit challenge issuance and verification.

The in-memory helper is for local examples and tests. For production, use bounded, expiring shared storage with an **atomic get-and-delete** operation so concurrent requests and multiple server instances cannot reuse a challenge. Issuing another challenge for a session invalidates the previous one. A failed verification also consumes the challenge; clients must request a new one before retrying.

The wallet API permits an empty input, but an empty input is not this application's authentication policy. Optional protocol fields do not remove the backend's need for origin binding, freshness, and replay protection.

### Sign-In Output Verification (Backend)

The [transport helper](example-dapp/src/utils/signInOutput.ts) encodes public-key, message, and signature bytes as base58 strings and reconstructs `Uint8Array` values after JSON parsing. Do not JSON-stringify typed arrays directly. Wallet discovery metadata is not needed for verification and is deliberately omitted from this transport.

```ts
// In your verification endpoint, using the same server session:
const address = challenges.verify(session.id, request.body.output);
if (address === null) {
  // Return HTTP 401. Do not establish an authenticated session.
} else {
  // Rotate the session identifier, bind the new session to address,
  // and return success only after the session has been saved.
}
```

This helper consumes the trusted challenge before verification, checks its validity window, validates the transport shape and byte lengths, and calls `verifySignIn`. The returned address is the authenticated identity; a client-provided address is not authoritative. HTTP adapters and production session/storage infrastructure are intentionally not included.

### Frontend Integration

Call this function from a sign-in button after wallet selection. The endpoints below are application integration points, not endpoints provided by the browser playground:

```ts
import type { Adapter } from "@solana/wallet-adapter-base";
import type { SolanaSignInInput } from "@solana/wallet-standard-features";
import { encodeSignInOutput } from "./src/utils/signInOutput";

async function signIn(adapter: Adapter): Promise<void> {
  if (!("signIn" in adapter) || typeof adapter.signIn !== "function") {
    throw new Error("This wallet does not support SIWS");
  }
  const challenge = await fetch("/auth/siws/challenge", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!challenge.ok) throw new Error("Could not create a sign-in challenge");
  const input: SolanaSignInInput = await challenge.json();
  const output = await adapter.signIn(input);
  const verification = await fetch("/auth/siws/verify", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ output: encodeSignInOutput(output) }),
  });
  if (!verification.ok) throw new Error("Sign-in verification failed");
}
```

`WalletProvider`'s `autoConnect` restores a wallet connection; it is not an authenticated application session. Keep sign-in and server session state separate from connection state. Avoid automatically prompting for signatures on page load.

### SIWS, CAIP-122, and x402

The [x402 Sign-In-With-X extension](https://docs.x402.org/extensions/sign-in-with-x) uses a SIWS-style Solana message within its CAIP-122 authentication flow. Using the format does not imply using the Wallet Standard `signIn` method, this repository's demo, or its verifier dependency. x402's TypeScript implementation signs through `signMessage`/`signMessages` and uses its own verification and transport.

This document's named chain IDs are not an exhaustive definition of every CAIP-122 profile. x402 uses a CAIP-2 Solana genesis-hash reference in its messages. Do not silently substitute one profile's chain representation for another. The original SIWS message grammar and field order remain unchanged; interoperability with other profiles needs explicit wallet testing.

For browser wallets, [Phantom validates recognized SIWS messages](https://docs.phantom.com/solana/signing-a-message#sign-in-with-solana-siws) against the requesting page's exact host, including its port, and checks the URI origin. A mismatch is rejected before prompting. An x402 API origin that differs from the frontend origin needs an explicit integration design and real-wallet tests; raw-key agent signers do not exercise this check. Do not disable origin validation to make a test pass.

## Wallet Integration

### Overview

1. Receive the `signIn` request and construct the SIWS message using the requested fields and the selected account.
2. Parse and validate the message before presenting an approval prompt. Reject malformed messages.
3. Bind the message domain to the requesting page's exact host and the URI, when present, to its origin. Do not offer approval for an origin mismatch.
4. Apply wallet-specific chain and timestamp policy, then request user approval.
5. On approval, return the account, the exact message bytes, and the Ed25519 signature.

Wallet-side checks protect the signing interaction. They do not replace the relying application's server-side checks or single-use challenge policy.

### Dependencies

Use compatible versions of `@solana/wallet-standard-features` and `@solana/wallet-standard-util`. For verification, use util 1.2.0 or later; see [Dependencies](#dependencies) for the runtime requirement and the tested example dependency set.

### Wallet-Standard Wrapper and Provider Method

First step will be to implement a provider method and a wrapper for the `signIn` provider method to make the feature Wallet-Standard compatible. Here's a [sample implementation](https://github.com/anza-xyz/wallet-standard/blob/9d17ab038fb4c39fa08378571de40ea5ad593d46/packages/wallets/ghost/src/wallet.ts#L288) for the Wallet-Standard wrapper:

```tsx
import type {
  SolanaSignInInput,
  SolanaSignInOutput,
} from "@solana/wallet-standard-features";

export class PhantomWallet implements Wallet {
  #signIn: SolanaSignInMethod = async (...inputs) => {
    const outputs: SolanaSignInOutput[] = [];
    if (inputs.length > 1) {
      for (const input of inputs) {
        outputs.push(await this.#phantom.signIn(input));
      }
    } else {
      return [await this.#phantom.signIn(inputs[0])];
    }
    return outputs;
  };
}
```

### Message Construction

Once we have the provider method and the Wallet-Standard wrapper, we can start with the message construction. The message should be constructed following the [ABNF Message format](#abnf-message-format). The construction follows the same algorithm implemented in the [`createSignInMessageText` method](https://github.com/anza-xyz/wallet-standard/blob/9d17ab038fb4c39fa08378571de40ea5ad593d46/packages/core/util/src/signIn.ts#L121) of the `@solana/wallet-standard-util` package.

One thing to note is that although the `domain` and the `address` are not mandatory fields for the `signInInput`, they are mandatory for the constructed message. If these fields are not present in the input, they need to be extracted by the wallet using the requesting domain and address.

```tsx
export function createSignInMessageText(input: SolanaSignInInput): string {
  let message = `${input.domain} wants you to sign in with your Solana account:\n`;
  message += `${input.address}`;

  if (input.statement) {
    message += `\n\n${input.statement}`;
  }

  const fields: string[] = [];
  if (input.uri) {
    fields.push(`URI: ${input.uri}`);
  }
  if (input.version) {
    fields.push(`Version: ${input.version}`);
  }
  if (input.chainId) {
    fields.push(`Chain ID: ${input.chainId}`);
  }
  if (input.nonce) {
    fields.push(`Nonce: ${input.nonce}`);
  }
  if (input.issuedAt) {
    fields.push(`Issued At: ${input.issuedAt}`);
  }
  if (input.expirationTime) {
    fields.push(`Expiration Time: ${input.expirationTime}`);
  }
  if (input.notBefore) {
    fields.push(`Not Before: ${input.notBefore}`);
  }
  if (input.requestId) {
    fields.push(`Request ID: ${input.requestId}`);
  }
  if (input.resources) {
    fields.push(`Resources:`);
    for (const resource of input.resources) {
      fields.push(`- ${resource}`);
    }
  }
  if (fields.length) {
    message += `\n\n${fields.join("\n")}`;
  }

  return message;
}
```

### Message Parsing

Message parsing can be made easy and manageable using an ABNF Parser Generator like apg-js: [https://github.com/ldthomas/apg-js](https://github.com/ldthomas/apg-js).

Wallets can create BNF grammar files and the `apg-js` packages recursively generates parsers for the constructed message.

The grammar for SIWS ABNF messages follows [this](#abnf-message-format) format.

### Message Verification

After parsing, validate the address against the selected account and the domain/URI against the trusted request origin. Parse URI and timestamp strings before checking them; reject malformed values rather than treating them as absent.

Apply the wallet's chain policy and temporal bounds: reject expired messages and messages that are not yet valid, and validate issuance time and the ordering of issuance, not-before, and expiration timestamps when present. Wallet timestamp tolerance is not an application session lifetime.

Relying applications must still verify the signature, bind the signed address to the signing public key, and enforce their own origin, freshness, nonce, and session policies. See the tested [backend helper](example-dapp/server/challenges.ts) and [regression tests](example-dapp/tests/siws.test.ts).

## Full Feature Demo

[https://www.loom.com/share/228d2a4820fb44f69fb10c4fb5f2b55a](https://www.loom.com/share/228d2a4820fb44f69fb10c4fb5f2b55a)

## Reference Implementation

For a publicly reproducible example, run the [local browser playground](example-dapp/README.md#run-locally). [Phantom Sandbox](https://sandbox.phantom.dev/) is the team's maintained QA environment and requires access credentials; it is not a public demo. The former personal Vercel demo is retired.

The local [browser playground](example-dapp/README.md) demonstrates signing, a JSON transport round trip, and local signature verification. It does **not** implement backend authentication or create a server session. A separate [server-only challenge helper](example-dapp/server/challenges.ts) demonstrates the backend policy; it is not a complete production authentication service.

Wallet support varies by platform and version. Detect the `solana:signIn` capability at runtime instead of relying on the original extension-only support note.
