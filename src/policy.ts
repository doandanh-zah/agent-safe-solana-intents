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

  return { ok: reasons.length === 0, reasons };
}
