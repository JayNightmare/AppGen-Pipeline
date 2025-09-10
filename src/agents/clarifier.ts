/**
 * Clarifier agent: builds prompt and turns idea → AppSpec with one correction pass.
 * Inputs: idea string, model. Outputs: validated AppSpec.
 */
import schema from '../schemas/appspec.schema.json' with { type: 'json' };
import { JsonModel } from '../lib/model/index.js';
import { validateAppSpec } from '../lib/validateAppSpec.js';
import { AppSpec } from '../types/appspec.js';

export function buildClarifierPrompt(idea: string, hints?: Record<string, any>): { system: string; user: string } {
  const system = [
    'You are an expert product/tech specifier.',
    'Ask yourself at most 8 concise internal questions, then OUTPUT ONLY valid JSON matching the provided JSON Schema (no extra keys).',
    'If uncertain, choose sensible defaults from enum values. Keep arrays minimal but non-empty when required.',
  'The output MUST include top-level keys: "blueprint", "app", "features", "runtime", "deploy".',
    'If deploy target is github_pages, enforce runtime.renderMode = "ssg" and disallow server routes.',
    'If deploy target is vercel and features.auth != none, prefer runtime.renderMode = "ssr".',
    'If user wants a DB but github_pages is chosen, set runtime.database to turso or supabase, but note no server routes.',
  ].join(' ');
  const user = [
    'JSON_SCHEMA_START',
    JSON.stringify(schema, null, 2),
    'JSON_SCHEMA_END',
    'HINTS_START',
    JSON.stringify(hints || {}, null, 2),
    'HINTS_END',
    'IDEA_START',
    idea,
    'IDEA_END'
  ].join('\n');
  return { system, user };
}

export async function generateAppSpecFromIdea(idea: string, model: JsonModel, hints?: Record<string, any>): Promise<AppSpec> {
  const { system, user } = buildClarifierPrompt(idea, hints);
  let draft: any = await model.completeJSON({ system, user, schema });
  // If the response is wrapped in { file_path, file_name, code }, extract code
  if (draft && typeof draft === 'object' && draft.code) {
    draft = draft.code;
  }
  draft = applyHeuristics(draft);
  console.log("[DEBUG] Initial AppSpec draft:", JSON.stringify(draft, null, 2));
  try {
    return validateAppSpec(draft);
  } catch (e: any) {
    console.warn("[DEBUG] Initial AppSpec validation failed:", e.message);
    const correctionInfo = `Previous output failed validation: ${e.message}. Correct the JSON strictly to satisfy the schema. Output only JSON.`;
    let corrected = await model.completeJSON({ system, user: user + '\n' + correctionInfo, schema, maxRetries: 1 });
    if (corrected && typeof corrected === 'object' && corrected.code) {
      corrected = corrected.code;
    }
    const fixed = applyHeuristics(corrected);
    console.log("[DEBUG] Corrected AppSpec draft:", JSON.stringify(fixed, null, 2));
    try {
      return validateAppSpec(fixed);
    } catch (err) {
      throw new Error("AppSpec validation failed after correction. OpenAI output is invalid.");
    }
  }
}

function applyHeuristics(spec: any): any {
  if (!spec || typeof spec !== 'object') return spec;
  if (spec.deploy?.target === 'github_pages') {
    spec.runtime = spec.runtime || {};
    spec.runtime.renderMode = 'ssg';
  }
  if (spec.deploy?.target === 'vercel' && spec.features?.auth && spec.features.auth !== 'none') {
    spec.runtime = spec.runtime || {};
    spec.runtime.renderMode = 'ssr';
  }
  return spec;
}
