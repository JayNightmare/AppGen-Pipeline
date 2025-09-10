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
    const tokens = { __APP_NAME__: spec.app.name };
    for (const f of plan.files) {
        await writeFromTemplate(join(outDir, f.path), f.template, tokens);
    }
    if (plan.needsDB) {
        const schema = prismaFromEntities(spec);
        await writeTextFile(join(outDir, "prisma", "schema.prisma"), schema);
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

    const pages = spec.features.pages;
    for (const p of pages) {
        if (p === "/") continue;
        const parts = p.split("/").filter(Boolean);
        const base = join(outDir, "src", "app", ...parts);
        const isDetail = parts[parts.length - 1]?.startsWith("[");
        const relEntity = parts[0]?.replace(/s$/, "") || "Item";
        const src = isDetail
            ? generateDetailPage(relEntity, plan.isSSR)
            : generateListPage(relEntity, plan.isSSR);
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
