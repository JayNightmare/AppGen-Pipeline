/** Marketing landing — uses __APP_NAME__ and __SUBHEAD__ */
export default function Page() {
    return (
        <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
            <section style={{ padding: "4rem 0" }}>
                <h1 style={{ fontSize: 42, margin: 0 }}>__APP_NAME__</h1>
                <p style={{ opacity: 0.85, maxWidth: 680 }}>__SUBHEAD__</p>
                <div style={{ marginTop: 16 }}>
                    <a
                        href="/books"
                        style={{
                            padding: "10px 16px",
                            border: "1px solid #333",
                            borderRadius: 12,
                            textDecoration: "none",
                        }}
                    >
                        Browse Books
                    </a>
                </div>
            </section>
            <section
                style={{
                    display: "grid",
                    gap: 12,
                    gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                }}
            >
                <div
                    style={{
                        border: "1px solid #333",
                        padding: 16,
                        borderRadius: 12,
                    }}
                >
                    Post in seconds
                </div>
                <div
                    style={{
                        border: "1px solid #333",
                        padding: 16,
                        borderRadius: 12,
                    }}
                >
                    Search by author or title
                </div>
                <div
                    style={{
                        border: "1px solid #333",
                        padding: 16,
                        borderRadius: 12,
                    }}
                >
                    Arrange safe swaps
                </div>
            </section>
        </main>
    );
}
