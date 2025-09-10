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

export async function generateAppSpecFromIdea(idea: string, model: JsonModel): Promise<AppSpec> {
  const { system, user } = buildClarifierPrompt(idea);
  let draft: any = await model.completeJSON({ system, user, schema });
  draft = applyHeuristics(draft);
  try {
    return validateAppSpec(draft);
  } catch (e: any) {
    const correctionInfo = `Previous output failed validation: ${e.message}. Correct the JSON strictly to satisfy the schema. Output only JSON.`;
    const corrected = await model.completeJSON({ system, user: user + '\n' + correctionInfo, schema, maxRetries: 1 });
    const fixed = applyHeuristics(corrected);
    return validateAppSpec(fixed);
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
