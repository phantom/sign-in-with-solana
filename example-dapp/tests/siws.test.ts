import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';
import type { SolanaSignInInput, SolanaSignInOutput } from '@solana/wallet-standard-features';
import { createSignInMessageText, parseSignInMessage, verifySignIn } from '@solana/wallet-standard-util';
import bs58 from 'bs58';
import { InMemorySignInChallenges } from '../server/challenges';
import { decodeSignInOutput, encodeSignInOutput } from '../src/utils/signInOutput';
import { createSignInData } from '../src/utils/createSignInData';

function signedOutput(input: SolanaSignInInput, claimedAddress?: string): SolanaSignInOutput {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const bytes = new Uint8Array(publicKey.export({ type: 'spki', format: 'der' }).subarray(-32));
  const address = claimedAddress ?? bs58.encode(bytes);
  const signedMessage = new TextEncoder().encode(createSignInMessageText({
    ...input,
    domain: input.domain!,
    address,
  }));
  return {
    account: { address, publicKey: bytes, chains: [], features: [] },
    signedMessage,
    signature: new Uint8Array(sign(null, signedMessage, privateKey)),
  };
}

function wire(output: SolanaSignInOutput): unknown {
  return JSON.parse(JSON.stringify(encodeSignInOutput(output)));
}

test('base58 transport preserves verification bytes across a JSON round trip', () => {
  const store = new InMemorySignInChallenges('https://example.com');
  const input = store.issue('session');
  const output = signedOutput(input);
  const decoded = decodeSignInOutput(wire(output));
  assert.deepEqual(decoded.account.publicKey, output.account.publicKey);
  assert.deepEqual(decoded.signedMessage, output.signedMessage);
  assert.deepEqual(decoded.signature, output.signature);
  assert.equal(decoded.signatureType, 'ed25519');
  assert.equal(verifySignIn(input, decoded), true);
  // The old raw Uint8Array JSON representation must not silently decode to empty arrays.
  assert.throws(() => decodeSignInOutput(JSON.parse(JSON.stringify(output))));
});

test('malformed, oversized, and unsupported transport values fail closed', () => {
  const output = encodeSignInOutput(signedOutput({ domain: 'example.com' }));
  for (const invalid of [
    null,
    {},
    { ...output, account: { ...output.account, publicKey: '0-not-base58' } },
    { ...output, signature: '1' },
    { ...output, signature: '1'.repeat(89) },
    { ...output, signedMessage: '' },
    { ...output, signedMessage: '1'.repeat(12001) },
    { ...output, signedMessage: '1'.repeat(8193) },
    { ...output, signatureType: 'secp256k1' },
  ]) {
    assert.throws(() => decodeSignInOutput(invalid));
  }
});

test('verification binds the account address, signed address, and signing public key', () => {
  const input = { domain: 'example.com', nonce: 'randomChallenge123' };
  const valid = signedOutput(input);
  const otherAddress = '11111111111111111111111111111111';
  assert.equal(verifySignIn(input, valid), true);
  assert.equal(verifySignIn(input, {
    ...valid,
    account: { ...valid.account, address: otherAddress },
  }), false);
  // A real signature by another key over a message claiming this address is not ownership proof.
  assert.equal(verifySignIn(input, signedOutput(input, otherAddress)), false);
});

test('challenges are fresh, origin-bound, short-lived, and single-use', () => {
  const store = new InMemorySignInChallenges('https://example.com:8443');
  const input = store.issue('session');
  const other = store.issue('other-session');
  assert.match(input.nonce!, /^[a-f0-9]{32}$/);
  assert.notEqual(input.nonce, other.nonce);
  assert.equal(input.domain, 'example.com:8443');
  assert.equal(input.uri, 'https://example.com:8443');
  assert.equal(Date.parse(input.expirationTime!) - Date.parse(input.issuedAt!), 300000);
  const output = signedOutput(input);
  assert.equal(store.verify('session', wire(output)), output.account.address);
  assert.equal(store.verify('session', wire(output)), null);
});

test('a proof cannot be used in another anonymous session', () => {
  const store = new InMemorySignInChallenges('https://example.com');
  const output = signedOutput(store.issue('session-a'));
  store.issue('session-b');
  assert.equal(store.verify('session-b', wire(output)), null);
  assert.equal(store.verify('session-a', wire(output)), output.account.address);
});

test('a failed attempt consumes the challenge; issuing again invalidates the old one', () => {
  const store = new InMemorySignInChallenges('https://example.com');
  const output = signedOutput(store.issue('session'));
  assert.equal(store.verify('session', { signature: 'malformed' }), null);
  assert.equal(store.verify('session', wire(output)), null);
  const old = signedOutput(store.issue('session'));
  store.issue('session');
  assert.equal(store.verify('session', wire(old)), null);
});

test('client changes to expected challenge fields cannot authorize a login', () => {
  for (const patch of [
    { domain: 'other.example.com' },
    { uri: 'https://other.example.com' },
    { nonce: 'clientChosenNonce' },
    { chainId: 'solana:devnet' },
    { expirationTime: '2099-01-01T00:00:00.000Z' },
    { statement: 'A different purpose' },
  ]) {
    const store = new InMemorySignInChallenges('https://example.com');
    const input = store.issue('session');
    const output = signedOutput({ ...input, ...patch });
    assert.equal(store.verify('session', wire(output)), null);
  }
});

test('mutating the issued object does not change the server-held challenge', () => {
  const store = new InMemorySignInChallenges('https://example.com');
  const input = store.issue('session');
  const output = signedOutput(input);
  Object.assign(input, { nonce: 'changedByClient' });
  assert.equal(store.verify('session', wire(output)), output.account.address);
});

test('expired and not-yet-issued challenges are rejected even with valid signatures', t => {
  const now = Date.parse('2026-01-01T00:00:00.000Z');
  t.mock.timers.enable({ apis: ['Date'], now });
  const store = new InMemorySignInChallenges('https://example.com');
  const expired = signedOutput(store.issue('expired'));
  t.mock.timers.setTime(now + 300000);
  assert.equal(store.verify('expired', wire(expired)), null);
  const future = signedOutput(store.issue('future'));
  t.mock.timers.setTime(now);
  assert.equal(store.verify('future', wire(future)), null);
});

test('tampered signatures are rejected', () => {
  const store = new InMemorySignInChallenges('https://example.com');
  const output = signedOutput(store.issue('session'));
  const signature = new Uint8Array(output.signature);
  signature[0] ^= 1;
  assert.equal(store.verify('session', wire({ ...output, signature })), null);
});

test('browser playground inputs use fresh nonces and the page origin, including its port', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { href: 'http://localhost:3000/demo' } },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  });
  const first = await createSignInData();
  const second = await createSignInData();
  assert.equal(first.domain, 'localhost:3000');
  assert.equal(first.uri, 'http://localhost:3000');
  assert.match(first.nonce!, /^[a-f0-9]{32}$/);
  assert.notEqual(first.nonce, second.nonce);
});

test('minimal and maximal message templates preserve field order and round-trip', () => {
  const address = '11111111111111111111111111111111';
  const minimal = { domain: 'example.com', address };
  assert.equal(createSignInMessageText(minimal), `example.com wants you to sign in with your Solana account:\n${address}`);
  const maximal = {
    ...minimal,
    statement: 'Sign in to example.com',
    uri: 'https://example.com',
    version: '1',
    chainId: 'solana:mainnet',
    nonce: '0123456789abcdef',
    issuedAt: '2026-01-01T00:00:00.000Z',
    expirationTime: '2026-01-01T00:05:00.000Z',
    notBefore: '2026-01-01T00:00:00.000Z',
    requestId: 'request-1',
    resources: ['https://example.com/profile', 'https://example.com/terms'],
  };
  const message = `example.com wants you to sign in with your Solana account:\n${address}\n\nSign in to example.com\n\nURI: https://example.com\nVersion: 1\nChain ID: solana:mainnet\nNonce: 0123456789abcdef\nIssued At: 2026-01-01T00:00:00.000Z\nExpiration Time: 2026-01-01T00:05:00.000Z\nNot Before: 2026-01-01T00:00:00.000Z\nRequest ID: request-1\nResources:\n- https://example.com/profile\n- https://example.com/terms`;
  assert.equal(createSignInMessageText(maximal), message);
  assert.deepEqual(parseSignInMessage(new TextEncoder().encode(message)), maximal);
});
