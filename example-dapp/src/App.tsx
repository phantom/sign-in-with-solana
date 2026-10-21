import React, { useState, useCallback, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { verifySignIn } from '@solana/wallet-standard-util';

import {
  createSignInData,
  createSignInErrorData,
} from './utils';

import { TLog } from './types';

import { Logs, Sidebar } from './components';
import { encodeSignInOutput, decodeSignInOutput } from './utils/signInOutput';

// =============================================================================
// Styled Components
// =============================================================================

const StyledApp = styled.div`
  display: flex;
  flex-direction: row;
  height: 100vh;
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

// =============================================================================
// Constants
// =============================================================================

const message = 'To avoid digital dognappers, sign below to authenticate with CryptoCorgis.';

// =============================================================================
// Typedefs
// =============================================================================

export type ConnectedMethods =
  | {
    name: string;
    onClick: () => Promise<string>;
  }
  | {
    name: string;
    onClick: () => Promise<void>;
  };


const StatelessApp = () => {
  const { wallet, publicKey, disconnect, signMessage, signIn } = useWallet();
  const [logs, setLogs] = useState<TLog[]>([]);

  const createLog = useCallback(
    (log: TLog) => {
      return setLogs((logs) => [...logs, log]);
    },
    [setLogs]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, [setLogs]);

  useEffect(() => {
    if (!publicKey || !wallet) return;

    createLog({
      status: 'success',
      method: 'connect',
      message: `Connected to account ${publicKey.toBase58()}`,
    });
  }, [createLog, publicKey, wallet]);

  /** SignMessage */
  const handleSignMessage = useCallback(async () => {
    if (!publicKey || !wallet) return;

    try {
      if (!signMessage) throw new Error('This wallet does not support message signing.');
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);

      createLog({
        status: 'success',
        method: 'signMessage',
        message: `Message signed with signature: ${JSON.stringify(signature)}`,
      });
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signMessage',
        message: error.message,
      });
    }
  }, [createLog, publicKey, signMessage, wallet]);

  /** SignIn */
  const handleSignIn = useCallback(async () => {
    if (!publicKey || !wallet) return;
    try {
      if (!signIn) throw new Error('This wallet does not support SIWS. Connecting alone is not authentication.');
      const input = await createSignInData();
      const output = await signIn(input);
      // Exercise the actual wire format, not the wallet's original typed arrays.
      const received = JSON.parse(JSON.stringify(encodeSignInOutput(output)));
      const decoded = decodeSignInOutput(received);
      if (!verifySignIn(input, decoded)) throw new Error('Sign-in verification failed.');
      createLog({
        status: 'success',
        method: 'signIn',
        message: `Locally verified signature for ${decoded.account.address}. Demo only: no backend session was created.`,
      });
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signIn',
        message: error.message,
      });
    }
  }, [createLog, publicKey, signIn, wallet]);

  /** SignInError */
  const handleSignInError = useCallback(async () => {
    if (!publicKey || !wallet) return;
    try {
      if (!signIn) throw new Error('This wallet does not support SIWS.');
      await signIn(await createSignInErrorData());
      createLog({
        status: 'warning',
        method: 'signIn',
        message: 'Wallet signed the deliberately mismatched-origin request. This must not be accepted as authentication.',
      });
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signIn',
        message: error.message,
      });
    }
  }, [createLog, publicKey, signIn, wallet]);

  /** Disconnect */
  const handleDisconnect = useCallback(async () => {
    if (!publicKey || !wallet) return;

    try {
      await disconnect();
      createLog({
        status: 'warning',
        method: 'disconnect',
        message: '👋',
      });
    } catch (error) {
      createLog({
        status: 'error',
        method: 'disconnect',
        message: error.message,
      });
    }
  }, [createLog, disconnect, publicKey, wallet]);

  const connectedMethods = useMemo(() => {
    return [
      {
        name: 'Sign Message',
        onClick: handleSignMessage,
      },
      {
        name: 'Sign In',
        onClick: handleSignIn,
      },
      {
        name: 'Sign In Error',
        onClick: handleSignInError,
      },
      {
        name: 'Disconnect',
        onClick: handleDisconnect,
      },
    ];
  }, [
    handleSignMessage,
    handleSignIn,
    handleSignInError,
    handleDisconnect,
  ]);

  return (
    <StyledApp>
      <Sidebar publicKey={publicKey} connectedMethods={connectedMethods} />
      <Logs publicKey={publicKey} logs={logs} clearLogs={clearLogs} />
    </StyledApp>
  );
};

// =============================================================================
// Main Component
// =============================================================================
const App = () => {
  const endpoint = 'https://api.mainnet-beta.solana.com';
  const wallets = useMemo(() => [], []); // Discover Wallet Standard wallets.

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <StatelessApp />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;
