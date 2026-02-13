import fs from 'node:fs';
import path from 'node:path';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';
import { parseIntent } from './intent.js';
import { evaluatePolicy } from './policy.js';
import { emitReceiptMemo, hashIntent } from './receipt.js';
import { buildTx } from './tx.js';

export async function runDemo(params: {
  rpc: string;
  intentPath: string;
  outDir?: string;
}) {
  const { rpc, intentPath, outDir } = params;
  const connection = new Connection(rpc, 'confirmed');

  const payer = Keypair.generate();

  // Airdrop (devnet can be flaky; retry a bit)
  let airdropSig: string | null = null;
  for (let i = 0; i < 6; i++) {
    try {
      airdropSig = await connection.requestAirdrop(payer.publicKey, 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(airdropSig, 'confirmed');
      break;
    } catch (e: any) {
      const msg = String(e?.message || e);
      // If devnet faucet is rate-limited, ask user to retry later.
      if (msg.includes('429')) {
        throw new Error('Devnet airdrop rate-limited (429). Please retry in a few minutes or use a different devnet RPC.');
      }
      if (i === 5) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }

  const intentJson = fs.readFileSync(intentPath, 'utf8');
  const intent = parseIntent(intentJson);

  // Basic demo policy: cap + allow recipient
  const policy = {
    maxLamportsPerTx: 2_000_000,
    allowRecipients: intent.kind === 'sol_transfer' ? [intent.to] : [],
  };

  const decision = evaluatePolicy(intent, policy);

  // Emit policy decision receipt
  const baseReceipt = {
    intentHash: hashIntent(intentJson),
    decision: decision.ok ? 'APPROVE' : 'REJECT',
    reasons: decision.reasons,
    ts: new Date().toISOString(),
  } as const;

  const policySig = await emitReceiptMemo({ connection, payer, receipt: baseReceipt });

  // If approved, build tx (not executed in demo)
  const tx = await buildTx(intent, connection);

  const result = {
    rpc,
    payerPubkey: payer.publicKey.toBase58(),
    airdropSig,
    policyReceiptSig: policySig,
    decision,
    txMessageBase64: Buffer.from(tx.message.serialize()).toString('base64'),
    note: 'This demo does not sign the action transaction. It demonstrates intent validation, policy evaluation, and on-chain audit receipt.'
  };

  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'demo.result.json'), JSON.stringify(result, null, 2));
  }

  return result;
}
