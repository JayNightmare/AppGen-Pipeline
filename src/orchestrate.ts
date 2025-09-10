/**
 * Orchestrator: idea/spec → plan → scaffold → install → typecheck/build gates.
 * Inputs: params with idea or specPath, outDir, deploy hint, model.
 * Outputs: { outDir, spec } or throws on gate failure.
 */
import { readFile } from "fs/promises";
import { AppSpec } from "./types/appspec.js";
import { validateAppSpec } from "./lib/validateAppSpec.js";
import { generateAppSpecFromIdea } from "./agents/clarifier.js";
import { planFromSpec } from "./steps/plan.js";
import { scaffoldWebApp } from "./steps/scaffold-web/index.js";
import { getModel, JsonModel } from "./lib/model/index.js";
import { spawn } from "child_process";
import { ensureMinimumSections } from "./lib/design.js";

export async function runPipeline(params: {
    idea?: string;
    specPath?: string;
    outDir: string;
    deployHint?: "vercel" | "github_pages";
    model?: JsonModel;
}) {
    const model = params.model || (await getModel());
    let spec: AppSpec;
    if (params.idea) {
        spec = await generateAppSpecFromIdea(params.idea, model);
    } else if (params.specPath) {
        const raw = JSON.parse(await readFile(params.specPath, "utf8"));
        spec = validateAppSpec(raw);
    } else {
        throw new Error("Provide either idea or specPath");
    }

    if (params.deployHint && spec.deploy.target !== params.deployHint) {
        spec.deploy.target = params.deployHint;
        if (params.deployHint === "github_pages")
            spec.runtime.renderMode = "ssg";
    }

    if (spec.blueprint === "web_app") {
        spec = ensureMinimumSections(spec);
        const plan = planFromSpec(spec);
        await scaffoldWebApp(spec, plan, params.outDir);
        await installAndBuild(params.outDir);
    } else {
        // Electron placeholder only
    }

    return { outDir: params.outDir, spec };
}

async function runCmd(cmd: string, args: string[], cwd: string) {
    return new Promise<void>((resolve, reject) => {
        const p = spawn(cmd, args, {
            cwd,
            stdio: "inherit",
            shell: process.platform === "win32",
        });
        p.on("exit", (code: number | null) =>
            code === 0
                ? resolve()
                : reject(
                      new Error(
                          `${cmd} ${args.join(" ")} failed with code ${code}`
                      )
                  )
        );
    });
}

async function installAndBuild(outDir: string) {
    await runCmd("npm", ["i", "--no-fund", "--no-audit"], outDir);
    await runCmd("npm", ["run", "typecheck"], outDir);
    await runCmd("npm", ["run", "build"], outDir);
}
