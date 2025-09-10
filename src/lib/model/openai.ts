/**
 * OpenAI-backed JSON model using JSON mode with lightweight retry logic.
 * Inputs: system+user, optional schema. Outputs: parsed JSON.
 * Caveats: requires OPENAI_API_KEY and model name.
 */
import { JsonModel } from "./index.js";
import { parseJsonLoose } from "../safeJson.js";

export class OpenAIJsonModel implements JsonModel {
    private client: any | null = null;
    private model =
        (typeof process !== "undefined" && process.env.OPENAI_MODEL) ||
        "gpt-4o-mini";
    constructor() {}
    async completeJSON({
        system,
        user,
        schema,
        maxRetries = 2,
    }: {
        system: string;
        user: string;
        schema?: object;
        maxRetries?: number;
    }): Promise<any> {
        if (!this.client) {
            const mod: any = await import("openai");
            const OpenAI = mod.default || mod.OpenAI;
            this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
        let lastError: any;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const messages: any[] = [
                { role: "system", content: system },
                { role: "user", content: user },
            ];
            try {
                const hasSchema = !!schema && typeof schema === "object";
                try {
                    const resp = await this.client.chat.completions.create({
                        model: this.model,
                        messages,
                        response_format: hasSchema
                            ? {
                                  type: "json_schema",
                                  json_schema: {
                                      name: "AppSpec",
                                      schema,
                                      strict: true,
                                  },
                              }
                            : { type: "json_object" },
                        max_completion_tokens: 1000,
                    });
                    const txt = resp.choices?.[0]?.message?.content || "{}";
                    return parseJsonLoose(txt);
                } catch (e: any) {
                    if (hasSchema) {
                        const resp2 = await this.client.chat.completions.create(
                            {
                                model: this.model,
                                messages,
                                response_format: { type: "json_object" },
                                max_completion_tokens: 1000,
                            }
                        );
                        const txt2 =
                            resp2.choices?.[0]?.message?.content || "{}";
                        return parseJsonLoose(txt2);
                    }
                    throw e;
                }
            } catch (err: any) {
                lastError = err;
            }
        }
        throw new Error(
            `OpenAI JSON completion failed: ${lastError?.message || lastError}`
        );
    }
}
