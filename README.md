# AppGen Pipeline (Prompt → Production-Ready App)

This repo implements an AI clarifier + orchestrator + web app scaffolder that turns a user idea into a validated AppSpec and generates a Next.js app. It supports two deploy modes: Vercel (SSR/serverless) and GitHub Pages (SSG/export). Electron is planned (placeholder only).

## What’s inside
- Types & JSON Schema (AppSpec contract)
- Validation utilities (Ajv + formats, safe JSON repair)
- Model provider abstraction (OpenAI or stub)
- Clarifier agent to transform ideas into a valid AppSpec
- Planner & Orchestrator to scaffold a Next.js app from the spec
- Web scaffolder (App Router) with Prisma schema generation

## Quick start
1. Copy env template:
```bash
cp .env.example .env
```
2. Install deps:
```bash
npm i
```
3. Typecheck and build:
```bash
npm run typecheck && npm run build
```

## Demo run with example AppSpec
Generate a scaffold using the provided example:
```bash
npx tsx src/bin/appgen.ts --spec ./examples/bookswap.json --out ./out/bookswap
```
Or from an idea using the stub model:
```bash
npx tsx src/bin/appgen.ts --idea "A book swap marketplace" --out ./out/bookswap --deploy vercel
```

## Using OpenAI
- Set `MODEL_PROVIDER=openai` in `.env`
- Provide `OPENAI_API_KEY` and optionally `OPENAI_MODEL` (default `gpt-4o-mini`).
- The clarifier will use JSON mode and retry if output is invalid.

## SSG vs SSR and deploy
- GitHub Pages → enforced SSG (no server routes); site is exported.
- Vercel → prefers SSR when auth is enabled; API routes allowed.

### Example commands
```bash
npm i
npm run typecheck && npm run build
npx tsx src/bin/appgen.ts --spec ./examples/bookswap.json --out ./out/bookswap
npx tsx src/bin/appgen.ts --idea "Book swap app" --out ./out/bookswap --deploy vercel
```

## Notes
- Minimal inline comments; each file has a short header docblock.
- Lean dependencies; no test files are included.
