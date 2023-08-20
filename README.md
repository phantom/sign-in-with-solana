# Sign-In With Solana

* [Introduction](#introduction)
* [Motivation](#motivation)
* [Specification](#specification)
  * [Sign-In Input Fields](#sign-in-input-fields)
  * [Sign-In Output Fields](#sign-in-output-fields)
  * [ABNF Message Format](#abnf-message-format)
  * [Minimal Message Template](#minimal-message-template)
  * [Maximal Message Template](#maximal-message-template)
* [Dapp Integration](#dapp-integration)
  * [Overview](#overview)
  * [Integration Steps](#integration-steps)
* [Wallet Integration Guide](#wallet-integration-guide)
  * [Overview](#overview-1)
* [Best Practices](#best-practices)
* [Dependencies](#dependencies)
* [Full Feature Demo](#full-feature-demo)
* [Reference Implementation](#reference-implementation) 

## Introduction

Sign In With Solana (SIWS) is a new feature that lets applications authenticate their users and prove ownership of their addresses. The feature aims at standardizing message formats to improve the authentication UX and security, and replaces the traditionally clunky `connect` + `signMessage` flow with a one-click `signIn` method.

## Motivation
Centralised entities like Google, Facebook and X dictate our digital identities. They define our digital identifiers (usernames, email addresses) and exercise control over our data, reputations, and digital footprints. This presents two significant concerns:

1.  Censorship: They possess the power to ban, block, or limit specific users at their discretion
2.  Impedes Innovation: Users and apps are restricted and cannot customize their login experiences or dictate what data they can transfer

A decentralised authentication approach widely used to tackle the above revolves around signing off-chain messages. This approach is safer than entering passwords and entrusting authentication control to the dapp, however, it faces some significant challenges:

1.  The user experience is inconsistent, as every dapp has its unique message format, leaving users unsure of what to expect
2. The lack of standardization in message formats forces wallets to display confusing messages in plaintext, further baffling users
3. Malicious websites pretending as legitimate dapps can trick users into signing messages, and neither the wallet nor the user can intervene

Sign-In With Solana offers a comprehensive solution to these challenges and more. The [technical specification](https://github.com/solana-labs/wallet-standard/blob/alpha/packages/core/features/src/signIn.ts) for SIWS is modeled after [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361) (Sign In With Ethereum) but extends beyond it’s capabilities. SIWS shifts the responsibility of message construction from dapps to the wallet, resulting in consistent, user-friendly inlterfaces and enhanced end-user security.

Additionally, SIWS standardises the message format, which enables wallets to scrutinize message data to ensure its legitimacy or raise red flags for suspicious activity. Domain binding is a key feature of SIWS, enabling wallets to alert users if a website is impersonating another entity


## Specification
### Sign-In Input Fields
To make a sign-in request, dapps do not need to construct a message themselves, unlike EIP-4361 or legacy Solana messages. Rather, dapps construct the `signInInput` object containing a set of standard message parameters. All these fields are optional strings. Dapps can optionally send a minimal (empty) `signInInput` object to the wallet.

- `domain`: Optional EIP-4361 domain requesting the sign-in. The domain includes the subdomain, top-level domain and the port number if present. If not provided, the wallet must determine the domain to include in the message.
- `address`: Optional Solana address performing the sign-in. The address is case-sensitive. If not provided, the wallet must determine the Address to include in the message.
- `statement`: Optional EIP-4361 Statement. The statement is a human readable string and should not have new-line characters (`\n`). If not provided, the wallet must not include Statement in the message.
- `uri`: Optional EIP-4361 URI. The URL that is requesting the sign-in. If not provided, the wallet must not include URI in the message.
- `version`: Optional EIP-4361 version, hardcoded to `1` if provided in the current spec. If not provided, the wallet must not include Version in the message.
- `chainId`: Optional EIP-4361 Chain ID. The chainId can be one of the following: `mainnet`, `testnet`, `devnet`, `localnet`, `solana:mainnet`, `solana:testnet`, `solana:devnet`. If not provided, the wallet must not include Chain ID in the message.
- `nonce`: Optional EIP-4361 Nonce. It should be an alphanumeric string containing a minimum of 8 characters. If not provided, the wallet must not include Nonce in the message.
- `issuedAt`: Optional ISO 8601 datetime string. This represents the time at which the sign-in request was issued to the wallet. If not provided, the wallet must not include Issued At in the message.
- `expirationTime`: Optional ISO 8601 datetime string. This represents the time at which the sign-in request should expire. If not provided, the wallet must not include Expiration Time in the message.
- `notBefore`: Optional ISO 8601 datetime string. This represents the time at which the sign-in request becomes valid. If not provided, the wallet must not include Not Before in the message.
- `requestId`: Optional EIP-4361 Request ID. In addition to using `nonce` to avoid replay attacks, dapps can also choose to include a unique signature in the `requestId` . Once the wallet returns the signed message, dapps can then verify this signature against the state to add an additional, strong layer of security. If not provided, the wallet must not include Request ID in the message.
- `resources`: Optional EIP-4361 Resources. Usually a list of references in the form of URIs that the dapp wants the user to be aware of. These URIs should be separated by `\n-`, ie, URIs in new lines starting with the character `-`. If not provided, the wallet must not include Resources in the message.
    
### Sign-In Output Fields
Once the user is successfully signed-in, the wallet returns back the `signInOutput` object to the dapp, which can be used for verifying the sign-in process.

- `account` [`WalletAccount`]: Account that was signed in. The address of the account may be different from the provided input Address.
- `signedMessage` [`Uint8Array`]: Message bytes that were signed. The wallet is responsible for constructing this message using the `signInInput`.
- `signature` [`Uint8Array`]: Message signature produced. If the signature type is provided, the signature must be Ed25519.
- `signatureType` [`ed25519`]: Optional type of the message signature produced. If not provided, the signature must be Ed25519.

### ABNF Message Format
The Sign-In With Solana message constructed by the wallet using `signInInput` should follow the `sign-in-with-solana` Augment Backus–Naur Form expression:

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
### Overview
1. User chooses one of the standard wallets (wallet standard compatible wallets)
2. Dapp checks if the given wallet has the signIn feature enabled
3. If not, Dapp continues with the legacy authentication mechanism using connect + signMessage
4. Else, Dapp constructs the signInInput which is an object containing a set of standard message parameters as defined in the spec.
5. The Dapp sends this object to the Wallet and requests signIn
6. The Dapp receieves the constructed message, the message signature and the public address of the connected account from the Wallet
7. The Dapp verifies the returned message and the signature against the signInInput provided to the Wallet. This verification happens server-side
8. On successful verification, the authentication process is completed and the user is connected and authenticated to the Dapp

### Integration Steps
SIWS comes with first-class support in both the Solana Wallet Standard and Solana Wallet Adapter libraries. If your dapp makes use of the Solana Wallet Adapter, migration is easy:

1. Update the necessary [dependencies](./dependencies)
2. Add this snippet in your `ContextProvider` :
    
    ```tsx
    import { type SolanaSignInInput } from '@solana/wallet-standard-features';
    import { verifySignIn } from '@solana/wallet-standard-util';
    
    const autoSignIn = useCallback(async (adapter: Adapter) => {
         if (!('signIn' in adapter)) return true;
    
         // For demo purposes only: The signInInput should be generated server-side.
         const input: SolanaSignInInput = {
              statement: "Welcome to Drip!"
         };
         const output = await adapter.signIn(input);
    			
         // For demo purposes only: The sign-in verification should happen server-side.
         if (!verifySignIn(input, output)) throw new Error('Sign In verification failed!');
    
         return false;
    }, []);
    ```
    
    This callback function determines whether a user should be auto-connected (returns `true`) or prompted to sign-in (returns `false`). It does this by:
    
    - Checking if the user’s wallet supports the `signIn` feature.
        - If `signIn` is not available, this callback returns `true`
    - If `signIn` is available, checking if:
        - The `SolanaSignInInput` object is prepared
        - The input is passed into the `signIn` method
        - The output is verified using the `verifySignIn` [method](https://github.com/solana-labs/wallet-standard/blob/alpha/packages/core/util/src/verify.ts)
        - If all of the above, the callback returns `false` and the user is prompted to sign-in

3. Pass `autoSignIn` to `WalletProvider` like so:

```tsx
<WalletProvider
     wallets={wallets}
     onError={onError}
     autoConnect={autoSignIn}
>
```

## Wallet Integration Guide
### Overview
1. The Wallet receieves the signIn request from the dapp
2. The Wallet constructs a message in the ABNF format using the message parameter strings
3. The constructed message is parsed to check if the construction follows the standard ABNF format and is consistent with the spec
4. If parsing fails, the user is not shown the signIn prompt and the wallet throws an RPC error
5. Else, the parsed parameters are verified to follow the correct format and predefined thresholds
6. If verification is successful, the Wallet prompts the user with the signIn request, showing the message statement and the advanced details hidden by default. No errors are shown
7. If verification fails, the user is still prompted, but is shown the verification errors
8. In both cases, the user is able to either accept the signIn request or decline the request
9. In case the user accepts the request, the wallet connects the user to the Dapp and signs the constructed message
10. The Wallet returns the constructed message, the message signature and the public address of the connected account back to the Dapp

## Best Practices

- In a production application, both `SolanaSignInInput` generation and `SolanaSignInOutput` verification **should happen** **server-side**. Client-side verification should not be relied upon due to its inherent security flaws. Developers can make use of the asynchronous nature of the `autoSignIn` callback to make a request to the server to obtain SIWS params, and make another request to the server to perform verification of the SIWS input and output.
- When generating `SolanaSignInInput`, developers should include as many fields as possible. Each field adds an extra layer of security to protect users against various forms of attacks. Examples of these fields include `nonce`, `chainId`, `issuedAt`, `expirationTime`, and `requestId`.

## Dependencies
These dependencies need to be added to your `package.json`:

```json
"@solana/wallet-adapter-base": "0.9.23",
"@solana/wallet-adapter-react": "0.15.34",
"@solana/wallet-standard-features": "1.1.0",
"@solana/wallet-standard-util": "1.1.0",
```

The following configs will be important while testing as some packages like `@solana/wallet-adapter-material-ui` and `@solana/wallet-adapter-react-ui`  use older versions of the react and base packages and may cause conflicts.

```json
"resolutions": {
  "@solana/wallet-adapter-react": "0.15.34",
  "@solana/wallet-adapter-base": "0.9.23"
  
},
"overrides": {
  "@solana/wallet-adapter-react": "0.15.34",
  "@solana/wallet-adapter-base": "0.9.23"
}
```

## Full Feature Demo

[https://www.loom.com/share/228d2a4820fb44f69fb10c4fb5f2b55a?sid=21478434-bd5f-438d-a526-0b2439b2cde8](https://www.loom.com/share/228d2a4820fb44f69fb10c4fb5f2b55a?sid=21478434-bd5f-438d-a526-0b2439b2cde8)

## Reference Implementation
App: [https://siws.vercel.app/](https://siws.vercel.app/)