'use client';

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import {
  StellarWalletsKit,
  Networks,
} from '@creit.tech/stellar-wallets-kit';
import { FREIGHTER_ID, FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { AlbedoModule } from '@creit.tech/stellar-wallets-kit/modules/albedo';
import { xBullModule } from '@creit.tech/stellar-wallets-kit/modules/xbull';
import { LobstrModule } from '@creit.tech/stellar-wallets-kit/modules/lobstr';
import { fetchAccountDetails } from '@/lib/horizon';
import { WalletState } from '@/lib/types';
import { Analytics } from '@/lib/analytics';

interface WalletContextValue {
  walletState: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  signTransaction: (xdr: string) => Promise<string>;
  isConnecting: boolean;
}

const initialWalletState: WalletState = {
  address: null,
  isConnected: false,
  balance: null,
  network: 'testnet',
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletState, setWalletState] = useState<WalletState>(initialWalletState);
  const [isConnecting, setIsConnecting] = useState(false);
  useMemo(() => {
    StellarWalletsKit.init({
      network: Networks.TESTNET,
      modules: [
        new FreighterModule(),
        new AlbedoModule(),
        new xBullModule(),
        new LobstrModule(),
      ],
    });
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!walletState.address) return;
    try {
      const { balance } = await fetchAccountDetails(walletState.address);
      setWalletState((current) => ({ ...current, balance }));
    } catch (err) {
      console.warn('Failed to refresh balance (normal for unfunded wallets):', err);
    }
  }, [walletState.address]);

  const connect = useCallback(async () => {
      setIsConnecting(true);
    try {
      const { address } = await StellarWalletsKit.authModal();
      let balance = '0';
      try {
        const details = await fetchAccountDetails(address);
        balance = details.balance;
      } catch (err) {
        console.warn('Account details fetch failed (normal for unfunded wallets):', err);
      }
      setWalletState({
        address,
        isConnected: true,
        balance,
        network: 'testnet',
      });
      Analytics.walletConnected('stellar-wallets-kit');
    } catch (err) {
      console.error('Wallet connection failed:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    StellarWalletsKit.disconnect().catch(() => undefined);
    setWalletState(initialWalletState);
  }, []);

  const signTransaction = useCallback(
    async (xdr: string): Promise<string> => {
      const result = await StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase: 'Test SDF Network ; September 2015',
      });
      if (typeof result === 'string') {
        return result;
      }
      if (result && typeof result === 'object') {
        const resObj = result as any;
        if ('signedTxXdr' in resObj && typeof resObj.signedTxXdr === 'string') {
          return resObj.signedTxXdr;
        }
        if ('signedTransaction' in resObj && typeof resObj.signedTransaction === 'string') {
          return resObj.signedTransaction;
        }
      }
      return (result as any)?.signedTxXdr || (result as any)?.signedTransaction || (result as any)?.toString() || '';
    },
    [],
  );

  return (
    <WalletContext.Provider value={{ walletState, connect, disconnect, refreshBalance, signTransaction, isConnecting }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
}
