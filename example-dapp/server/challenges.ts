import { randomBytes } from 'node:crypto';
import type { SolanaSignInInput } from '@solana/wallet-standard-features';
import { verifySignIn } from '@solana/wallet-standard-util';
import { decodeSignInOutput } from '../src/utils/signInOutput';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
type Challenge = SolanaSignInInput & { issuedAt: string; expirationTime: string };

/**
 * Server-only reference store, not a production session service.
 * A session ID must come from trusted server session middleware, never a request body.
 * Multiple server instances need shared storage with atomic get-and-delete semantics.
 */
export class InMemorySignInChallenges {
  private readonly pending = new Map<string, Challenge>();
  private readonly origin: URL;

  constructor(origin: string) {
    this.origin = new URL(origin);
    if (!['https:', 'http:'].includes(this.origin.protocol)) {
      throw new Error('SIWS origin must use HTTP or HTTPS');
    }
  }

  issue(sessionId: string): SolanaSignInInput {
    const now = Date.now();
    for (const [id, challenge] of this.pending) {
      if (Date.parse(challenge.expirationTime) <= now) this.pending.delete(id);
    }
    const challenge: Challenge = {
      domain: this.origin.host,
      uri: this.origin.origin,
      version: '1',
      chainId: 'solana:mainnet',
      statement: 'Sign in to this application. This does not authorize a transaction.',
      nonce: randomBytes(16).toString('hex'),
      issuedAt: new Date(now).toISOString(),
      expirationTime: new Date(now + CHALLENGE_TTL_MS).toISOString(),
    };
    // Issuing again replaces the session's previous challenge.
    this.pending.set(sessionId, challenge);
    return { ...challenge };
  }

  verify(sessionId: string, encodedOutput: unknown): string | null {
    const challenge = this.pending.get(sessionId);
    // Consume synchronously before validation, even if the attempt fails.
    // No two verifications can use the same challenge in this process.
    this.pending.delete(sessionId);
    if (!challenge) return null;
    const now = Date.now();
    if (Date.parse(challenge.issuedAt) > now || Date.parse(challenge.expirationTime) <= now) {
      return null;
    }
    try {
      const output = decodeSignInOutput(encodedOutput);
      return verifySignIn(challenge, output) ? output.account.address : null;
    } catch {
      return null;
    }
  }
}
