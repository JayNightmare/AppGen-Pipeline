/**
 * AppSpec types using Zod. Mirrors JSON Schema for strict validation and DX.
 * Inputs: raw objects. Outputs: parsed `AppSpec` type and DEFAULTS helper.
 * Caveats: keep in sync with appspec.schema.json; enums define valid values.
 */
import { z } from "zod";

export const FieldTypeEnum = z.enum([
    "string",
    "text",
    "int",
    "float",
    "bool",
    "date",
    "datetime",
    "enum",
    "json",
]);

export const EntityFieldSchema = z
    .object({
        name: z.string().min(1),
        type: FieldTypeEnum,
        enumValues: z.array(z.string()).min(1).optional(),
        optional: z.boolean().optional(),
    })
    .refine(
        (f) =>
            f.type !== "enum" ||
            (Array.isArray(f.enumValues) && f.enumValues.length > 0),
        {
            message: "enum type requires enumValues",
        }
    );

export const EntitySchema = z.object({
    name: z.string().min(1),
    fields: z.array(EntityFieldSchema),
});

export const FeaturesSchema = z.object({
    auth: z.enum(["none", "email_magic", "google_oauth"]),
    pages: z
        .array(
            z.union([
                z.string().min(1),
                z.object({
                    path: z.string().min(1),
                    purpose: z.enum([
                        "landing",
                        "list",
                        "detail",
                        "form",
                        "dashboard",
                        "about",
                        "contact",
                        "faq",
                    ]),
                    entity: z.string().optional(),
                    sections: z
                        .array(
                            z.object({
                                kind: z.enum([
                                    "hero",
                                    "features",
                                    "faq",
                                    "list",
                                    "detail",
                                    "form",
                                    "contact",
                                    "pricing",
                                ]),
                                headline: z.string().min(18).optional(),
                                subhead: z.string().min(30).optional(),
                                bullets: z.array(z.string()).min(3).optional(),
                                fields: z.array(z.string()).optional(),
                            })
                        )
                        .min(1)
                        .optional(),
                }),
            ])
        )
        .min(1),
    uploads: z.boolean().optional(),
    emails: z.boolean().optional(),
    payments: z.boolean().optional(),
    integrations: z
        .array(
            z.object({
                provider: z.enum([
                    "stripe",
                    "resend",
                    "supabase",
                    "custom_api",
                ]),
                name: z.string().optional(),
                config: z.record(z.any()).optional(),
            })
        )
        .optional()
        .default([]),
});

export const RuntimeSchema = z.object({
    renderMode: z.enum(["ssg", "ssr"]),
    database: z.enum(["none", "neon", "turso", "supabase"]),
});

export const DeploySchema = z.object({
    target: z.enum(["vercel", "github_pages"]),
    domain: z.string().min(1).nullable().optional(),
});

export const AppSchema = z.object({
    name: z.string().min(1),
    purpose: z.string().min(1),
    roles: z.array(z.string().min(1)).min(1),
    entities: z.array(EntitySchema).default([]),
});

export const AppSpecSchema = z.object({
    blueprint: z.enum(["web_app", "electron_app"]),
    app: AppSchema,
    features: FeaturesSchema,
    runtime: RuntimeSchema,
    deploy: DeploySchema,
});

export type AppSpec = z.infer<typeof AppSpecSchema>;

export const DEFAULTS = {
    forDeploy(
        target: "vercel" | "github_pages"
    ): Pick<AppSpec, "runtime" | "deploy"> {
        const renderMode = target === "github_pages" ? "ssg" : "ssr";
        return {
            runtime: { renderMode, database: "none" },
            deploy: { target },
        } as any;
    },
};
