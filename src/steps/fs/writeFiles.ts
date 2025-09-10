/**
 * FS helpers to write files/directories with token replacement.
 * Inputs: file list and outDir. Outputs: on-disk scaffolding.
 */
import { mkdir, writeFile, readFile } from "fs/promises";
import { dirname, join } from "path";

export async function ensureDir(p: string) {
    await mkdir(p, { recursive: true });
}

export async function writeTextFile(path: string, content: string) {
    await ensureDir(dirname(path));
    await writeFile(path, content, "utf8");
}

export async function writeBinaryFile(path: string, data: Buffer) {
    await ensureDir(dirname(path));
    await writeFile(path, data);
}

export function replaceTokens(
    input: string,
    tokens: Record<string, string>
): string {
    return Object.entries(tokens).reduce(
        (acc, [k, v]) => acc.split(k).join(v),
        input
    );
}

export async function writeFromTemplate(
    outPath: string,
    templateRel: string,
    tokens: Record<string, string> = {}
) {
    const src = join(process.cwd(), "src", "templates", templateRel);
    const isBinary = src.endsWith(".ico");
    if (isBinary) {
        const buf = await readFile(src);
        await writeBinaryFile(outPath, buf);
    } else {
        const raw = await readFile(src, "utf8");
        const content = replaceTokens(raw, tokens);
        await writeTextFile(outPath, content);
    }
}
