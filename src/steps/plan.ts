/**
 * Planner: derives install deps and file templates list from AppSpec.
 * Inputs: AppSpec. Outputs: plan with deps/devDeps and files to write.
 */
import { AppSpec } from "../types/appspec.js";

export function planFromSpec(spec: AppSpec) {
    const isSSR = spec.runtime.renderMode === "ssr";
    const needsDB = spec.runtime.database !== "none";
    const needsAuth = spec.features.auth !== "none";
    const deployTarget = spec.deploy.target;

    const deps = [
        "next@14",
        "react@18",
        "react-dom@18",
        "zod@^3",
        "dotenv@^16",
    ];
    const devDeps = [
        "typescript@^5",
        "@types/node@^20",
        "@types/react@^18",
        "@types/react-dom@^18",
    ];
    if (needsDB) deps.push("@prisma/client@^5");
    if (needsDB) devDeps.push("prisma@^5");
    if (needsAuth) deps.push("next-auth@^5");

    const files: { path: string; template: string; data?: any }[] = [];
    files.push({
        path: "next.config.mjs",
        template: "web_app/next.config.mjs",
    });
    files.push({ path: "tsconfig.json", template: "web_app/tsconfig.json" });
    files.push({ path: "next-env.d.ts", template: "web_app/next-env.d.ts" });
    files.push({
        path: "src/app/layout.tsx",
        template: "web_app/src/app/layout.tsx",
    });
    files.push({
        path: "src/app/(marketing)/page.tsx",
        template: "web_app/src/app/(marketing)/page.tsx",
    });
    files.push({
        path: "src/app/(app)/layout.tsx",
        template: "web_app/src/app/(app)/layout.tsx",
    });
    files.push({
        path: "src/components/ui/Button.tsx",
        template: "web_app/src/components/ui/Button.tsx",
    });
    files.push({
        path: "public/favicon.ico",
        template: "web_app/public/favicon.ico",
    });
    files.push({ path: "src/lib/db.ts", template: "web_app/src/lib/db.ts" });
    files.push({ path: "prisma/seed.ts", template: "web_app/prisma/seed.ts" });
    files.push({
        path: ".github/workflows/ci.yml",
        template: "web_app/.github/workflows/ci.yml",
    });

    return {
        isSSR,
        needsDB,
        needsAuth,
        deployTarget,
        deps,
        devDeps,
        files,
    } as const;
}
