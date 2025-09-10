/**
 * Deploy config writers for vercel and github pages.
 * Inputs: target + outDir. Outputs: vercel.json or GH Pages workflow stub.
 */
import { writeTextFile, ensureDir } from "../fs/writeFiles.js";
import { join } from "path";

export async function writeVercelConfig(outDir: string) {
    const path = join(outDir, "vercel.json");
    await writeTextFile(path, JSON.stringify({ version: 2 }, null, 2));
}

export async function writeGitHubPagesWorkflow(outDir: string) {
    const wfDir = join(outDir, ".github", "workflows");
    await ensureDir(wfDir);
    const stub = `# GitHub Pages deploy stub\n# 1) Enable GitHub Pages from the 'gh-pages' branch.\n# 2) Add a job to run 'npm run export' and push outDir.\n`;
    await writeTextFile(join(wfDir, "gh-pages.yml"), stub);
}
