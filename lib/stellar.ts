import * as StellarSdk from '@stellar/stellar-sdk';
import { SendTransactionParams, TransactionResult } from '@/lib/types';

const HORIZON_TESTNET = (process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org').trim();
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const STELLAR_LAB_BASE = `${(process.env.NEXT_PUBLIC_STELLAR_LAB_URL ?? 'https://stellar.expert/explorer/testnet').trim()}/tx`;

export async function buildAndSubmitTransaction(
  params: SendTransactionParams,
  signTransaction: (xdr: string) => Promise<string>,
): Promise<TransactionResult> {
  try {
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(params.destination)) {
      return { success: false, error: 'Invalid destination address.' };
    }

    const amount = Number.parseFloat(params.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Enter an XLM amount greater than 0.' };
    }

    const server = new StellarSdk.Horizon.Server(HORIZON_TESTNET);
    const sourceAccount = await server.loadAccount(params.sourceAddress);
    const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    txBuilder.addOperation(
      StellarSdk.Operation.payment({
        destination: params.destination,
        asset: StellarSdk.Asset.native(),
        amount: params.amount,
      }),
    );

    if (params.memo) txBuilder.addMemo(StellarSdk.Memo.text(params.memo));
    txBuilder.setTimeout(30);

    const transaction = txBuilder.build();
    const signedXDR = await signTransaction(transaction.toXDR());
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
    const result = await server.submitTransaction(signedTx);

    return {
      success: true,
      hash: result.hash,
      stellarLabUrl: getStellarLabUrl(result.hash),
    };
  } catch (error: unknown) {
    const err = error as { response?: { data?: { extras?: { result_codes?: { transaction?: string } } } }; message?: string };
    const message = err.response?.data?.extras?.result_codes?.transaction ?? err.message ?? 'Transaction failed.';
    return { success: false, error: message };
  }
}

export function getStellarLabUrl(hash: string): string {
  return `${STELLAR_LAB_BASE}/${hash}`;
}

export function isValidStellarAddress(address: string): boolean {
  return StellarSdk.StrKey.isValidEd25519PublicKey(address);
}
