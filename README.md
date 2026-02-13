# Agent-Safe Solana Intents

**Intent → Policy → Transaction** rails for agents on Solana (without sharing private keys).

This project is built for the Superteam Earn bounty: **Open Innovation Track: Build Anything on Solana (Agents)**.

- Listing: https://superteam.fun/earn/listing/open-innovation-track-agents
- Repo: https://github.com/doandanh-zah/agent-safe-solana-intents

## Why
Agents can plan on-chain actions, but execution often becomes either:
- **Brittle** (human must sign every micro-step), or
- **Unsafe** (people share keys / long-lived secrets).

This repo implements a minimal, production-shaped flow:
1) An agent outputs a **structured intent** (JSON)
2) A **policy engine** evaluates it (allowlist + spending caps + expiry)
3) Only then do we build a **Solana transaction** for a human to sign
4) Each decision emits an **audit receipt** on-chain via the Solana **Memo** program

## What’s included (MVP)
- `intent.schema.json` — JSON schema for intents
- `policy.ts` — policy evaluation (approve/reject + reasons)
- `tx.ts` — build transactions from intents
- `receipt.ts` — write audit receipts to Solana (Memo)
- `cli.ts` — CLI to generate intents, evaluate policy, and emit receipts

## Intent format (example)
```json
{
  "kind": "sol_transfer",
  "network": "devnet",
  "from": "<SIGNER_PUBLIC_KEY>",
  "to": "<RECIPIENT_PUBLIC_KEY>",
  "lamports": 1000000,
  "maxLamports": 1500000,
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "note": "tip for reviewer"
}
```

## Policy example
A policy can enforce:
- allowlisted recipient(s)
- max spend per tx
- expiry windows

If the intent violates policy, we reject it with explicit reasons.

## On-chain audit receipts
We write a memo containing a compact JSON payload with:
- `intentHash`
- `decision` (APPROVE/REJECT)
- `timestamp`
- optional `txSignature` (if executed)

This makes agent actions reviewable and reproducible.

## Run locally
> Requires Node.js 20+.

```bash
npm install

# generate an intent example
npm run intent:example > intent.json

# evaluate policy (no on-chain write)
node --loader ts-node/esm src/cli.ts approve --intent intent.json --rpc https://api.devnet.solana.com

# full demo (airdrops devnet SOL + writes an on-chain memo receipt)
npm run demo
```

After `npm run demo`, open Solscan Devnet and paste:
- `airdropSig`
- `policyReceiptSig`

This demonstrates a real on-chain audit receipt.

## Autonomy statement (for bounty)
The project is designed to be operated by an autonomous agent that:
- generates a structured intent
- evaluates policy rules
- prepares transactions
- writes audit receipts

Human involvement is limited to:
- setting policy constraints
- providing final signature for transactions
- claiming payouts (KYC, etc.)

## License
MIT
