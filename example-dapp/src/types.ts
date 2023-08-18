import { PublicKey } from '@solana/web3.js';
import { SolanaSignInInput } from "@solana/wallet-standard-features";

type DisplayEncoding = 'utf8' | 'hex';

type PhantomEvent = 'connect' | 'disconnect' | 'accountChanged';

type PhantomRequestMethod =
  | 'connect'
  | 'disconnect'
  | 'signMessage'
  | 'signIn';

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

export interface Provider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signMessage: (message: Uint8Array | string, display?: DisplayEncoding) => Promise<Uint8Array>;
  signIn: (signInData: SolanaSignInInput) => Promise<{
    address: PublicKey, signedMessage: Uint8Array, signature: Buffer
  }>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

export type Status = 'success' | 'warning' | 'error' | 'info';

export interface TLog {
  status: Status;
  method?: PhantomRequestMethod | Extract<PhantomEvent, 'accountChanged'>;
  confirmation?: {signature: string, link: string};
  message: string;
  messageTwo?: string;
}
