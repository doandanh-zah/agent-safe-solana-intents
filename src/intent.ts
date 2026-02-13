import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { Intent } from './types.js';

const schemaPath = path.resolve(process.cwd(), 'intent.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

export function parseIntent(json: string): Intent {
  const data = JSON.parse(json);
  const ok = validate(data);
  if (!ok) {
    const msg = (validate.errors || []).map((e) => `${e.instancePath || '(root)'} ${e.message}`).join('; ');
    throw new Error(`Invalid intent: ${msg}`);
  }
  return data as Intent;
}
