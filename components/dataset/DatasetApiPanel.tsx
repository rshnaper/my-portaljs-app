import { useState } from "react";
import { ClipboardIcon, CheckIcon } from "@heroicons/react/20/solid";

export interface DatasetApiPanelProps {
  ckanUrl: string;
  datasetName: string;
  orgName: string;
}

type Language = "curl" | "python" | "javascript" | "r";
type DcatFormat = "jsonld" | "ttl" | "rdf";

const LANGUAGES: { id: Language; label: string }[] = [
  { id: "curl",       label: "cURL"       },
  { id: "python",     label: "Python"     },
  { id: "javascript", label: "JavaScript" },
  { id: "r",          label: "R"          },
];

const DCAT_FORMATS: { id: DcatFormat; label: string; mime: string }[] = [
  { id: "jsonld", label: "JSON-LD", mime: "application/ld+json"  },
  { id: "ttl",    label: "Turtle",  mime: "text/turtle"          },
  { id: "rdf",    label: "RDF/XML", mime: "application/rdf+xml"  },
];

/* ─── code generators ────────────────────────────────────────────────────── */

function datasetCode(lang: Language, base: string, name: string, fmt: DcatFormat): string {
  const url  = `${base}/dataset/${name}.${fmt}`;
  const mime = DCAT_FORMATS.find(f => f.id === fmt)!.mime;

  switch (lang) {
    case "curl":
      return `curl -H "Accept: ${mime}" "${url}"`;

    case "python":
      if (fmt === "jsonld") return (
`import requests, json

url = "${url}"
doc = requests.get(url, headers={"Accept": "${mime}"}).json()

print("Title:      ", doc.get("dct:title") or doc.get("title"))
print("Description:", (doc.get("dct:description") or "")[:120])
print("Publisher:  ", doc.get("dct:publisher", {}).get("foaf:name", ""))

distributions = doc.get("dcat:distribution", [])
print(f"\\n{len(distributions)} distribution(s):")
for d in distributions:
    print(f"  • {d.get('dct:title') or d.get('dct:identifier')} "
          f"[{d.get('dct:format', '?')}] "
          f"{d.get('dcat:downloadURL', '')}")`
      );
      return (
`import requests
from rdflib import Graph, Namespace

DCAT = Namespace("http://www.w3.org/ns/dcat#")
DCT  = Namespace("http://purl.org/dc/terms/")

g = Graph()
g.parse(data=requests.get(
    "${url}", headers={"Accept": "${mime}"}).text,
    format="${fmt === "ttl" ? "turtle" : "xml"}")

# Find the dataset node
for ds in g.subjects(predicate=g.namespace_manager.curie("rdf:type"),
                       object=DCAT.Dataset):
    print("Title:", g.value(ds, DCT.title))
    for dist in g.objects(ds, DCAT.distribution):
        print("  Distribution:", g.value(dist, DCAT.downloadURL))`
      );

    case "javascript":
      if (fmt === "jsonld") return (
`const response = await fetch("${url}", {
  headers: { Accept: "${mime}" },
});
const doc = await response.json();

console.log("Title:      ", doc["dct:title"] ?? doc.title);
console.log("Description:", (doc["dct:description"] ?? "").slice(0, 120));

const distributions = doc["dcat:distribution"] ?? [];
console.log(\`\\n\${distributions.length} distribution(s):\`);
distributions.forEach(d => {
  console.log(
    " •",
    d["dct:title"] ?? d["dct:identifier"],
    \`[\${d["dct:format"] ?? "?"}]\`,
    d["dcat:downloadURL"] ?? ""
  );
});`
      );
      return (
`// Parse with N3.js: npm install n3
import { Parser } from "n3";

const text = await fetch("${url}", {
  headers: { Accept: "${mime}" },
}).then(r => r.text());

const parser = new Parser({ format: "${fmt === "ttl" ? "Turtle" : "application/rdf+xml"}" });
const quads  = parser.parse(text);

const DCAT = "http://www.w3.org/ns/dcat#";
const dists = quads
  .filter(q => q.object.value === \`\${DCAT}Distribution\`)
  .map(q => q.subject.value);
console.log(\`\${dists.length} distribution(s)\`, dists);`
      );

    case "r":
      return (
`library(httr)
library(jsonlite)

url <- "${url}"
response <- GET(url, add_headers(Accept = "${mime}"))
${fmt === "jsonld"
  ? `doc <- fromJSON(content(response, "text", encoding = "UTF-8"))

cat("Title:      ", doc[["dct:title"]], "\\n")
cat("Description:", substr(doc[["dct:description"]] %||% "", 1, 120), "\\n")

dists <- doc[["dcat:distribution"]]
cat("\\nDistributions:", length(dists), "\\n")
print(dists[c("dct:title", "dct:format", "dcat:downloadURL")])`
  : `# Save and parse with rrdf or similar package
txt <- content(response, "text", encoding = "UTF-8")
tmp <- tempfile(fileext = ".${fmt}")
writeLines(txt, tmp)
# library(rrdf)
# store   <- load.rdf(tmp, format = "${fmt === "ttl" ? "TURTLE" : "RDF/XML"}")
# results <- sparql.rdf(store,
#   "SELECT ?title WHERE { ?s <http://purl.org/dc/terms/title> ?title }")`}`
      );
  }
}

function catalogCode(lang: Language, base: string, org: string): string {
  const url = `${base}/catalog.jsonld?q=organization:${org}`;
  switch (lang) {
    case "curl":
      return `curl -H "Accept: application/ld+json" "${url}"`;
    case "python":
      return (
`import requests

url = "${url}"
catalog = requests.get(url, headers={"Accept": "application/ld+json"}).json()

datasets = catalog.get("dcat:dataset", catalog.get("dataset", []))
print(f"{len(datasets)} dataset(s) from '${org}'")
for ds in datasets[:5]:
    title = ds.get("dct:title") or ds.get("title", "(no title)")
    print(f"  • {title}")`
      );
    case "javascript":
      return (
`const catalog = await fetch("${url}", {
  headers: { Accept: "application/ld+json" },
}).then(r => r.json());

const datasets = catalog["dcat:dataset"] ?? catalog.dataset ?? [];
console.log(\`\${datasets.length} dataset(s) from '${org}'\`);
datasets.slice(0, 5).forEach(ds =>
  console.log(" •", ds["dct:title"] ?? ds.title ?? "(no title)")
);`
      );
    case "r":
      return (
`library(httr)
library(jsonlite)

url <- "${url}"
catalog <- fromJSON(
  content(GET(url, add_headers(Accept = "application/ld+json")),
          "text", encoding = "UTF-8"))

datasets <- catalog[["dcat:dataset"]] %||% catalog[["dataset"]]
cat("Datasets from '${org}':", length(datasets), "\\n")
print(head(datasets[["dct:title"]] %||% datasets[["title"]], 5))`
      );
  }
}

function sparqlCode(lang: Language, base: string, name: string): string {
  const endpoint = `${base}/sparql`;
  const query = `PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dct:  <http://purl.org/dc/terms/>

SELECT ?title ?format ?downloadURL
WHERE {
  ?dataset a dcat:Dataset ;
           dct:identifier "${name}" ;
           dcat:distribution ?dist .
  ?dist dct:format  ?format ;
        dcat:downloadURL ?downloadURL .
  OPTIONAL { ?dist dct:title ?title }
}`;
  switch (lang) {
    case "curl":
      return `curl -G "${endpoint}" \\\n  --data-urlencode "query=${query}" \\\n  -H "Accept: application/sparql-results+json"`;
    case "python":
      return `from SPARQLWrapper import SPARQLWrapper, JSON\n\nsp = SPARQLWrapper("${endpoint}")\nsp.setQuery("""${query}""")\nsp.setReturnFormat(JSON)\nresults = sp.query().convert()\nfor r in results["results"]["bindings"]:\n    print(r.get("title", {}).get("value"), r["format"]["value"], r["downloadURL"]["value"])`;
    case "javascript":
      return `const query = \`${query}\`;\nconst url = \`${endpoint}?\${new URLSearchParams({ query })}\`;\nconst res  = await fetch(url, { headers: { Accept: "application/sparql-results+json" } });\nconst { results: { bindings } } = await res.json();\nbindings.forEach(r => console.log(r.title?.value, r.format.value, r.downloadURL.value));`;
    case "r":
      return `library(SPARQL)\n\nendpoint <- "${endpoint}"\nquery <- '${query}'\nresults <- SPARQL(endpoint, query)\nprint(results$results)`;
  }
}

/* ─── shared UI ─────────────────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button"
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      aria-label={copied ? "Copied!" : "Copy to clipboard"}
      className="absolute top-2.5 right-2.5 p-1.5 rounded bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
    >
      {copied
        ? <CheckIcon className="w-4 h-4 text-green-400" aria-hidden="true" />
        : <ClipboardIcon className="w-4 h-4" aria-hidden="true" />}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 pr-12 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre">{code}</pre>
      <CopyButton text={code} />
    </div>
  );
}

function SectionCard({ title, description, endpoint, code }: {
  title: string; description: string; endpoint?: string; code: string;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        {endpoint && <code className="text-xs text-[#006b65] font-mono mt-1 block break-all">{endpoint}</code>}
      </div>
      <div className="p-4"><CodeBlock code={code} /></div>
    </div>
  );
}

/* ─── DatasetApiPanel ────────────────────────────────────────────────────── */

export default function DatasetApiPanel({
  ckanUrl, datasetName, orgName,
}: DatasetApiPanelProps) {
  const [lang, setLang] = useState<Language>("curl");
  const [fmt, setFmt]   = useState<DcatFormat>("jsonld");
  const base = ckanUrl.replace(/\/$/, "");
  const fmtLabel = DCAT_FORMATS.find(f => f.id === fmt)!.label;

  return (
    <div className="py-4">
      {/* DCAT badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          DCAT-AP
        </span>
        <span className="text-xs text-gray-400">W3C Data Catalog Vocabulary</span>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Base URL: <code className="font-mono text-[#006b65] text-xs">{base}</code>
      </p>

      {/* Selectors row */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Format</p>
          <div className="flex gap-1" role="tablist" aria-label="DCAT serialisation format">
            {DCAT_FORMATS.map(({ id, label }) => (
              <button key={id} type="button" role="tab" aria-selected={fmt === id}
                onClick={() => setFmt(id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#006b65] ${fmt === id ? "bg-[#006b65] text-white border-[#006b65]" : "text-gray-600 hover:bg-gray-100 border-gray-200"}`}
              >{label}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Language</p>
          <div className="flex gap-1" role="tablist" aria-label="Programming language">
            {LANGUAGES.map(({ id, label }) => (
              <button key={id} type="button" role="tab" aria-selected={lang === id}
                onClick={() => setLang(id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#006b65] ${lang === id ? "bg-gray-800 text-white border-gray-800" : "text-gray-600 hover:bg-gray-100 border-gray-200"}`}
              >{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <SectionCard
          title={`Get dataset (${fmtLabel})`}
          description={`Fetch this dataset as a DCAT ${fmtLabel} document. Includes title, description, publisher, keywords, and all distributions.`}
          endpoint={`GET /dataset/${datasetName}.${fmt}`}
          code={datasetCode(lang, base, datasetName, fmt)}
        />

        <SectionCard
          title="Browse catalog (JSON-LD)"
          description={`Retrieve all datasets published by organisation "${orgName}" from the DCAT catalog endpoint.`}
          endpoint={`GET /catalog.jsonld?q=organization:${orgName}`}
          code={catalogCode(lang, base, orgName)}
        />

        <SectionCard
          title="Query via SPARQL"
          description="If the SPARQL endpoint is enabled, query distributions directly using SPARQL 1.1."
          endpoint={`GET /sparql`}
          code={sparqlCode(lang, base, datasetName)}
        />
      </div>

      <p className="text-xs text-gray-400 mt-6">
        <span className="font-semibold text-gray-500">Docs: </span>
        <a href="https://www.w3.org/TR/vocab-dcat/" target="_blank" rel="noopener noreferrer" className="text-[#006b65] hover:underline">DCAT W3C spec</a>
        {" · "}
        <a href="https://joinup.ec.europa.eu/collection/semantic-interoperability-community-semic/solution/dcat-application-profile-data-portals-europe" target="_blank" rel="noopener noreferrer" className="text-[#006b65] hover:underline">DCAT-AP</a>
        {" · "}
        <a href="https://github.com/ckan/ckanext-dcat" target="_blank" rel="noopener noreferrer" className="text-[#006b65] hover:underline">ckanext-dcat</a>
      </p>
    </div>
  );
}
