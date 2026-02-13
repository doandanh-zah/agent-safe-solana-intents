import { Intent, PolicyDecision } from './types.js';

export type Policy = {
  maxLamportsPerTx: number;
  allowRecipients?: string[];
};

export function evaluatePolicy(intent: Intent, policy: Policy): PolicyDecision {
  const reasons: string[] = [];

  const now = Date.now();
  const exp = Date.parse(intent.expiresAt);
  if (!Number.isFinite(exp) || exp < now) {
    reasons.push('intent expired');
  }

  if (intent.kind === 'sol_transfer') {
    if (!intent.to) reasons.push('missing recipient');

    const max = intent.maxLamports ?? intent.lamports;
    if (max > policy.maxLamportsPerTx) {
      reasons.push(`maxLamports (${max}) exceeds policy cap (${policy.maxLamportsPerTx})`);
    }

    if (policy.allowRecipients && policy.allowRecipients.length > 0) {
      if (!policy.allowRecipients.includes(intent.to)) {
        reasons.push('recipient not allowlisted');
      }
    }
  }

  if (intent.kind === 'spl_transfer') {
    if (!intent.to) reasons.push('missing recipient');
    if (!intent.mint) reasons.push('missing mint');

    // Note: for SPL transfers we can’t infer SOL cost from amount alone.
    // Enforce allowlist at least.
    if (policy.allowRecipients && policy.allowRecipients.length > 0) {
      if (!policy.allowRecipients.includes(intent.to)) {
        reasons.push('recipient not allowlisted');
      }
    }
  }

  if (intent.kind === 'memo_only') {
    if (!intent.memo || intent.memo.trim().length === 0) reasons.push('missing memo');
  }

  return { ok: reasons.length === 0, reasons };
}
