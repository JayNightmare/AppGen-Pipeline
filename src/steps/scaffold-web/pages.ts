/**
 * Page generators for entity list/detail using fixtures when no DB.
 * - When DATABASE_URL is set at build/runtime, pages can switch to Prisma.
 */

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function generateListPage(params: {
    collection: string; // e.g., "books"
    singular: string; // e.g., "book"
    isSSR: boolean;
    relToLib: string; // e.g., "../.." from page dir to src
}) {
    const { collection, singular, isSSR, relToLib } = params;
    const title = `${cap(singular)} List`;
    const fixturesImport = `${relToLib}/lib/fixtures.json`;
    const dbImport = `${relToLib}/lib/db`;

    if (isSSR) {
        return `import fixtures from "${fixturesImport}";
import { db } from "${dbImport}";

async function getItems() {
  if (process.env.DATABASE_URL && (db as any)?.${singular}?.findMany) {
    try {
      // @ts-ignore — Prisma client shape when added later
      return await (db as any).${singular}.findMany({ take: 50 });
    } catch {}
  }
  return ((fixtures as any)["${collection}"] || []) as any[];
}

export default async function Page() {
  const items = await getItems();
  return (
    <main style={{ padding: 24 }}>
      <h1>${title}</h1>
      <ul style={{ display: 'grid', gap: 12, listStyle: 'none', padding: 0 }}>
        {items.map((it: any) => (
          <li key={String(it.id)} style={{ border: '1px solid #333', borderRadius: 12, padding: 12 }}>
            <a href={"/${collection}/" + String(it.id)} style={{ textDecoration: 'none' }}>
              <div style={{ fontWeight: 600 }}>{it.title ?? it.name ?? ('${cap(
                  singular
              )} #' + String(it.id))}</div>
              <div style={{ opacity: .8 }}>{it.author ?? it.description ?? ''}</div>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
`;
    }

    // SSG
    return `import fixtures from "${fixturesImport}";
const data = ((fixtures as any)["${collection}"] || []) as any[];

export default function Page() {
  const items = data;
  return (
    <main style={{ padding: 24 }}>
      <h1>${title}</h1>
      <ul style={{ display: 'grid', gap: 12, listStyle: 'none', padding: 0 }}>
        {items.map((it: any) => (
          <li key={String(it.id)} style={{ border: '1px solid #333', borderRadius: 12, padding: 12 }}>
            <a href={"/${collection}/" + String(it.id)} style={{ textDecoration: 'none' }}>
              <div style={{ fontWeight: 600 }}>{it.title ?? it.name ?? ('${cap(
                  singular
              )} #' + String(it.id))}</div>
              <div style={{ opacity: .8 }}>{it.author ?? it.description ?? ''}</div>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
`;
}

export function generateDetailPage(params: {
    collection: string;
    singular: string;
    isSSR: boolean;
    relToLib: string;
}) {
    const { collection, singular, isSSR, relToLib } = params;
    const title = `${cap(singular)} Detail`;
    const fixturesImport = `${relToLib}/lib/fixtures.json`;
    const dbImport = `${relToLib}/lib/db`;

    if (isSSR) {
        return `import fixtures from "${fixturesImport}";
import { db } from "${dbImport}";

async function getItem(id: string) {
  if (process.env.DATABASE_URL && (db as any)?.${singular}?.findUnique) {
    try {
      // @ts-ignore — Prisma client shape when added later
      return await (db as any).${singular}.findUnique({ where: { id } });
    } catch {}
  }
  const items = ((fixtures as any)["${collection}"] || []) as any[];
  return items.find(x => String(x.id) === String(id));
}

export default async function Page({ params }: { params: { id: string } }) {
  const item = await getItem(params.id);
  if (!item) return (<main style={{ padding: 24 }}><h1>${title}</h1><p>Not found.</p></main>);
  return (
    <main style={{ padding: 24 }}>
      <h1>${title}</h1>
      <div style={{ border: '1px solid #333', borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{(item as any).title ?? (item as any).name ?? ('${cap(
            singular
        )} #' + String((item as any).id))}</div>
        <div style={{ opacity: .8 }}>{(item as any).author ?? (item as any).description ?? ''}</div>
        <pre style={{ marginTop: 12, background: '#111', padding: 12, borderRadius: 8 }}>
{JSON.stringify(item, null, 2)}
        </pre>
      </div>
    </main>
  );
}
`;
    }

    // SSG
    return `import fixtures from "${fixturesImport}";
const data = ((fixtures as any)["${collection}"] || []) as any[];

export function generateStaticParams() {
  return data.map((x: any) => ({ id: String(x.id) }));
}

export default function Page({ params }: { params: { id: string } }) {
  const item = data.find((x: any) => String(x.id) === String(params.id));
  if (!item) return (<main style={{ padding: 24 }}><h1>${title}</h1><p>Not found.</p></main>);
  return (
    <main style={{ padding: 24 }}>
      <h1>${title}</h1>
      <div style={{ border: '1px solid #333', borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{(item as any).title ?? (item as any).name ?? ('${cap(
            singular
        )} #' + String((item as any).id))}</div>
        <div style={{ opacity: .8 }}>{(item as any).author ?? (item as any).description ?? ''}</div>
        <pre style={{ marginTop: 12, background: '#111', padding: 12, borderRadius: 8 }}>
{JSON.stringify(item, null, 2)}
        </pre>
      </div>
    </main>
  );
}
`;
}
