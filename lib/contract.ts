import * as StellarSdk from '@stellar/stellar-sdk';
import { ClaimResult, ContractError, ReadinessClaim } from './types';
import { FinancialStats } from './types';

// Use env variable with a valid dummy contract address fallback to avoid constructor crashes on boot
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'CDHNF2LNW6SAFFW3CDT4LQFEMV5KF3ZYCH5DLKUKBWUJAYTP3RH52RET';
const SOROBAN_RPC = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx';

// Hash the financial stats for on-chain storage (no raw numbers on-chain)
function hashStats(stats: FinancialStats): string {
  const data = `${stats.averageBalance.toFixed(2)}:${stats.dtiRatio.toFixed(2)}:${stats.windowDays}`;
  // Simple deterministic hash for demo
  return btoa(data).slice(0, 32);
}

export async function registerReadinessClaim(
  borrowerAddress: string,
  stats: FinancialStats,
  signTransaction: (xdr: string) => Promise<string>
): Promise<ClaimResult> {
  try {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.startsWith('CXXXX')) {
      return {
        success: false,
        error: 'ContractCallFailed',
        errorMessage: 'Smart contract address is not configured. Please deploy the contract first.',
      };
    }

    const server = new StellarSdk.rpc.Server(SOROBAN_RPC);
    const account = await server.getAccount(borrowerAddress);

    const contract = new StellarSdk.Contract(CONTRACT_ADDRESS);
    const statsHash = hashStats(stats);

    // Build the contract call transaction
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'register_claim',
          StellarSdk.Address.fromString(borrowerAddress).toScVal(),
          StellarSdk.xdr.ScVal.scvBytes(Buffer.from(statsHash)),
          StellarSdk.xdr.ScVal.scvBool(stats.dtiRatio <= 50),
          StellarSdk.xdr.ScVal.scvBool(stats.averageBalance >= 100),
          StellarSdk.xdr.ScVal.scvBool(stats.historyDays >= 30),
        )
      )
      .setTimeout(30)
      .build();

    // Simulate first (catches errors cheaply)
    const simResult = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      const errCode = parseContractError(simResult.error);
      return {
        success: false,
        error: errCode,
        errorMessage: getErrorMessage(errCode),
      };
    }

    // Assemble + sign + submit
    const preparedTx = StellarSdk.rpc.assembleTransaction(
      tx, simResult
    ).build();
    const signedXDR = await signTransaction(preparedTx.toXDR());
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedXDR, NETWORK_PASSPHRASE
    );
    const submitResult = await server.sendTransaction(signedTx);

    if (submitResult.status === 'ERROR') {
      return {
        success: false,
        error: 'ContractCallFailed',
        errorMessage: 'Transaction failed to submit. Please try again.',
      };
    }

    // Poll for confirmation
    const hash = submitResult.hash;
    const confirmed = await pollForConfirmation(server, hash);
    if (!confirmed) {
      return {
        success: false,
        error: 'ContractCallFailed',
        errorMessage: 'Transaction timed out waiting for confirmation.',
      };
    }

    return {
      success: true,
      txHash: hash,
      timestamp: Date.now(),
      explorerUrl: `${EXPLORER_BASE}/${hash}`,
    };

  } catch (err: any) {
    // Network / wallet errors
    if (err.message?.includes('User declined') || err.message?.includes('declined') || err.message?.includes('rejected')) {
      return {
        success: false,
        error: 'Unauthorized',
        errorMessage: 'Transaction rejected in wallet.',
      };
    }
    return {
      success: false,
      error: 'ContractCallFailed',
      errorMessage: err.message ?? 'Unexpected error. Please try again.',
    };
  }
}

async function pollForConfirmation(
  server: StellarSdk.rpc.Server,
  hash: string,
  attempts = 15
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const result = await server.getTransaction(hash);
    if (result.status === StellarSdk.rpc.Api.GetTransactionStatus.SUCCESS) {
      return true;
    }
    if (result.status === StellarSdk.rpc.Api.GetTransactionStatus.FAILED) {
      return false;
    }
  }
  return false;
}

export async function fetchActiveClaim(
  borrowerAddress: string
): Promise<ReadinessClaim | null> {
  try {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.startsWith('CXXXX')) return null;

    const server = new StellarSdk.rpc.Server(SOROBAN_RPC);
    const contract = new StellarSdk.Contract(CONTRACT_ADDRESS);
    const account = await server.getAccount(borrowerAddress);
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'get_claim',
          StellarSdk.Address.fromString(borrowerAddress).toScVal()
        )
      )
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationSuccess(result) && result.result) {
      return parseClaimFromScVal(result.result.retval);
    }
    return null;
  } catch (err) {
    console.warn('Failed to fetch active claim:', err);
    return null;
  }
}

export async function fetchTotalClaims(): Promise<number> {
  try {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.startsWith('CXXXX')) return 0;

    const server = new StellarSdk.rpc.Server(SOROBAN_RPC);
    const contract = new StellarSdk.Contract(CONTRACT_ADDRESS);
    const keypair = StellarSdk.Keypair.random();
    const account = new StellarSdk.Account(keypair.publicKey(), '0');
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_total_claims'))
      .setTimeout(30)
      .build();
    const result = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationSuccess(result) && result.result) {
      return Number(result.result.retval.u64()?.toString() || 0);
    }
    return 0;
  } catch (err) {
    console.warn('Failed to fetch total claims:', err);
    return 0;
  }
}

function parseContractError(error: string): ContractError {
  const errStr = error ? error.toString() : '';
  if (errStr.includes('AlreadyRegistered') || errStr.includes('Error(Contract, #1)')) {
    return 'AlreadyRegistered';
  }
  if (errStr.includes('ThresholdNotMet') || errStr.includes('Error(Contract, #2)')) {
    return 'ThresholdNotMet';
  }
  if (errStr.includes('Unauthorized') || errStr.includes('Error(Contract, #3)')) {
    return 'Unauthorized';
  }
  return 'ContractCallFailed';
}

export function getErrorMessage(error: ContractError): string {
  const messages: Record<ContractError, string> = {
    AlreadyRegistered: 'You already have an active claim. It refreshes in 30 days.',
    ThresholdNotMet: 'Your financial stats do not meet the minimum thresholds yet.',
    Unauthorized: 'Wallet mismatch. Please connect the correct wallet.',
    ContractCallFailed: 'Contract call failed. Please try again.',
    WalletNotConnected: 'Please connect your wallet first.',
  };
  return messages[error];
}

function parseClaimFromScVal(scVal: StellarSdk.xdr.ScVal): ReadinessClaim | null {
  try {
    const map = scVal.map();
    if (!map) return null;

    let borrower = '';
    let statsHash = '';
    let timestamp = 0;
    let dtiPass = false;
    let balancePass = false;
    let historyPass = false;

    for (const entry of map) {
      const keyStr = entry.key().sym()?.toString() || entry.key().sym() || '';
      const val = entry.val();

      if (keyStr === 'borrower') {
        borrower = val.address()?.toString() || '';
      } else if (keyStr === 'stats_hash') {
        statsHash = val.bytes()?.toString('hex') || '';
      } else if (keyStr === 'timestamp') {
        timestamp = Number(val.u64()?.toString() || 0);
      } else if (keyStr === 'dti_pass') {
        dtiPass = val.b();
      } else if (keyStr === 'balance_pass') {
        balancePass = val.b();
      } else if (keyStr === 'history_pass') {
        historyPass = val.b();
      }
    }

    return {
      borrower,
      statsHash,
      timestamp,
      dtiPass,
      balancePass,
      historyPass,
    };
  } catch (err) {
    console.error('Error parsing claim ScVal:', err);
    return null;
  }
}
