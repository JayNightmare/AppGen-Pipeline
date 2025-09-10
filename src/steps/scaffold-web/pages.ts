/**
 * Page generators: list and detail stubs for SSG/SSR.
 * Inputs: spec + isSSR. Outputs: page source strings.
 */
import { AppSpec } from "../../types/appspec.js";

export function generateListPage(entityName: string, isSSR: boolean) {
    const fetcher = isSSR
        ? "async function getData() { return []; }"
        : 'export const dynamic = "error"; export const revalidate = 0; const data: any[] = [];';
    return `export default async function Page(){ ${
        isSSR ? "const data = await getData();" : ""
    } return (<div><h1>${entityName} List</h1><ul>{${
        isSSR ? "data" : "data"
    }.map((i:any)=> <li key={i.id}>{i.id}</li>)}</ul></div>); }\n${
        isSSR ? fetcher : ""
    }`;
}

export function generateDetailPage(entityName: string, isSSR: boolean) {
    if (isSSR) {
        return `export default async function Page({ params }: { params: { id: string } }){ return (<div><h1>${entityName} Detail</h1><p>ID: {params.id}</p></div>); }`;
    }
    return `export default function Page(){ return (<div><h1>${entityName} Detail</h1><p>Static detail page</p></div>); }`;
}
