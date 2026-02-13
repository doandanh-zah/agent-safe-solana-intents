import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import type { Intent } from './intentSchema';

export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export function solscanTxUrl(sig: string, network: 'devnet' | 'mainnet') {
  return network === 'devnet'
    ? `https://solscan.io/tx/${sig}?cluster=devnet`
    : `https://solscan.io/tx/${sig}`;
}

export async function buildActionTx(params: {
  intent: Intent;
  connection: Connection;
}): Promise<VersionedTransaction> {
  const { intent, connection } = params;
  const payer = new PublicKey(intent.from);
  const { blockhash } = await connection.getLatestBlockhash('confirmed');

  const ixs: TransactionInstruction[] = [];

  if (intent.kind === 'sol_transfer') {
    ixs.push(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: new PublicKey(intent.to),
        lamports: intent.lamports,
      })
    );
  } else if (intent.kind === 'spl_transfer') {
    const mint = new PublicKey(intent.mint);
    const to = new PublicKey(intent.to);

    const fromAta = getAssociatedTokenAddressSync(mint, payer);
    const toAta = getAssociatedTokenAddressSync(mint, to);

    // Idempotent ATA creation (safe to include even if exists)
    ixs.push(createAssociatedTokenAccountIdempotentInstruction(payer, toAta, to, mint));

    const amount = BigInt(intent.amount);
    ixs.push(createTransferCheckedInstruction(fromAta, mint, toAta, payer, amount, intent.decimals));
  } else {
    throw new Error('memo_only has no action transaction');
  }

  const msg = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: ixs,
  }).compileToV0Message();

  return new VersionedTransaction(msg);
}

export async function buildMemoTx(params: {
  from: PublicKey;
  connection: Connection;
  memoJson: string;
}): Promise<VersionedTransaction> {
  const { from, connection, memoJson } = params;
  const { blockhash } = await connection.getLatestBlockhash('confirmed');

  const ix = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: from, isSigner: true, isWritable: false }],
    data: Buffer.from(memoJson, 'utf8'),
  });

  const msg = new TransactionMessage({
    payerKey: from,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();

  return new VersionedTransaction(msg);
}
