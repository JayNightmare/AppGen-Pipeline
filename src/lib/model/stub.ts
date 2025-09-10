/**
 * Deterministic stub model. Generates a minimal valid AppSpec from an idea string.
 * Inputs: system+user text. Outputs: small JSON spec for demo use.
 */
import { JsonModel } from "./index.js";
import { parseJsonLoose } from "../safeJson.js";

export class StubJsonModel implements JsonModel {
    async completeJSON({
        user,
    }: {
        system: string;
        user: string;
        schema?: object;
        maxRetries?: number;
    }): Promise<any> {
        const ideaMatch = /IDEA_START\n([\s\S]*?)\nIDEA_END/.exec(user);
        const idea = (ideaMatch?.[1] || "App").trim();
        const name =
            idea
                .split(/\s+/)
                .slice(0, 2)
                .map((s) => s.replace(/[^a-z0-9]/gi, ""))
                .join("") || "App";
        const json = {
            blueprint: "web_app",
            app: {
                name: name,
                purpose: idea,
                roles: ["user"],
                entities: [],
            },
            features: {
                auth: "none",
                pages: ["/", "/items", "/items/[id]"],
                integrations: [],
            },
            runtime: { renderMode: "ssg", database: "none" },
            deploy: { target: "github_pages", domain: null },
        };
        return json;
    }
}
