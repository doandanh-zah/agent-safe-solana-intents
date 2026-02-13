export type Network = 'devnet' | 'mainnet';

export type IntentKind = 'sol_transfer';

export interface SolTransferIntent {
  kind: 'sol_transfer';
  network: Network;
  from: string;
  to: string;
  lamports: number;
  maxLamports?: number;
  allowPrograms?: string[];
  allowRecipients?: string[];
  expiresAt: string; // ISO
  note?: string;
}

export type Intent = SolTransferIntent;

export type PolicyDecision = {
  ok: boolean;
  reasons: string[];
};
