import type { SolanaSignInOutput } from '@solana/wallet-standard-features';
import bs58 from 'bs58';

/** Only the fields needed for verification cross the HTTP boundary. */
export interface EncodedSignInOutput {
  account: { address: string; publicKey: string };
  signedMessage: string;
  signature: string;
  signatureType: 'ed25519';
}

export function encodeSignInOutput(output: SolanaSignInOutput): EncodedSignInOutput {
  return {
    account: {
      address: output.account.address,
      publicKey: bs58.encode(new Uint8Array(output.account.publicKey)),
    },
    signedMessage: bs58.encode(output.signedMessage),
    signature: bs58.encode(output.signature),
    signatureType: output.signatureType ?? 'ed25519',
  };
}

function decodeBytes(value: unknown, maxEncodedLength: number): Uint8Array {
  if (typeof value !== 'string' || !value.length || value.length > maxEncodedLength) {
    throw new Error('Invalid SIWS byte encoding');
  }
  return bs58.decode(value);
}

export function decodeSignInOutput(value: unknown): SolanaSignInOutput {
  const output = value as EncodedSignInOutput | undefined;
  if (!output || typeof output.account?.address !== 'string' || output.account.address.length > 44) {
    throw new Error('Invalid SIWS account');
  }
  if (output.signatureType !== undefined && output.signatureType !== 'ed25519') {
    throw new Error('Unsupported SIWS signature type');
  }

  const publicKey = decodeBytes(output.account.publicKey, 44);
  const signature = decodeBytes(output.signature, 88);
  const signedMessage = decodeBytes(output.signedMessage, 12000);
  if (publicKey.length !== 32 || signature.length !== 64 || signedMessage.length > 8192) {
    throw new Error('Invalid SIWS byte lengths');
  }

  return {
    account: {
      address: output.account.address,
      publicKey,
      // Wallet discovery metadata is not used for authentication.
      chains: [],
      features: [],
    },
    signedMessage,
    signature,
    signatureType: 'ed25519',
  };
}
