import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { Intent } from './types.js';

export async function buildTx(intent: Intent, connection: Connection): Promise<VersionedTransaction> {
  if (intent.kind !== 'sol_transfer') throw new Error(`Unsupported kind: ${intent.kind}`);

  const from = new PublicKey(intent.from);
  const to = new PublicKey(intent.to);

  const { blockhash } = await connection.getLatestBlockhash('confirmed');

  const ix = SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: to,
    lamports: intent.lamports,
  });

  const msg = new TransactionMessage({
    payerKey: from,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();

  return new VersionedTransaction(msg);
}
