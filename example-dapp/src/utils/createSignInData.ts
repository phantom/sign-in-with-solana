import type { SolanaSignInInput } from '@solana/wallet-standard-features';

/** Browser playground only. Authentication challenges must come from a backend. */
export const createSignInData = async (): Promise<SolanaSignInInput> => {
  const now = Date.now();
  const origin = new URL(window.location.href);
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('');
  return {
    domain: origin.host,
    uri: origin.origin,
    statement: 'Demonstrate wallet ownership. This does not create an application session or authorize a transaction.',
    version: '1',
    nonce,
    chainId: 'solana:mainnet',
    issuedAt: new Date(now).toISOString(),
    expirationTime: new Date(now + 5 * 60 * 1000).toISOString(),
  };
};

/** Deliberately invalid origin for checking the wallet's phishing protection. */
export const createSignInErrorData = async (): Promise<SolanaSignInInput> => ({
  ...await createSignInData(),
  domain: 'phishing.invalid',
  uri: 'https://phishing.invalid',
});
