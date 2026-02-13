'use client';

import { useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import crypto from 'crypto';

import { parseIntent } from '@/lib/intentSchema';
import { evaluatePolicy } from '@/lib/policy';
import { buildActionTx, buildMemoTx, solscanTxUrl } from '@/lib/solana';

function sha256Hex(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [intentText, setIntentText] = useState<string>(() => {
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    return JSON.stringify(
      {
        kind: 'sol_transfer',
        network: 'devnet',
        from: '<YOUR_WALLET_PUBLIC_KEY>',
        to: '<RECIPIENT_PUBLIC_KEY>',
        lamports: 1000000,
        maxLamports: 1500000,
        expiresAt: expires,
        note: 'demo intent',
      },
      null,
      2
    );
  });

  const [policyCapLamports, setPolicyCapLamports] = useState<number>(2_000_000);
  const [allowlistRecipient, setAllowlistRecipient] = useState<string>('');

  const [policySig, setPolicySig] = useState<string>('');
  const [actionSig, setActionSig] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState<string>('');

  const parsed = useMemo(() => parseIntent(intentText), [intentText]);

  const decision = useMemo(() => {
    if (!parsed.ok) return null;
    const allowRecipients = allowlistRecipient.trim() ? [allowlistRecipient.trim()] : undefined;
    return evaluatePolicy(parsed.intent, { maxLamportsPerTx: policyCapLamports, allowRecipients });
  }, [parsed, policyCapLamports, allowlistRecipient]);

  const intentHash = useMemo(() => {
    if (!parsed.ok) return null;
    // Hash the raw JSON text so it’s reproducible.
    return sha256Hex(intentText);
  }, [parsed, intentText]);

  const network = (parsed.ok ? parsed.intent.network : 'devnet') as 'devnet' | 'mainnet';

  async function emitPolicyReceipt() {
    setError('');
    setPolicySig('');
    if (!publicKey) return setError('Connect wallet first.');
    if (!parsed.ok) return setError('Fix intent JSON first.');
    if (!decision) return setError('Policy decision unavailable.');

    try {
      setBusy('policy');
      const receipt = {
        intentHash,
        decision: decision.ok ? 'APPROVE' : 'REJECT',
        reasons: decision.reasons,
        ts: new Date().toISOString(),
      };
      const memoJson = JSON.stringify(receipt);
      const tx = await buildMemoTx({ from: publicKey, connection, memoJson });
      const sig = await sendTransaction(tx, connection);
      setPolicySig(sig);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy('');
    }
  }

  async function executeActionTx() {
    setError('');
    setActionSig('');
    if (!publicKey) return setError('Connect wallet first.');
    if (!parsed.ok) return setError('Fix intent JSON first.');
    if (!decision?.ok) return setError('Policy must approve before executing.');

    try {
      setBusy('action');
      // Ensure intent.from matches the connected wallet
      const from = new PublicKey(parsed.intent.from);
      if (!from.equals(publicKey)) {
        return setError('Intent.from must equal your connected wallet public key.');
      }

      const tx = await buildActionTx({ intent: parsed.intent, connection });
      const sig = await sendTransaction(tx, connection);
      setActionSig(sig);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy('');
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0B0F] text-white">
      <div className="max-w-5xl mx-auto px-5 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Agent-Safe Solana Intents</h1>
            <p className="text-gray-400 mt-1">Intent → Policy → Transaction + on-chain audit receipts (Memo)</p>
          </div>
          <WalletMultiButton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-bold mb-3">Intent JSON</h2>
            <textarea
              value={intentText}
              onChange={(e) => setIntentText(e.target.value)}
              className="w-full min-h-[320px] bg-black/40 border border-white/10 rounded-xl p-3 font-mono text-xs leading-relaxed"
            />

            {!parsed.ok ? (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                <div className="font-bold mb-1">Schema / JSON errors</div>
                <ul className="list-disc pl-5 space-y-1">
                  {parsed.errors.map((er) => (
                    <li key={er}>{er}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-3 text-xs text-gray-400">
                <div>
                  <span className="text-gray-500">intentHash:</span> <span className="font-mono break-all">{intentHash}</span>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-bold mb-3">Policy</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400">Max lamports per tx</label>
                <input
                  type="number"
                  value={policyCapLamports}
                  onChange={(e) => setPolicyCapLamports(Number(e.target.value || 0))}
                  className="mt-1 w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Allowlist recipient (optional)</label>
                <input
                  value={allowlistRecipient}
                  onChange={(e) => setAllowlistRecipient(e.target.value)}
                  className="mt-1 w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                  placeholder="Recipient pubkey"
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-bold">Decision</div>
              {!decision ? (
                <div className="text-gray-400 text-sm mt-1">Fix intent JSON to evaluate policy.</div>
              ) : decision.ok ? (
                <div className="mt-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                  APPROVE
                </div>
              ) : (
                <div className="mt-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-200">
                  REJECT
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                    {decision.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                onClick={emitPolicyReceipt}
                disabled={busy !== ''}
                className="px-4 py-2 rounded-full bg-[#FFD700] text-black font-bold disabled:opacity-50"
              >
                {busy === 'policy' ? 'Emitting…' : 'Emit Policy Receipt (Memo)'}
              </button>
              <button
                onClick={executeActionTx}
                disabled={busy !== ''}
                className="px-4 py-2 rounded-full bg-white/10 border border-white/10 font-bold disabled:opacity-50"
              >
                {busy === 'action' ? 'Executing…' : 'Execute Action Tx'}
              </button>
            </div>

            {policySig && (
              <div className="mt-4 text-sm">
                <div className="text-gray-400">policyReceiptSig</div>
                <a className="font-mono break-all text-[#FFD700] hover:underline" href={solscanTxUrl(policySig, network)} target="_blank" rel="noreferrer">
                  {policySig}
                </a>
              </div>
            )}

            {actionSig && (
              <div className="mt-4 text-sm">
                <div className="text-gray-400">actionTxSig</div>
                <a className="font-mono break-all text-[#FFD700] hover:underline" href={solscanTxUrl(actionSig, network)} target="_blank" rel="noreferrer">
                  {actionSig}
                </a>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm break-words">
                {error}
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500">
              Tip: Set <span className="font-mono">intent.from</span> to your connected wallet public key before executing.
            </div>
          </section>
        </div>

        <div className="mt-10 text-xs text-gray-500">
          Repo: <a className="text-[#FFD700] hover:underline" href="https://github.com/doandanh-zah/agent-safe-solana-intents" target="_blank" rel="noreferrer">doandanh-zah/agent-safe-solana-intents</a>
        </div>
      </div>
    </main>
  );
}
