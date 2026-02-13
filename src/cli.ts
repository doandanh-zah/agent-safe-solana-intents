#!/usr/bin/env node

import fs from 'node:fs';
import crypto from 'node:crypto';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { parseIntent } from './intent.js';
import { evaluatePolicy } from './policy.js';
import { emitReceiptMemo, hashIntent } from './receipt.js';
import { Intent } from './types.js';

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function nowIso() {
  return new Date().toISOString();
}

function usage(): never {
  console.log(`Usage:
  intent:example
  approve --intent <path> --rpc <url> [--payer <path-to-keypair.json>]
`);
  process.exit(1);
}

async function cmdIntentExample() {
  const from = new PublicKey(Keypair.generate().publicKey).toBase58();
  const to = new PublicKey(Keypair.generate().publicKey).toBase58();

  const intent: Intent = {
    kind: 'sol_transfer',
    network: 'devnet',
    from,
    to,
    lamports: 1_000_000,
    maxLamports: 1_500_000,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    note: 'example intent',
  };

  process.stdout.write(JSON.stringify(intent, null, 2));
}

function loadKeypair(p: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  const secret = Uint8Array.from(raw);
  return Keypair.fromSecretKey(secret);
}

async function cmdApprove() {
  const intentPath = getArg('--intent');
  const rpc = getArg('--rpc') || 'https://api.devnet.solana.com';
  const payerPath = getArg('--payer');
  if (!intentPath) usage();

  const intentJson = fs.readFileSync(intentPath, 'utf8');
  const intent = parseIntent(intentJson);

  const policy = {
    maxLamportsPerTx: 2_000_000,
    allowRecipients: intent.to ? [intent.to] : [],
  };

  const decision = evaluatePolicy(intent, policy);

  if (!payerPath) {
    console.log(JSON.stringify({ ok: decision.ok, reasons: decision.reasons, intentHash: hashIntent(intentJson) }, null, 2));
    console.log('No --payer provided; skipping on-chain receipt.');
    return;
  }

  const payer = loadKeypair(payerPath);
  const connection = new Connection(rpc, 'confirmed');

  const receipt = {
    intentHash: hashIntent(intentJson),
    decision: decision.ok ? 'APPROVE' : 'REJECT',
    reasons: decision.reasons,
    ts: nowIso(),
  } as const;

  const sig = await emitReceiptMemo({ connection, payer, receipt });

  console.log(JSON.stringify({ ...receipt, txSig: sig }, null, 2));
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd) usage();

  if (cmd === 'intent:example') return cmdIntentExample();
  if (cmd === 'approve') return cmdApprove();

  usage();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
