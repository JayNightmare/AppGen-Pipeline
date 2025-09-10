/**
 * Web scaffolder: writes Next.js app structure from spec and plan.
 * Inputs: AppSpec, plan, outDir. Outputs: runnable Next.js project.
 */
import { AppSpec } from "../../types/appspec.js";
import {
    writeFromTemplate,
    writeTextFile,
    ensureDir,
} from "../fs/writeFiles.js";
import { prismaFromEntities } from "./prismaFromEntities.js";
import { generateListPage, generateDetailPage } from "./pages.js";
import { scaffoldAuth } from "./auth.js";
import { writeVercelConfig, writeGitHubPagesWorkflow } from "./deploy.js";
import { join } from "path";

export async function scaffoldWebApp(spec: AppSpec, plan: any, outDir: string) {
    const tokens = {
        __APP_NAME__: spec.app.name,
        __SUBHEAD__: spec.app.purpose,
    };
    for (const f of plan.files) {
        await writeFromTemplate(join(outDir, f.path), f.template, tokens);
    }
    if (plan.needsDB) {
        const schema = prismaFromEntities(spec);
        await writeTextFile(join(outDir, "prisma", "schema.prisma"), schema);
    }
    // Write fixtures when no DB so pages have data
    if (!plan.needsDB) {
        const fixtures = buildFixtures(spec);
        await writeTextFile(
            join(outDir, "src", "lib", "fixtures.json"),
            JSON.stringify(fixtures, null, 2)
        );
    }
    const envLines: string[] = [];
    if (plan.needsDB) envLines.push("DATABASE_URL=");
    if (spec.features.auth === "google_oauth")
        envLines.push(
            "GOOGLE_CLIENT_ID=",
            "GOOGLE_CLIENT_SECRET=",
            "NEXTAUTH_SECRET="
        );
    if (spec.features.auth === "email_magic")
        envLines.push("# RESEND_API_KEY=");
    await writeTextFile(join(outDir, ".env.example"), envLines.join("\n"));

    const pages = spec.features.pages as any[];
    for (const p of pages) {
        const pathStr = typeof p === "string" ? p : p.path;
        if (!pathStr || pathStr === "/") continue;
        const parts = pathStr.split("/").filter(Boolean);
        const base = join(outDir, "src", "app", ...parts);
        const isDetail = parts[parts.length - 1]?.startsWith("[");
        const hintedEntity =
            typeof p === "object" && p.entity ? p.entity : undefined;
        const collection = hintedEntity
            ? hintedEntity.toLowerCase().endsWith("s")
                ? hintedEntity.toLowerCase()
                : hintedEntity.toLowerCase() + "s"
            : parts[0] || "items";
        const singular = hintedEntity
            ? hintedEntity.toLowerCase().replace(/s$/, "")
            : collection.replace(/s$/, "");
        // compute relative path from this page dir to src (for imports)
        // from src/app/... to src => '../' repeated segments after src (app + parts)
        const segmentsAfterSrc = 1 + parts.length; // 'app' + parts
        const relToLib = Array(segmentsAfterSrc).fill("..").join("/") || ".";
        const src = isDetail
            ? generateDetailPage({
                  collection,
                  singular,
                  isSSR: plan.isSSR,
                  relToLib,
              })
            : generateListPage({
                  collection,
                  singular,
                  isSSR: plan.isSSR,
                  relToLib,
              });
        await ensureDir(base);
        await writeTextFile(join(base, "page.tsx"), src);
    }

    if (spec.deploy.target === "vercel") await writeVercelConfig(outDir);
    if (spec.deploy.target === "github_pages")
        await writeGitHubPagesWorkflow(outDir);

    await scaffoldAuth(spec.features.auth, plan.isSSR, outDir);

    const pkg = basePackageJson(spec, plan);
    await writeTextFile(
        join(outDir, "package.json"),
        JSON.stringify(pkg, null, 2)
    );
}

function basePackageJson(spec: AppSpec, plan: any) {
    return {
        name: spec.app.name.toLowerCase().replace(/\s+/g, "-"),
        private: true,
        type: "module",
        scripts: {
            dev: "next dev",
            build:
                plan.deployTarget === "github_pages"
                    ? "next build && next export"
                    : "next build",
            start: "next start",
            lint: 'echo "No linter configured"',
            typecheck: "tsc --noEmit",
            seed: "tsx prisma/seed.ts",
            postinstall: plan.needsDB ? "prisma generate" : "",
        },
        dependencies: Object.fromEntries(
            plan.deps.map((d: string) => parseDep(d))
        ),
        devDependencies: Object.fromEntries(
            plan.devDeps.map((d: string) => parseDep(d))
        ),
    };
}
const parseDep = (s: string): [string, string] => {
    const at = s.lastIndexOf("@");
    if (at > 0) {
        const name = s.slice(0, at);
        const ver = s.slice(at + 1) || "*";
        return [name, ver];
    }
    return [s, "*"];
};

function buildFixtures(spec: AppSpec) {
    const out: Record<string, any[]> = {};
    const entities = spec.app.entities?.length
        ? spec.app.entities
        : [
              {
                  name: "Item",
                  fields: [
                      { name: "title", type: "string" },
                      { name: "author", type: "string" },
                      { name: "condition", type: "string" },
                  ],
              },
          ];
    for (const ent of entities) {
        const coll = ent.name.toLowerCase().endsWith("s")
            ? ent.name.toLowerCase()
            : ent.name.toLowerCase() + "s";
        const rows: any[] = [];
        const n = 10; // 8–12; choose 10 default
        for (let i = 1; i <= n; i++) {
            const row: any = { id: String(i) };
            for (const f of ent.fields) {
                if (f.name === "title") row.title = `${ent.name} ${i}`;
                else if (f.name === "author") row.author = `Author ${i}`;
                else if (f.name === "condition")
                    row.condition = ["new", "good", "fair"][i % 3];
                else if (f.type === "int") row[f.name] = i;
                else if (f.type === "float") row[f.name] = i + 0.5;
                else if (f.type === "bool") row[f.name] = i % 2 === 0;
                else if (f.type === "enum") {
                    const ev = (f as any).enumValues?.length
                        ? (f as any).enumValues
                        : ["A", "B", "C"];
                    row[f.name] = ev[i % ev.length];
                } else if (f.type === "date" || f.type === "datetime")
                    row[f.name] = new Date(
                        Date.now() - i * 86400000
                    ).toISOString();
                else if (f.type === "json") row[f.name] = { sample: i };
                else row[f.name] = `${f.name} ${i}`;
            }
            rows.push(row);
        }
        out[coll] = rows;
    }
    return out;
}
