/**
 * design.ts
 * - Fills/expands page sections from a lean AppSpec.
 * - Guarantees minimum content (hero + features on landing).
 */
import { AppSpec } from "../types/appspec.js";

export function ensureMinimumSections(spec: AppSpec): AppSpec {
    for (const p of spec.features.pages as any[]) {
        if (p.purpose === "landing") {
            const hasHero = p.sections?.some((s: any) => s.kind === "hero");
            const hasFeat = p.sections?.some((s: any) => s.kind === "features");
            p.sections ||= [];
            if (!hasHero)
                p.sections.unshift({
                    kind: "hero",
                    headline: `Welcome to ${spec.app.name}`,
                    subhead: spec.app.purpose,
                });
            if (!hasFeat)
                p.sections.push({
                    kind: "features",
                    bullets: ["Fast to start", "Simple to use", "Free to try"],
                });
        }
    }
    return spec;
}
