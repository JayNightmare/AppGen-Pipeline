/**
 * CLI entrypoint for the AppGen pipeline.
 * Parses args, loads model, runs the orchestrator, logs next steps.
 */
import { config as loadEnv } from "dotenv";
loadEnv();
import { runPipeline } from "../orchestrate.js";
import readline from "readline";

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

async function promptUser(
    questions: { key: string; q: string; required?: boolean }[]
) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const answers: any = {};
    for (const { key, q, required } of questions) {
        answers[key] = await new Promise((resolve) => {
            rl.question(q, (ans) => resolve(ans.trim()));
        });
        if (required && !answers[key]) {
            console.log("This field is required.");
            return await promptUser(questions);
        }
    }
    rl.close();
    return answers;
}

async function main() {
    const args = parseArgs(process.argv);
    let idea = args.idea;
    let outDir = args.outDir;
    let deployHint = args.deployHint;
    let clarifierHints: Record<string, any> = {};
    if (args.help || (!idea && !args.specPath) || !outDir) {
        if (!idea && !args.specPath) {
            console.log(
                "No idea or spec provided. Enter details interactively:"
            );
            const answers = await promptUser([
                { key: "idea", q: "Describe your app idea: ", required: true },
                {
                    key: "platform",
                    q: "Target platform (web, mobile, desktop)? [web]: ",
                },
                {
                    key: "auth",
                    q: "Does your app need authentication? (yes/no) [no]: ",
                },
                {
                    key: "db",
                    q: "Database type (none, sqlite, postgres, mysql, mongo)? [none]: ",
                },
                {
                    key: "features",
                    q: "Any special features? (comma separated, optional): ",
                },
                {
                    key: "outDir",
                    q: "Output directory (e.g. ./out/myapp): ",
                    required: true,
                },
                {
                    key: "deployHint",
                    q: "Preferred deploy target (vercel, github, electron)? [vercel]: ",
                },
            ]);
            idea = answers.idea;
            outDir = answers.outDir;
            deployHint = answers.deployHint || "vercel";
            clarifierHints = {
                platform: answers.platform || "web",
                auth: answers.auth || "no",
                db: answers.db || "none",
                features: answers.features || "",
                deployHint,
            };
        } else {
            usage();
            process.exit(0);
        }
    }
    const result = await runPipeline({
        idea,
        specPath: args.specPath,
        outDir,
        deployHint,
        clarifierHints,
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
