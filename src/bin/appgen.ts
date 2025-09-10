/**
 * CLI entrypoint for the AppGen pipeline.
 * Parses args, loads model, runs the orchestrator, logs next steps.
 */
import { config as loadEnv } from "dotenv";
loadEnv();
import { runPipeline } from "../orchestrate.js";

function parseArgs(argv: string[]) {
    const args: any = {};
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--idea") args.idea = argv[++i];
        else if (a === "--spec") args.specPath = argv[++i];
        else if (a === "--out") args.outDir = argv[++i];
        else if (a === "--deploy") args.deployHint = argv[++i];
        else if (a === "--help" || a === "-h") args.help = true;
    }
    return args;
}

function usage() {
    console.log(`Usage:
  tsx src/bin/appgen.ts --idea "Book swap app" --out ./out/bookswap --deploy vercel
  tsx src/bin/appgen.ts --spec ./examples/bookswap.json --out ./out/bookswap
`);
}

async function main() {
    const args = parseArgs(process.argv);
    if (args.help || (!args.idea && !args.specPath) || !args.outDir) {
        usage();
        process.exit(0);
    }
    const result = await runPipeline({
        idea: args.idea,
        specPath: args.specPath,
        outDir: args.outDir,
        deployHint: args.deployHint,
    });
    console.log("Scaffold complete at:", result.outDir);
    console.log("Next steps:");
    console.log("  1) cd", result.outDir);
    console.log("  2) npm i");
    console.log("  3) npm run typecheck && npm run build");
    console.log("  4) npm run dev");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
