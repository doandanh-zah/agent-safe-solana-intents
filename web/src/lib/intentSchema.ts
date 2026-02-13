import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export const INTENT_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'network', 'from', 'expiresAt'],
  properties: {
    kind: { type: 'string', enum: ['sol_transfer', 'spl_transfer', 'memo_only'] },
    network: { type: 'string', enum: ['devnet', 'mainnet'] },

    from: { type: 'string', minLength: 32 },
    to: { type: 'string', minLength: 32 },

    lamports: { type: 'integer', minimum: 0 },
    maxLamports: { type: 'integer', minimum: 0 },

    mint: { type: 'string', minLength: 32 },
    amount: { type: 'string', minLength: 1 },
    decimals: { type: 'integer', minimum: 0, maximum: 18 },

    memo: { type: 'string', maxLength: 500 },

    allowRecipients: { type: 'array', items: { type: 'string' } },
    expiresAt: { type: 'string', format: 'date-time' },
    note: { type: 'string', maxLength: 200 }
  },
  allOf: [
    { if: { properties: { kind: { const: 'sol_transfer' } } }, then: { required: ['to', 'lamports'] } },
    { if: { properties: { kind: { const: 'spl_transfer' } } }, then: { required: ['to', 'mint', 'amount', 'decimals'] } },
    { if: { properties: { kind: { const: 'memo_only' } } }, then: { required: ['memo'] } }
  ]
} as const;

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(INTENT_SCHEMA);

export type IntentKind = 'sol_transfer' | 'spl_transfer' | 'memo_only';
export type Network = 'devnet' | 'mainnet';

export type Intent =
  | {
      kind: 'sol_transfer';
      network: Network;
      from: string;
      to: string;
      lamports: number;
      maxLamports?: number;
      allowRecipients?: string[];
      expiresAt: string;
      note?: string;
    }
  | {
      kind: 'spl_transfer';
      network: Network;
      from: string;
      to: string;
      mint: string;
      amount: string;
      decimals: number;
      allowRecipients?: string[];
      expiresAt: string;
      note?: string;
    }
  | {
      kind: 'memo_only';
      network: Network;
      from: string;
      memo: string;
      expiresAt: string;
      note?: string;
    };

export function parseIntent(json: string): { ok: true; intent: Intent } | { ok: false; errors: string[] } {
  try {
    const data = JSON.parse(json);
    const ok = validate(data);
    if (!ok) {
      const errors = (validate.errors || []).map((e) => `${e.instancePath || '(root)'} ${e.message}`);
      return { ok: false, errors };
    }
    return { ok: true, intent: data as Intent };
  } catch (e: any) {
    return { ok: false, errors: [e?.message || 'Invalid JSON'] };
  }
}
