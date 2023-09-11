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
  - [Context Provider](#context-provider-frontend)
  - [Wallet Provider](#wallet-provider-frontend)
- [Wallet Integration](#wallet-integration-guide)
  - [Overview](#overview-1)
  - [Dependencies](#dependencies-1)
  - [Wallet-Standard Wrapper and Provider Method](#wallet-standard-wrapper-and-provider-method)
  - [Message Construction](#message-construction)
  - [Message Parsing](#message-parsing)
  - [Message Verification](#message-verification)
- [Full Feature Demo](#full-feature-demo)
- [Reference Implementation](#reference-implementation)

## Introduction

Sign In With Solana (SIWS) is a new feature that lets applications authenticate their users and prove ownership of their addresses. SIWS aims to standardize message formats in order to improve authentication UX and security, replacing the traditionally clunky `connect` + `signMessage` flow with a one-click `signIn` method.

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

Unlike EIP-4361 or legacy Solana messages, dapps do not need to construct a message themselves in order to make a sign-in request. Rather, dapps construct the `signInInput` object containing a set of standard message parameters. All these fields are optional strings. Dapps can optionally send a minimal (empty) `signInInput` object to the wallet.

- `domain`: Optional EIP-4361 domain requesting the sign-in. If not provided, the wallet must determine the domain to include in the message.
- `address`: Optional Solana address performing the sign-in. The address is case-sensitive. If not provided, the wallet must determine the Address to include in the message.
- `statement`: Optional EIP-4361 Statement. The statement is a human readable string and should not have new-line characters (`\n`). If not provided, the wallet must not include Statement in the message.
- `uri`: Optional EIP-4361 URI. The URL that is requesting the sign-in. If not provided, the wallet must not include URI in the message.
- `version`: Optional EIP-4361 version. If not provided, the wallet must not include Version in the message.
- `chainId`: Optional EIP-4361 Chain ID. The chainId can be one of the following: `mainnet`, `testnet`, `devnet`, `localnet`, `solana:mainnet`, `solana:testnet`, `solana:devnet`. If not provided, the wallet must not include Chain ID in the message.
- `nonce`: Optional EIP-4361 Nonce. It should be an alphanumeric string containing a minimum of 8 characters. If not provided, the wallet must not include Nonce in the message.
- `issuedAt`: Optional ISO 8601 datetime string. This represents the time at which the sign-in request was issued to the wallet. Note: For Phantom, issuedAt has a threshold and it should be within +- 10 minutes from the timestamp at which verification is taking place. If not provided, the wallet must not include Issued At in the message.
- `expirationTime`: Optional ISO 8601 datetime string. This represents the time at which the sign-in request should expire. If not provided, the wallet must not include Expiration Time in the message.
- `notBefore`: Optional ISO 8601 datetime string. This represents the time at which the sign-in request becomes valid. If not provided, the wallet must not include Not Before in the message.
- `requestId`: Optional EIP-4361 Request ID. In addition to using `nonce` to avoid replay attacks, dapps can also choose to include a unique signature in the `requestId` . Once the wallet returns the signed message, dapps can then verify this signature against the state to add an additional, strong layer of security. If not provided, the wallet must not include Request ID in the message.
- `resources`: Optional EIP-4361 Resources. Usually a list of references in the form of URIs that the dapp wants the user to be aware of. These URIs should be separated by `\n-`, ie, URIs in new lines starting with the character `-`. If not provided, the wallet must not include Resources in the message.

### Sign-In Output Fields

Once the user is successfully signed-in, the wallet returns back the `signInOutput` object to the dapp, which can be used for verifying the sign-in process.

- `account` [`WalletAccount`]: Account that was signed in. The address of the account may be different from the provided input Address.
- `signedMessage` [`Uint8Array`]: Message bytes that were signed. The wallet is responsible for constructing this message using the `signInInput`.
- `signature` [`Uint8Array`]: Message signature produced. If the signature type is not provided, the signature must be Ed25519.
- `signatureType` [`"ed25519"`]: Optional type of the message signature produced. If not provided, the signature must be Ed25519.

### ABNF Message Format

The Sign In With Solana message constructed by the wallet using `signInInput` should follow the `sign-in-with-solana` Augment Backus–Naur Form expression:

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

SIWS comes with first-class support in both the [Solana Wallet Standard](https://github.com/solana-labs/wallet-standard) and [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter) libraries. If your dapp makes use of the Solana Wallet Adapter, migration is easy.

### Overview

1. User chooses one of the standard wallets (Wallet Standard compatible wallets)
2. Dapp checks if the given wallet has the `signIn` feature enabled
3. If not, Dapp continues with the legacy authentication mechanism using `connect` + `signMessage`
4. Else, Dapp constructs the `signInInput` which is an object containing a set of standard message parameters as defined in the spec.
5. The Dapp sends this object to the Wallet and requests `signIn`
6. The Dapp receives the constructed message, the message signature and the public address of the connected account from the Wallet
7. The Dapp verifies the returned message and the signature against the `signInInput` provided to the Wallet. This verification happens server-side
8. On successful verification, the authentication process is completed and the user is connected and authenticated to the Dapp

### Dependencies

The first step is to update the necessary dependencies. Add/update these in your `package.json`:

```json
"@solana/wallet-adapter-base": "0.9.23",
"@solana/wallet-adapter-react": "0.15.34",
"@solana/wallet-standard-features": "1.1.0",
"@solana/wallet-standard-util": "1.1.0",
```

### Sign-In Input Generation (Backend)

The Sign-In input object should be generated server-side. In most cases, the object can be empty and thus the input generation step can be skipped. Create the following endpoint on your backend server:

```tsx
import { SolanaSignInInput } from "@solana/wallet-standard-features";

export const createSignInData = async (): Promise<SolanaSignInInput> => {
  const now: Date = new Date();
  const uri = window.location.href;
  const currentUrl = new URL(uri);
  const domain = currentUrl.host;

  // Convert the Date object to a string
  const currentDateTime = now.toISOString();

  // signInData can be kept empty in most cases: all fields are optional
  // const signInData: SolanaSignInInput = {};

  const signInData: SolanaSignInInput = {
    domain,
    statement:
      "Clicking Sign or Approve only means you have proved this wallet is owned by you. This request will not trigger any blockchain transaction or cost any gas fee.",
    version: "1",
    nonce: "oBbLoEldZs",
    chainId: "mainnet",
    issuedAt: currentDateTime,
    resources: ["https://example.com", "https://phantom.app/"],
  };

  return signInData;
};
```

### Sign-In Output Verification (Backend)

Legacy message verification on Solana is tedious and dapps have to verify using the `tweetnacl` library as follows:

```tsx
const verified = nacl.sign.detached.verify(
  new TextEncoder().encode(message),
  bs58.decode(signature),
  bs58.decode(public_key)
);
```

Sign In With Solana improves the developer experience by providing a helper method implementation for message and signature verification: [`verifySignIn`](https://github.com/solana-labs/wallet-standard/blob/master/packages/core/util/src/signIn.ts#L8). This method is available in the `@solana/wallet-standard-util` package. Under-the-hood, the `verifySignIn` method:

1. Parses and deconstructs the `signedMessage` field of the `output` (ie, the constructed message returned by the wallet)
2. Checks the extracted fields against the fields in the `input`
3. Re-constructs the message according to the ABNF Message Format
4. Verifies the message signature

With all the complexity abstracted away, make a simple backend endpoint calling the `verifySignIn` method as follows:

```tsx
import type {
  SolanaSignInInput,
  SolanaSignInOutput,
} from "@solana/wallet-standard-features";
import { verifySignIn } from "@solana/wallet-standard-util";

export function verifySIWS(
  input: SolanaSignInInput,
  output: SolanaSignInOutput
): boolean {
  const serialisedOutput: SolanaSignInOutput = {
    account: {
      publicKey: new Uint8Array(output.account.publicKey),
      ...output.account
    },
    signature: new Uint8Array(output.signature),
    signedMessage: new Uint8Array(output.signedMessage),
  };
  return verifySignIn(input, serialisedOutput);
}
```

### Context Provider (Frontend)

Add the following `autoSignIn` callback method to your `ContextProvider`:

```tsx
import { type SolanaSignInInput } from "@solana/wallet-standard-features";
import { verifySignIn } from "@solana/wallet-standard-util";

const autoSignIn = useCallback(async (adapter: Adapter) => {
  // If the signIn feature is not available, return true
  if (!("signIn" in adapter)) return true;

  // Fetch the signInInput from the backend
  const createResponse = await fetch("/backend/createSignInData");

  const input: SolanaSignInInput = await createResponse.json();

  // Send the signInInput to the wallet and trigger a sign-in request
  const output = await adapter.signIn(input);

  // Verify the sign-in output against the generated input server-side
  let strPayload = JSON.stringify({ input, output });
  const verifyResponse = await fetch("/backend/verifySIWS", {
    method: "POST",
    body: strPayload,
  });
  const success = await verifyResponse.json();

  // If verification fails, throw an error
  if (!success) throw new Error("Sign In verification failed!");

  return false;
}, []);
```

This callback function determines whether a user should be auto-connected (returns `true`) or prompted to sign-in (returns `false`).

- Check if the user’s wallet supports the `signIn` feature.
  - If `signIn` is not available, this callback returns `true`
- If `signIn` is available:
  - Create the `SolanaSignInInput` object server-side
  - The input is passed into the `signIn` method and the sign-in request is triggered
  - The output is verified using the `verifySignIn` [method](https://github.com/solana-labs/wallet-standard/blob/master/packages/core/util/src/signIn.ts#L8) server-side
  - If all of the above, the callback returns `false` and the user is prompted to sign-in

### Wallet Provider (Frontend)

Pass `autoSignIn` callback to the `autoConnect` attribute of `WalletProvider`:

```tsx
<WalletProvider
    wallets={wallets}
    onError={onError}
    autoConnect={autoSignIn}
>
```

When the connecting wallet does not support the `signIn` feature, `autoSignIn` returns `true` and thus the wallet goes on to `autoConnect` to the dapp, rather than `signIn`.

## Wallet Integration

### Overview

1. The Wallet receieves the `signIn` request from the dapp
2. The Wallet constructs a message in the ABNF format using the message parameter strings
3. The constructed message is parsed to check if the construction follows the standard ABNF format and is consistent with the spec
4. If parsing fails, the user is not shown the `signIn` prompt and the wallet throws an RPC error
5. Else, the parsed parameters are verified to follow the correct format and predefined thresholds
6. If verification is successful, the Wallet prompts the user with the `signIn` request, showing the message statement and the advanced details hidden by default. No errors are shown
7. If verification fails, the user is still prompted, but is shown the verification errors
8. In both cases, the user is able to either accept the signIn request or decline the request
9. In case the user accepts the request, the wallet connects the user to the Dapp and signs the constructed message
10. The Wallet returns the constructed message, the message signature and the public address of the connected account back to the Dapp

### Dependencies

Wallets will need to upgrade the following packages:

```json
"@solana/wallet-standard-features": "1.1.0",
"@solana/wallet-standard-util": "1.1.0",
```

### Wallet-Standard Wrapper and Provider Method

First step will be to implement a provider method and a wrapper for the `signIn` provider method to make the feature Wallet-Standard compatible. Here's a [sample implementation](https://github.com/solana-labs/wallet-standard/blob/9d17ab038fb4c39fa08378571de40ea5ad593d46/packages/wallets/ghost/src/wallet.ts#L288) for the Wallet-Standard wrapper:

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

Once we have the provider method and the Wallet-Standard wrapper, we can start with the message construction. The message should be constructed following the [ABNF Message format](#abnf-message-format). The construction follows the same algorithm implemented in the [`createSignInMessageText` method](https://github.com/solana-labs/wallet-standard/blob/9d17ab038fb4c39fa08378571de40ea5ad593d46/packages/core/util/src/signIn.ts#L121) of the `@solana/wallet-standard-utils` package.

One thing to note is that although the `domain` and the `address` are not mandatory fields for the `signInInput`, they are mandatory for the constucted message. If these fields are not present in the input, they need to be extracted by the wallet using the requesting domain and address.

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

Once successfully parsed, individual message fields should be verified against predefined thresholds and conditions. Here is a sample implementation of the verification method:

```tsx
export function verify(data: SolanaSignInInput, opts: VerificationOptions) {
  const { expectedAddress, expectedURL, expectedChainId, issuedAtThreshold } =
    opts;
  const errors: VerificationErrorType[] = [];
  const now = Date.now();

  // verify if parsed address is same as the expected address
  if (data.address !== expectedAddress) {
    errors.push(VerificationErrorType.ADDRESS_MISMATCH);
  }

  // verify if parsed domain is same as the expected domain
  if (data.domain !== expectedURL.host) {
    errors.push(VerificationErrorType.DOMAIN_MISMATCH);
  }

  // verify if parsed uri is same as the expected uri
  if (data.uri && data.uri.origin !== expectedURL.origin) {
    errors.push(VerificationErrorType.URI_MISMATCH);
  }

  // verify if parsed chainId is same as the expected chainId
  if (data.chainId && data.chainId !== expectedChainId) {
    errors.push(VerificationErrorType.CHAIN_ID_MISMATCH);
  }

  // verify if parsed issuedAt is within +- issuedAtThreshold of the current timestamp
  // NOTE: Phantom's issuedAtThreshold is 10 minutes
  if (data.issuedAt) {
    const iat = data.issuedAt.getTime();
    if (Math.abs(iat - now) > issuedAtThreshold) {
      if (iat < now) {
        errors.push(VerificationErrorType.ISSUED_TOO_FAR_IN_THE_PAST);
      } else {
        errors.push(VerificationErrorType.ISSUED_TOO_FAR_IN_THE_FUTURE);
      }
    }
  }

  // verify if parsed expirationTime is:
  // 1. after the current timestamp
  // 2. after the parsed issuedAt
  // 3. after the parsed notBefore
  if (data.expirationTime) {
    const exp = data.expirationTime.getTime();
    if (exp <= now) {
      errors.push(VerificationErrorType.EXPIRED);
    }
    if (data.issuedAt && exp < data.issuedAt.getTime()) {
      errors.push(VerificationErrorType.EXPIRES_BEFORE_ISSUANCE);
    }
    // Not Before
    if (data.notBefore) {
      const nbf = data.notBefore.getTime();
      if (nbf > exp) {
        errors.push(VerificationErrorType.VALID_AFTER_EXPIRATION);
      }
    }
  }

  return errors;
}
```

## Full Feature Demo

[https://www.loom.com/share/228d2a4820fb44f69fb10c4fb5f2b55a](https://www.loom.com/share/228d2a4820fb44f69fb10c4fb5f2b55a)

## Reference Implementation

You can find the source code for the example implementation [here](https://github.com/phantom/sign-in-with-solana/tree/main/example-dapp).

You can play around with SIWS here: [https://siws.vercel.app/](https://siws.vercel.app/).
Note: Currently SIWS is only supported on Phantom extension (version >=23.11.0)
