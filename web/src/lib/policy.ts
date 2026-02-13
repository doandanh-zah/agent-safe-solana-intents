import type { Intent } from './intentSchema';

export type Policy = {
  maxLamportsPerTx: number;
  allowRecipients?: string[];
};

export type Decision = { ok: boolean; reasons: string[] };

export function evaluatePolicy(intent: Intent, policy: Policy): Decision {
  const reasons: string[] = [];

  const now = Date.now();
  const exp = Date.parse(intent.expiresAt);
  if (!Number.isFinite(exp) || exp < now) reasons.push('intent expired');

  if (intent.kind === 'sol_transfer') {
    const max = intent.maxLamports ?? intent.lamports;
    if (max > policy.maxLamportsPerTx) reasons.push(`maxLamports (${max}) exceeds cap (${policy.maxLamportsPerTx})`);
    if (policy.allowRecipients?.length && !policy.allowRecipients.includes(intent.to)) reasons.push('recipient not allowlisted');
  }

  if (intent.kind === 'spl_transfer') {
    if (policy.allowRecipients?.length && !policy.allowRecipients.includes(intent.to)) reasons.push('recipient not allowlisted');
  }

  if (intent.kind === 'memo_only') {
    if (!intent.memo?.trim()) reasons.push('missing memo');
  }

  return { ok: reasons.length === 0, reasons };
}
