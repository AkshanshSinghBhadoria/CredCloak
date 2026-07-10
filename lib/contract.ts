import * as StellarSdk from '@stellar/stellar-sdk';
import { ClaimResult, ContractError, ReadinessClaim, LoanRequest, LoanStatus } from './types';
import { FinancialStats } from './types';

// Env variables with fallback to avoid crashes on boot
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'CDHNF2LNW6SAFFW3CDT4LQFEMV5KF3ZYCH5DLKUKBWUJAYTP3RH52RET';
const LOAN_POOL_ADDRESS = process.env.NEXT_PUBLIC_LOAN_POOL_ADDRESS || 'CDHNF2LNW6SAFFW3CDT4LQFEMV5KF3ZYCH5DLKUKBWUJAYTP3RH52RET'; // Deployed in this level
const SOROBAN_RPC = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx';

// Hash the financial stats for on-chain storage
function hashStats(stats: FinancialStats): string {
  const data = `${stats.averageBalance.toFixed(2)}:${stats.dtiRatio.toFixed(2)}:${stats.windowDays}`;
  return btoa(data).slice(0, 32);
}

// Convert big int to i128 ScVal
function bigIntToI128ScVal(value: bigint): StellarSdk.xdr.ScVal {
  try {
    return StellarSdk.nativeToScVal(value, { type: 'i128' });
  } catch {
    const lo = value & BigInt('0xffffffffffffffff');
    const hi = value >> BigInt(64);
    return StellarSdk.xdr.ScVal.scvI128(
      new StellarSdk.xdr.Int128Parts({
        lo: StellarSdk.xdr.Uint64.fromString(lo.toString()),
        hi: StellarSdk.xdr.Int64.fromString(hi.toString())
      })
    );
  }
}

// Hash proof bytes using SHA-256 for upgrade
async function computeSha256(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback for node environment / tests
    const buffer = Buffer.from(bytes);
    const hash = require('crypto').createHash('sha256').update(buffer).digest();
    return new Uint8Array(hash);
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes as any);
  return new Uint8Array(hashBuffer);
}

// Extract signed XDR string from possible object/string response at runtime
function extractSignedXDR(result: any): string {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object') {
    return result.signedTxXdr || result.signedTransaction || '';
  }
  return '';
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

    const simResult = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      const errCode = parseContractError(simResult.error);
      return {
        success: false,
        error: errCode,
        errorMessage: errCode === 'ContractCallFailed'
          ? `Simulation failed: ${simResult.error}`
          : getErrorMessage(errCode),
      };
    }

    const preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    const rawSignedXDR = await signTransaction(preparedTx.toXDR());
    const signedXDR = extractSignedXDR(rawSignedXDR);
    if (!signedXDR) {
      throw new Error('Transaction signing failed or was cancelled.');
    }
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
    const submitResult = await server.sendTransaction(signedTx);

    if (submitResult.status === 'ERROR') {
      return {
        success: false,
        error: 'ContractCallFailed',
        errorMessage: 'Transaction failed to submit. Please try again.',
      };
    }

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
    if (err.message?.includes('declined') || err.message?.includes('rejected')) {
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

export async function upgradeClaimToZKVerified(
  borrowerAddress: string,
  proofBytes: Uint8Array,
  signTransaction: (xdr: string) => Promise<string>
): Promise<ClaimResult> {
  try {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.startsWith('CXXXX')) {
      return {
        success: false,
        error: 'ContractCallFailed',
        errorMessage: 'Contract not configured.',
      };
    }

    const server = new StellarSdk.rpc.Server(SOROBAN_RPC);
    const account = await server.getAccount(borrowerAddress);
    const contract = new StellarSdk.Contract(CONTRACT_ADDRESS);

    const hash = await computeSha256(proofBytes);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'upgrade_to_zk_verified',
          StellarSdk.Address.fromString(borrowerAddress).toScVal(),
          StellarSdk.xdr.ScVal.scvBytes(Buffer.from(hash)),
        )
      )
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      const errCode = parseContractError(simResult.error);
      return {
        success: false,
        error: errCode,
        errorMessage: errCode === 'ContractCallFailed'
          ? `Simulation failed: ${simResult.error}`
          : getErrorMessage(errCode),
      };
    }

    const preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    const rawSignedXDR = await signTransaction(preparedTx.toXDR());
    const signedXDR = extractSignedXDR(rawSignedXDR);
    if (!signedXDR) {
      throw new Error('Transaction signing failed or was cancelled.');
    }
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
    const submitResult = await server.sendTransaction(signedTx);

    if (submitResult.status === 'ERROR') {
      return { success: false, error: 'ContractCallFailed', errorMessage: 'Transaction failed to submit.' };
    }

    const txHash = submitResult.hash;
    const confirmed = await pollForConfirmation(server, txHash);
    if (!confirmed) {
      return { success: false, error: 'ContractCallFailed', errorMessage: 'Confirmation timed out.' };
    }

    return {
      success: true,
      txHash,
      timestamp: Date.now(),
      explorerUrl: `${EXPLORER_BASE}/${txHash}`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'ContractCallFailed',
      errorMessage: err.message ?? 'Failed to upgrade claim.',
    };
  }
}

export async function mintScore(
  borrowerAddress: string,
  proofTimestamp: number,
  signTransaction: (xdr: string) => Promise<string>
): Promise<ClaimResult> {
  try {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.startsWith('CXXXX')) {
      return {
        success: false,
        error: 'ContractCallFailed',
        errorMessage: 'Contract not configured.',
      };
    }

    const server = new StellarSdk.rpc.Server(SOROBAN_RPC);
    const account = await server.getAccount(borrowerAddress);
    const contract = new StellarSdk.Contract(CONTRACT_ADDRESS);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'mint_score',
          StellarSdk.Address.fromString(borrowerAddress).toScVal(),
          StellarSdk.nativeToScVal(BigInt(Math.floor(proofTimestamp)), { type: 'u64' }),
        )
      )
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      const errCode = parseContractError(simResult.error);
      return {
        success: false,
        error: errCode,
        errorMessage: errCode === 'ContractCallFailed'
          ? `Simulation failed: ${simResult.error}`
          : getErrorMessage(errCode),
      };
    }

    const preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    const rawSignedXDR = await signTransaction(preparedTx.toXDR());
    const signedXDR = extractSignedXDR(rawSignedXDR);
    if (!signedXDR) {
      throw new Error('Transaction signing failed or was cancelled.');
    }
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
    const submitResult = await server.sendTransaction(signedTx);

    if (submitResult.status === 'ERROR') {
      return { success: false, error: 'ContractCallFailed', errorMessage: 'Transaction failed to submit.' };
    }

    const txHash = submitResult.hash;
    const confirmed = await pollForConfirmation(server, txHash);
    if (!confirmed) {
      return { success: false, error: 'ContractCallFailed', errorMessage: 'Confirmation timed out.' };
    }

    return {
      success: true,
      txHash,
      timestamp: Date.now(),
      explorerUrl: `${EXPLORER_BASE}/${txHash}`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'ContractCallFailed',
      errorMessage: err.message ?? 'Failed to mint CredCloak Score.',
    };
  }
}

export async function fetchHasValidScore(
  borrowerAddress: string
): Promise<boolean> {
  try {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.startsWith('CXXXX')) return false;

    const server = new StellarSdk.rpc.Server(SOROBAN_RPC);
    const contract = new StellarSdk.Contract(CONTRACT_ADDRESS);
    const keypair = StellarSdk.Keypair.random();
    const account = new StellarSdk.Account(keypair.publicKey(), '0');
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'has_valid_score',
          StellarSdk.Address.fromString(borrowerAddress).toScVal()
        )
      )
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationSuccess(result) && result.result) {
      return result.result.retval.b();
    }
    return false;
  } catch (err) {
    console.warn('Failed to fetch score validity:', err);
    return false;
  }
}

export async function requestLoan(
  borrowerAddress: string,
  amountXlm: number,
  proofBytes: Uint8Array,
  publicInputs: string[],
  signTransaction: (xdr: string) => Promise<string>
): Promise<ClaimResult> {
  try {
    if (!LOAN_POOL_ADDRESS || LOAN_POOL_ADDRESS.startsWith('CXXXX')) {
      return {
        success: false,
        error: 'ContractCallFailed',
        errorMessage: 'Loan Pool contract address is not configured.',
      };
    }

    const server = new StellarSdk.rpc.Server(SOROBAN_RPC);
    const account = await server.getAccount(borrowerAddress);
    const contract = new StellarSdk.Contract(LOAN_POOL_ADDRESS);

    // Convert XLM to stroops (10^7)
    const amountStroops = BigInt(Math.floor(amountXlm * 10_000_000));

    // Clamp public inputs to u32 for safe passing to Vec<u32>
    const u32s = publicInputs.map(val => {
      try {
        let num = val.startsWith('0x') ? BigInt(val) : BigInt(val);
        return StellarSdk.xdr.ScVal.scvU32(Number(num & BigInt(0xffffffff)));
      } catch {
        return StellarSdk.xdr.ScVal.scvU32(0);
      }
    });

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'request_loan',
          StellarSdk.Address.fromString(borrowerAddress).toScVal(),
          bigIntToI128ScVal(amountStroops),
          StellarSdk.xdr.ScVal.scvBytes(Buffer.from(proofBytes)),
          StellarSdk.xdr.ScVal.scvVec(u32s),
        )
      )
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      const errCode = parsePoolError(simResult.error);
      return {
        success: false,
        error: 'ContractCallFailed',
        errorMessage: errCode === 'ContractCallFailed'
          ? `Simulation failed: ${simResult.error}`
          : getPoolErrorMessage(errCode),
      };
    }

    const preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    const rawSignedXDR = await signTransaction(preparedTx.toXDR());
    const signedXDR = extractSignedXDR(rawSignedXDR);
    if (!signedXDR) {
      throw new Error('Transaction signing failed or was cancelled.');
    }
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
    const submitResult = await server.sendTransaction(signedTx);

    if (submitResult.status === 'ERROR') {
      return { success: false, error: 'ContractCallFailed', errorMessage: 'Transaction submission failed.' };
    }

    const txHash = submitResult.hash;
    const confirmed = await pollForConfirmation(server, txHash);
    if (!confirmed) {
      return { success: false, error: 'ContractCallFailed', errorMessage: 'Confirmation timed out.' };
    }

    return {
      success: true,
      txHash,
      timestamp: Date.now(),
      explorerUrl: `${EXPLORER_BASE}/${txHash}`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'ContractCallFailed',
      errorMessage: err.message ?? 'Failed to request loan.',
    };
  }
}

export async function repayLoan(
  borrowerAddress: string,
  amountXlm: number,
  signTransaction: (xdr: string) => Promise<string>
): Promise<ClaimResult> {
  try {
    if (!LOAN_POOL_ADDRESS || LOAN_POOL_ADDRESS.startsWith('CXXXX')) {
      return {
        success: false,
        error: 'ContractCallFailed',
        errorMessage: 'Loan Pool contract address is not configured.',
      };
    }

    const server = new StellarSdk.rpc.Server(SOROBAN_RPC);
    const account = await server.getAccount(borrowerAddress);
    const contract = new StellarSdk.Contract(LOAN_POOL_ADDRESS);

    // Convert XLM to stroops (10^7)
    const amountStroops = BigInt(Math.floor(amountXlm * 10_000_000));

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'repay_loan',
          StellarSdk.Address.fromString(borrowerAddress).toScVal(),
          bigIntToI128ScVal(amountStroops),
        )
      )
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      const errCode = parsePoolError(simResult.error);
      return {
        success: false,
        error: 'ContractCallFailed',
        errorMessage: errCode === 'ContractCallFailed'
          ? `Simulation failed: ${simResult.error}`
          : getPoolErrorMessage(errCode),
      };
    }

    const preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    const rawSignedXDR = await signTransaction(preparedTx.toXDR());
    const signedXDR = extractSignedXDR(rawSignedXDR);
    if (!signedXDR) {
      throw new Error('Transaction signing failed or was cancelled.');
    }
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
    const submitResult = await server.sendTransaction(signedTx);

    if (submitResult.status === 'ERROR') {
      return { success: false, error: 'ContractCallFailed', errorMessage: 'Repayment transaction failed.' };
    }

    const txHash = submitResult.hash;
    const confirmed = await pollForConfirmation(server, txHash);
    if (!confirmed) {
      return { success: false, error: 'ContractCallFailed', errorMessage: 'Repayment confirmation timed out.' };
    }

    return {
      success: true,
      txHash,
      timestamp: Date.now(),
      explorerUrl: `${EXPLORER_BASE}/${txHash}`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'ContractCallFailed',
      errorMessage: err.message ?? 'Failed to repay loan.',
    };
  }
}

export async function fetchLoan(
  borrowerAddress: string
): Promise<LoanRequest | null> {
  try {
    if (!LOAN_POOL_ADDRESS || LOAN_POOL_ADDRESS.startsWith('CXXXX')) return null;

    const server = new StellarSdk.rpc.Server(SOROBAN_RPC);
    const contract = new StellarSdk.Contract(LOAN_POOL_ADDRESS);
    const keypair = StellarSdk.Keypair.random();
    const account = new StellarSdk.Account(keypair.publicKey(), '0');

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'get_loan',
          StellarSdk.Address.fromString(borrowerAddress).toScVal()
        )
      )
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationSuccess(result) && result.result) {
      return parseLoanFromScVal(result.result.retval);
    }
    return null;
  } catch (err) {
    console.warn('Failed to fetch loan details:', err);
    return null;
  }
}

export async function fetchPoolBalance(): Promise<number> {
  try {
    if (!LOAN_POOL_ADDRESS || LOAN_POOL_ADDRESS.startsWith('CXXXX')) return 0;

    const server = new StellarSdk.rpc.Server(SOROBAN_RPC);
    const contract = new StellarSdk.Contract(LOAN_POOL_ADDRESS);
    const keypair = StellarSdk.Keypair.random();
    const account = new StellarSdk.Account(keypair.publicKey(), '0');

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_pool_balance'))
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationSuccess(result) && result.result) {
      // Divide by 10^7 (stroops to XLM)
      const balanceStroops = Number(result.result.retval.i128()?.lo.toString() || 0);
      return balanceStroops / 10_000_000;
    }
    return 0;
  } catch (err) {
    console.warn('Failed to fetch pool balance:', err);
    return 0;
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
  if (errStr.includes('NotZkVerified') || errStr.includes('Error(Contract, #4)')) {
    return 'NotZkVerified';
  }
  return 'ContractCallFailed';
}

function parsePoolError(error: string): string {
  const errStr = error ? error.toString() : '';
  if (errStr.includes('Error(Contract, #1)') || errStr.includes('InsufficientPoolFunds')) {
    return 'InsufficientPoolFunds';
  }
  if (errStr.includes('Error(Contract, #2)') || errStr.includes('InvalidZKProof')) {
    return 'InvalidZKProof';
  }
  if (errStr.includes('Error(Contract, #3)') || errStr.includes('NoActiveRegistryClaim')) {
    return 'NoActiveRegistryClaim';
  }
  if (errStr.includes('Error(Contract, #4)') || errStr.includes('LoanAlreadyActive')) {
    return 'LoanAlreadyActive';
  }
  if (errStr.includes('Error(Contract, #5)') || errStr.includes('UnauthorizedRepayment')) {
    return 'UnauthorizedRepayment';
  }
  return 'ContractCallFailed';
}

function getPoolErrorMessage(error: string): string {
  const messages: Record<string, string> = {
    InsufficientPoolFunds: 'Loan Pool has insufficient funds to disburse this loan.',
    InvalidZKProof: 'Your ZK Proof is invalid. Prover constraints failed.',
    NoActiveRegistryClaim: 'No active readiness claim found. Please register on the Registry first.',
    LoanAlreadyActive: 'You already have an active loan. Repay it before requesting a new one.',
    UnauthorizedRepayment: 'Repayment unauthorized. No active loan found to repay.',
    ContractCallFailed: 'Pool contract call failed. Please try again.',
  };
  return messages[error] || 'Pool contract call failed.';
}

export function getErrorMessage(error: ContractError): string {
  const messages: Record<ContractError, string> = {
    AlreadyRegistered: 'You already have an active claim. It refreshes in 30 days.',
    ThresholdNotMet: 'Your financial stats do not meet the minimum thresholds yet.',
    Unauthorized: 'Wallet mismatch. Please connect the correct wallet.',
    NotZkVerified: 'Your claim must be ZK-verified before minting a CredCloak Score.',
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
    let zkVerified = false;
    let proofHash = '';
    let scoreMinted = false;
    let scoreExpiry = 0;

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
      } else if (keyStr === 'zk_verified') {
        zkVerified = val.b();
      } else if (keyStr === 'proof_hash') {
        try {
          const vec = val.vec();
          if (vec && vec.length > 0) {
            proofHash = vec[0].bytes()?.toString('hex') || '';
          }
        } catch {
          proofHash = val.bytes()?.toString('hex') || '';
        }
      } else if (keyStr === 'score_minted') {
        scoreMinted = val.b();
      } else if (keyStr === 'score_expiry') {
        scoreExpiry = Number(val.u64()?.toString() || 0);
      }
    }

    return {
      borrower,
      statsHash,
      timestamp,
      dtiPass,
      balancePass,
      historyPass,
      zkVerified,
      proofHash,
      scoreMinted,
      scoreExpiry,
    };
  } catch (err) {
    console.error('Error parsing claim ScVal:', err);
    return null;
  }
}

function parseLoanFromScVal(scVal: StellarSdk.xdr.ScVal): LoanRequest | null {
  try {
    const map = scVal.map();
    if (!map) return null;

    let borrower = '';
    let amountStroops = BigInt(0);
    let timestamp = 0;
    let status: LoanStatus = 'Pending';

    for (const entry of map) {
      const keyStr = entry.key().sym()?.toString() || entry.key().sym() || '';
      const val = entry.val();

      if (keyStr === 'borrower') {
        borrower = val.address()?.toString() || '';
      } else if (keyStr === 'amount') {
        amountStroops = BigInt(val.i128()?.lo.toString() || 0);
      } else if (keyStr === 'timestamp') {
        timestamp = Number(val.u64()?.toString() || 0);
      } else if (keyStr === 'status') {
        const statusVal = val.sym()?.toString() || '';
        if (statusVal === 'Approved') status = 'Approved';
        else if (statusVal === 'Rejected') status = 'Rejected';
        else if (statusVal === 'Repaid') status = 'Repaid';
        else status = 'Pending';
      }
    }

    return {
      borrower,
      amount: (Number(amountStroops) / 10_000_000).toFixed(2), // Convert back to XLM
      timestamp,
      status,
    };
  } catch (err) {
    console.error('Error parsing loan ScVal:', err);
    return null;
  }
}
