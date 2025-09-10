/**
 * Model provider abstraction to produce valid JSON responses.
 * Inputs: prompts + optional JSON Schema. Outputs: parsed JSON object.
 */
import { config as loadEnv } from "dotenv";
loadEnv();

export interface JsonModel {
    completeJSON(params: {
        system: string;
        user: string;
        schema?: object;
        maxRetries?: number;
    }): Promise<any>;
}

export async function getModel(): Promise<JsonModel> {
    const provider = (process.env.MODEL_PROVIDER || "stub").toLowerCase();
    if (provider === "openai") {
        const { OpenAIJsonModel } = await import("./openai.js");
        return new OpenAIJsonModel();
    }
    const { StubJsonModel } = await import("./stub.js");
    return new StubJsonModel();
}
