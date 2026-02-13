import crypto from 'node:crypto';
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export type Receipt = {
  intentHash: string;
  decision: 'APPROVE' | 'REJECT';
  reasons?: string[];
  ts: string;
  txSig?: string;
};

export function hashIntent(intentJson: string): string {
  return crypto.createHash('sha256').update(intentJson).digest('hex');
}

export async function emitReceiptMemo(params: {
  connection: Connection;
  payer: Keypair;
  receipt: Receipt;
}): Promise<string> {
  const { connection, payer, receipt } = params;
  const data = Buffer.from(JSON.stringify(receipt), 'utf8');

  const ix = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
    data,
  });

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  const msg = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();

  const tx = new VersionedTransaction(msg);
  tx.sign([payer]);

  const sig = await connection.sendTransaction(tx, { maxRetries: 3 });
  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}
