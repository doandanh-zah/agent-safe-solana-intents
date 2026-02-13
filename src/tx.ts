import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { Intent } from './types.js';

export async function buildTx(intent: Intent, connection: Connection): Promise<VersionedTransaction> {
  const from = new PublicKey(intent.from);
  const { blockhash } = await connection.getLatestBlockhash('confirmed');

  const ixs: TransactionInstruction[] = [];

  if (intent.kind === 'sol_transfer') {
    const to = new PublicKey(intent.to);
    ixs.push(
      SystemProgram.transfer({
        fromPubkey: from,
        toPubkey: to,
        lamports: intent.lamports,
      })
    );
  } else if (intent.kind === 'spl_transfer') {
    const to = new PublicKey(intent.to);
    const mint = new PublicKey(intent.mint);

    const fromAta = getAssociatedTokenAddressSync(mint, from);
    const toAta = getAssociatedTokenAddressSync(mint, to);

    // Create recipient ATA if missing (best-effort; safe to include)
    ixs.push(
      createAssociatedTokenAccountInstruction(from, toAta, to, mint)
    );

    // amount is provided in base units as string (can be large)
    const amount = BigInt(intent.amount);

    ixs.push(
      createTransferCheckedInstruction(
        fromAta,
        mint,
        toAta,
        from,
        amount,
        intent.decimals
      )
    );
  } else if (intent.kind === 'memo_only') {
    // No-op on tx builder level; memo receipt is emitted separately.
    throw new Error('memo_only has no action transaction (use receipt emitter)');
  } else {
    const _exhaustive: never = intent;
    throw new Error(`Unsupported kind: ${(intent as any).kind}`);
  }

  const msg = new TransactionMessage({
    payerKey: from,
    recentBlockhash: blockhash,
    instructions: ixs,
  }).compileToV0Message();

  return new VersionedTransaction(msg);
}
