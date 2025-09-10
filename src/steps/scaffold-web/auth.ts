/**
 * Auth scaffolding stubs. Wires NextAuth providers where applicable.
 * Inputs: features.auth, outDir. Outputs: files under src/app/api/auth (SSR only).
 */
import { writeTextFile, ensureDir } from "../fs/writeFiles.js";
import { join } from "path";

export async function scaffoldAuth(
    authType: "none" | "email_magic" | "google_oauth",
    isSSR: boolean,
    outDir: string
) {
    if (authType === "none") return;
    if (!isSSR) return; // no server routes for SSG
    const routeFile = join(
        outDir,
        "src",
        "app",
        "api",
        "auth",
        "[...nextauth]",
        "route.ts"
    );
    await ensureDir(join(outDir, "src", "app", "api", "auth", "[...nextauth]"));
    const content =
        authType === "google_oauth" ? googleAuthRoute() : emailAuthRoute();
    await writeTextFile(routeFile, content);
}

function googleAuthRoute() {
    return `import NextAuth from 'next-auth';\nimport GoogleProvider from 'next-auth/providers/google';\nconst handler = NextAuth({ providers: [ GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID||'', clientSecret: process.env.GOOGLE_CLIENT_SECRET||'' }) ] });\nexport { handler as GET, handler as POST };`;
}

function emailAuthRoute() {
    return `import NextAuth from 'next-auth';\nimport EmailProvider from 'next-auth/providers/email';\nconst handler = NextAuth({ providers: [ EmailProvider({ sendVerificationRequest({ url }) { console.log('Magic link:', url); } }) ] });\nexport { handler as GET, handler as POST };`;
}
