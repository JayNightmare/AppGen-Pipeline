/**
 * Validates an unknown object against the AppSpec JSON Schema using Ajv+formats.
 * Inputs: unknown spec. Outputs: typed AppSpec or throws a readable Error.
 */
import AjvBase from 'ajv';
import addFormatsMod from 'ajv-formats';
import { createRequire } from 'module';
import schema from '../schemas/appspec.schema.json' with { type: 'json' };
import { AppSpec, AppSpecSchema } from '../types/appspec.js';

const require = createRequire(import.meta.url);
let AjvClass: any;
try {
  // Load draft 2020-specific constructor if available
  const m = require('ajv/dist/2020');
  AjvClass = m?.default || m;
} catch {
  AjvClass = AjvBase as any;
}
const ajv: any = new AjvClass({ allErrors: true, strict: true });
const addFormats = (addFormatsMod as any).default || (addFormatsMod as any);
addFormats(ajv);
const validate = ajv.compile(schema as any);

export function validateAppSpec(spec: unknown): AppSpec {
  const ok = validate(spec);
  if (!ok) {
    const msg = (validate.errors || [])
      .map((e: any) => `${e.instancePath || '/'} ${e.message}`)
      .join('\n');
    throw new Error(`AppSpec validation failed:\n${msg}`);
  }
  const parsed = AppSpecSchema.safeParse(spec);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`AppSpec Zod refinement failed:\n${msg}`);
  }
  return parsed.data;
}
