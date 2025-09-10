/** Seed script placeholder */
export async function main() {}
if (require.main === module) {
    main()
        .catch((e) => {
            console.error(e);
            process.exit(1);
        })
        .then(() => process.exit(0));
}
