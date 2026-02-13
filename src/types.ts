export type Network = 'devnet' | 'mainnet';

export type IntentKind = 'sol_transfer' | 'spl_transfer' | 'memo_only';

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

export interface SplTransferIntent {
  kind: 'spl_transfer';
  network: Network;
  from: string;
  to: string;
  mint: string;
  amount: string; // base-10 string
  decimals: number;
  allowPrograms?: string[];
  allowRecipients?: string[];
  expiresAt: string;
  note?: string;
}

export interface MemoOnlyIntent {
  kind: 'memo_only';
  network: Network;
  from: string;
  memo: string;
  expiresAt: string;
  note?: string;
}

export type Intent = SolTransferIntent | SplTransferIntent | MemoOnlyIntent;

export type PolicyDecision = {
  ok: boolean;
  reasons: string[];
};
