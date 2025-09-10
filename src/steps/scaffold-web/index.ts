/**
 * Web scaffolder: writes Next.js app structure from spec and plan.
 * Inputs: AppSpec, plan, outDir. Outputs: runnable Next.js project.
 */
import { AppSpec } from "../../types/appspec.js";
import {
    writeTextFile,
    ensureDir,
    writeFromTemplate,
} from "../fs/writeFiles.js";
import { getModel } from "../../lib/model/index.js";
import { prismaFromEntities } from "./prismaFromEntities.js";
import { scaffoldAuth } from "./auth.js";
import { writeVercelConfig, writeGitHubPagesWorkflow } from "./deploy.js";
import { join, dirname } from "path";

export async function scaffoldWebApp(spec: AppSpec, plan: any, outDir: string) {
    const model = await getModel();
    for (const f of plan.files) {
        // Use static template for binary assets only
        if (f.path.endsWith(".ico")) {
            await writeFromTemplate(join(outDir, f.path), f.template, {});
            continue;
        }
        // Build prompt for AI code generation
        const prompt = buildFilePrompt(spec, f);
        const system = `You are an expert Next.js/React developer. Generate a complete, production-ready code file for the following requirements. Respond ONLY with a valid JSON object containing: file_path, file_name, and code for the file.`;
        const user = prompt;
        let aiResp;
        try {
            aiResp = await model.completeJSON({ system, user });
        } catch (err) {
            aiResp = {
                file_path: f.path,
                file_name: f.path.split("/").pop(),
                code: `// AI generation failed: ${err}\n`,
            };
        }
        const { file_path, code } = cleanAIFileResponse(aiResp, f.path);
        await ensureDir(dirname(join(outDir, file_path)));
        await writeTextFile(join(outDir, file_path), code);
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

function buildFilePrompt(spec: AppSpec, file: any): string {
    let desc = `App name: ${spec.app.name}\nPurpose: ${spec.app.purpose}\n`;
    if (file.path.includes("layout.tsx")) {
        desc += `Create a root layout for the app, including a navbar and banner if specified. Use modern, clean design.\n`;
    }
    if (file.path.includes("(marketing)/page.tsx")) {
        desc += `Create a marketing landing page for the app. Highlight features: ${spec.features.pages
            ?.map((p: any) => p.sections?.map((s: any) => s.kind).join(", "))
            .join(", ")}.\n`;
    }
    if (file.path.includes("(app)/layout.tsx")) {
        desc += `Create a layout for the main app pages.\n`;
    }
    if (file.path.includes("Button.tsx")) {
        desc += `Create a reusable UI Button component.\n`;
    }
    if (file.path.includes("db.ts")) {
        desc += `Create a database utility file.\n`;
    }
    if (file.path.includes("seed.ts")) {
        desc += `Create a Prisma seed script for the app entities.\n`;
    }
    if (file.path.includes("package.json")) {
        desc += `Create a package.json for a Next.js app with the required dependencies.\n`;
    }
    // Add more file-specific instructions as needed
    desc += `User requested features: ${
        spec.features?.uploads ? "uploads, " : ""
    }${spec.features?.emails ? "emails, " : ""}${
        spec.features?.payments ? "payments, " : ""
    }${spec.features?.integrations?.map((i: any) => i.provider).join(", ")}.\n`;
    return desc;
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
                else if (f.name === "condition") row[f.name] = `Condition ${i}`;
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
// Cleans and standardizes the AI response for file generation
function cleanAIFileResponse(resp: any, fallbackPath: string) {
    // If response is a string, try to parse as JSON
    if (typeof resp === "string") {
        try {
            resp = JSON.parse(resp);
        } catch {
            // fallback: treat as code only
            return { file_path: fallbackPath, code: resp };
        }
    }
    // If response is an object with code
    if (resp && typeof resp === "object") {
        const file_path = resp.file_path || fallbackPath;
        const code = resp.code || resp.content || "";
        return { file_path, code };
    }
    // fallback: treat as code only
    return {
        file_path: fallbackPath,
        code: typeof resp === "string" ? resp : "",
    };
}
