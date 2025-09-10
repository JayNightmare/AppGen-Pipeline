/** Minimal Next.js config with static export support. */
const isGH = process.env.GITHUB_PAGES === "true";
export default {
    output: isGH ? "export" : undefined,
    images: { unoptimized: true },
};
