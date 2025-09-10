/**
 * Prisma generator from entities.
 * Inputs: entities array. Outputs: schema.prisma text.
 */
import { AppSpec } from "../../types/appspec.js";

function idAndTimestamps() {
    return [
        "  id        String   @id @default(cuid())",
        "  createdAt DateTime @default(now())",
    ].join("\n");
}

function sanitizeEnumName(name: string) {
    return name.replace(/[^A-Za-z0-9_]/g, "_");
}

export function prismaFromEntities(spec: AppSpec): string {
    const enums = new Map<string, string[]>();
    const models: string[] = [];

    for (const ent of spec.app.entities) {
        const lines: string[] = [`model ${ent.name} {`, idAndTimestamps()];
        for (const f of ent.fields) {
            if (f.type === "enum") {
                const en = sanitizeEnumName(`${ent.name}_${f.name}`);
                enums.set(en, f.enumValues || []);
                lines.push(`  ${f.name} ${en}${f.optional ? "?" : ""}`);
            } else {
                let t = "String";
                if (f.type === "int") t = "Int";
                else if (f.type === "float") t = "Float";
                else if (f.type === "bool") t = "Boolean";
                else if (f.type === "date" || f.type === "datetime")
                    t = "DateTime";
                else if (f.type === "json") t = "Json";
                lines.push(`  ${f.name} ${t}${f.optional ? "?" : ""}`);
            }
        }
        lines.push("}");
        models.push(lines.join("\n"));
    }

    const enumBlocks = Array.from(enums.entries()).map(([name, values]) => {
        const vals = values.map((v) => `  ${sanitizeEnumName(v)}`).join("\n");
        return `enum ${name} {\n${vals}\n}`;
    });

    const header = [
        "generator client {",
        '  provider = "prisma-client-js"',
        "}",
        "datasource db {",
        '  provider = "postgresql"',
        '  url      = env("DATABASE_URL")',
        "}",
    ].join("\n");

    return [header, ...enumBlocks, ...models].join("\n\n");
}
