export function isSafeResponse(response: any): response is SafeResponse {
    return (
        typeof response === "object" &&
        response !== null &&
        typeof response.file_path === "string" &&
        typeof response.file_name === "string" &&
        typeof response.code === "string"
    );
}

export interface SafeResponse {
    file_path: string;
    file_name: string;
    code: string;
}

/**
 * Safe JSON helpers: strip fences, minor comma fixes, and parse with readable errors.
 * Inputs: raw string. Outputs: parsed object or throws Error with context.
 */
// export function stripFences(input: string): string {
//     let s = input.trim();
//     if (s.startsWith("```")) {
//         const idx = s.indexOf("\n");
//         s = s.slice(idx + 1);
//         if (s.endsWith("```")) s = s.slice(0, -3);
//     }
//     return s.trim();
// }

// export function softenTrailingCommas(json: string): string {
//     return json
//         .replace(/,\s*([}\]])/g, "$1")
//         .replace(/\u201c|\u201d|\u2018|\u2019/g, '"');
// }

// export function parseJsonLoose(input: string): any {
//     const stripped = stripFences(input);
//     const softened = softenTrailingCommas(stripped);
//     try {
//         return JSON.parse(softened);
//     } catch (err: any) {
//         throw new Error(
//             `Failed to parse JSON: ${
//                 err?.message || err
//             }. Input head: ${softened.slice(0, 200)}`
//         );
//     }
// }
