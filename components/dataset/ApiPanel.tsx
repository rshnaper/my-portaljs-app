import { useState } from "react";
import { ClipboardIcon, CheckIcon } from "@heroicons/react/20/solid";

export interface ApiPanelProps {
  ckanUrl: string;
  resourceId: string;
  datasetName: string;
  resourceUrl: string;
  hasDataStore: boolean;
}

type Language = "curl" | "python" | "javascript" | "r";
type DcatFormat = "jsonld" | "ttl" | "rdf";

const LANGUAGES: { id: Language; label: string }[] = [
  { id: "curl", label: "cURL" },
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "r", label: "R" },
];

const DCAT_FORMATS: { id: DcatFormat; label: string; mime: string }[] = [
  { id: "jsonld", label: "JSON-LD", mime: "application/ld+json" },
  { id: "ttl",    label: "Turtle",  mime: "text/turtle" },
  { id: "rdf",    label: "RDF/XML", mime: "application/rdf+xml" },
];

/* ─── code generators ────────────────────────────────────────────────────── */

function datasetDcatCode(lang: Language, base: string, dataset: string, fmt: DcatFormat): string {
  const url = `${base}/dataset/${dataset}.${fmt}`;
  const mime = DCAT_FORMATS.find(f => f.id === fmt)!.mime;
  switch (lang) {
    case "curl":
      return `curl -H "Accept: ${mime}" "${url}"`;
    case "python":
      if (fmt === "jsonld") return (
`import requests, json

url = "${url}"
doc = requests.get(url, headers={"Accept": "${mime}"}).json()

# doc is a JSON-LD graph — the dataset node is the root
print("Title:", doc.get("dct:title") or doc.get("title"))
distributions = doc.get("dcat:distribution", [])
print(f"{len(distributions)} distribution(s)")
for d in distributions:
    print(" -", d.get("dcat:downloadURL"), d.get("dct:format"))`
      );
      return (
`import requests
from rdflib import Graph

url = "${url}"
g = Graph()
g.parse(data=requests.get(url, headers={"Accept": "${mime}"}).text, format="${fmt === "ttl" ? "turtle" : "xml"}")

# Query all distributions
DCAT = "http://www.w3.org/ns/dcat#"
DCT  = "http://purl.org/dc/terms/"
for dist in g.subjects(predicate=g.namespace_manager.curie("rdf:type"),
                         object=g.namespace_manager.curie("dcat:Distribution")):
    print(dist, g.value(dist, g.URIRef(DCAT + "downloadURL")))`
      );
    case "javascript":
      if (fmt === "jsonld") return (
`const response = await fetch("${url}", {
  headers: { Accept: "${mime}" },
});
const doc = await response.json();

// JSON-LD — dataset fields use DCAT / DCT prefixes or compact IRIs
console.log("Title:", doc["dct:title"] ?? doc.title);
const distributions = doc["dcat:distribution"] ?? [];
distributions.forEach(d => {
  console.log(" -", d["dcat:downloadURL"], d["dct:format"]);
});`
      );
      return (
`const response = await fetch("${url}", {
  headers: { Accept: "${mime}" },
});
const text = await response.text();
// Parse with an RDF library, e.g. N3.js (npm install n3)
import { Parser } from "n3";
const parser = new Parser({ format: "${fmt === "ttl" ? "Turtle" : "application/rdf+xml"}" });
const quads = parser.parse(text);
const distributions = quads.filter(
  q => q.predicate.value === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    && q.object.value === "http://www.w3.org/ns/dcat#Distribution"
);
console.log(\`\${distributions.length} distribution(s)\`);`
      );
    case "r":
      return (
`library(httr)
library(jsonlite)

url <- "${url}"
response <- GET(url, add_headers(Accept = "${mime}"))
${fmt === "jsonld"
  ? `doc <- fromJSON(content(response, "text", encoding = "UTF-8"))
cat("Title:", doc[["dct:title"]], "\\n")
distributions <- doc[["dcat:distribution"]]
print(distributions)`
  : `# Save locally and parse with rrdf or rdflib
content_text <- content(response, "text", encoding = "UTF-8")
tmp <- tempfile(fileext = ".${fmt}")
writeLines(content_text, tmp)
# library(rrdf)
# store <- load.rdf(tmp, format = "${fmt === "ttl" ? "TURTLE" : "RDF/XML"}")
# results <- sparql.rdf(store, "SELECT ?dist WHERE { ?dist a <http://www.w3.org/ns/dcat#Distribution> }")`
}`
      );
  }
}

function catalogCode(lang: Language, base: string): string {
  const url = `${base}/catalog.jsonld`;
  switch (lang) {
    case "curl":
      return `curl -H "Accept: application/ld+json" "${url}"`;
    case "python":
      return (
`import requests

catalog = requests.get("${url}",
    headers={"Accept": "application/ld+json"}).json()

# catalog["dcat:dataset"] or catalog["dataset"] lists all datasets
datasets = catalog.get("dcat:dataset", catalog.get("dataset", []))
print(f"{len(datasets)} dataset(s) in catalog")
for ds in datasets[:5]:
    print(" -", ds.get("dct:title") or ds.get("title"))`
      );
    case "javascript":
      return (
`const res  = await fetch("${url}", { headers: { Accept: "application/ld+json" } });
const catalog = await res.json();

const datasets = catalog["dcat:dataset"] ?? catalog.dataset ?? [];
console.log(\`\${datasets.length} dataset(s) in catalog\`);
datasets.slice(0, 5).forEach(ds =>
  console.log(" -", ds["dct:title"] ?? ds.title)
);`
      );
    case "r":
      return (
`library(httr)
library(jsonlite)

catalog <- fromJSON(
  content(GET("${url}",
              add_headers(Accept = "application/ld+json")),
          "text", encoding = "UTF-8"))

datasets <- catalog[["dcat:dataset"]] %||% catalog[["dataset"]]
cat("Datasets in catalog:", length(datasets), "\\n")
print(head(datasets[["dct:title"]], 5))`
      );
  }
}

function distributionCode(lang: Language, base: string, dataset: string, resourceId: string): string {
  const url = `${base}/dataset/${dataset}.jsonld`;
  switch (lang) {
    case "curl":
      return (
`# Fetch the dataset DCAT document
curl -H "Accept: application/ld+json" "${url}" | \\
  python3 -c "
import sys, json
doc = json.load(sys.stdin)
for d in doc.get('dcat:distribution', []):
    if d.get('dct:identifier') == '${resourceId}':
        print(json.dumps(d, indent=2))
        break
"`
      );
    case "python":
      return (
`import requests

doc = requests.get("${url}",
    headers={"Accept": "application/ld+json"}).json()

# Find this distribution by dct:identifier
distribution = next(
    (d for d in doc.get("dcat:distribution", [])
     if d.get("dct:identifier") == "${resourceId}"),
    None
)
if distribution:
    print("Format:      ", distribution.get("dct:format"))
    print("Download URL:", distribution.get("dcat:downloadURL"))
    print("Byte size:   ", distribution.get("dcat:byteSize"))`
      );
    case "javascript":
      return (
`const doc = await fetch("${url}", {
  headers: { Accept: "application/ld+json" },
}).then(r => r.json());

const distribution = (doc["dcat:distribution"] ?? [])
  .find(d => d["dct:identifier"] === "${resourceId}");

if (distribution) {
  console.log("Format:      ", distribution["dct:format"]);
  console.log("Download URL:", distribution["dcat:downloadURL"]);
  console.log("Byte size:   ", distribution["dcat:byteSize"]);
}`
      );
    case "r":
      return (
`library(httr)
library(jsonlite)

doc <- fromJSON(
  content(GET("${url}",
              add_headers(Accept = "application/ld+json")),
          "text", encoding = "UTF-8"))

dists <- doc[["dcat:distribution"]]
dist  <- dists[dists[["dct:identifier"]] == "${resourceId}", ]
cat("Format:      ", dist[["dct:format"]], "\\n")
cat("Download URL:", dist[["dcat:downloadURL"]], "\\n")`
      );
  }
}

/* ─── shared UI ─────────────────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={async () => {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }}
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

/* ─── ApiPanel ───────────────────────────────────────────────────────────── */

export default function ApiPanel({
  ckanUrl, resourceId, datasetName, resourceUrl, hasDataStore,
}: ApiPanelProps) {
  const [lang, setLang] = useState<Language>("curl");
  const [fmt, setFmt] = useState<DcatFormat>("jsonld");
  const base = ckanUrl.replace(/\/$/, "");

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
        {/* DCAT format */}
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

        {/* Language */}
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
          title={`Get parent dataset (${DCAT_FORMATS.find(f => f.id === fmt)!.label})`}
          description="Retrieve the DCAT dataset document. This distribution is listed under dcat:distribution."
          endpoint={`GET /dataset/${datasetName}.${fmt}`}
          code={datasetDcatCode(lang, base, datasetName, fmt)}
        />

        <SectionCard
          title="Extract this distribution"
          description={`Fetch the dataset JSON-LD and find the distribution with dct:identifier = "${resourceId}".`}
          endpoint={`GET /dataset/${datasetName}.jsonld`}
          code={distributionCode(lang, base, datasetName, resourceId)}
        />

        <SectionCard
          title="Download distribution data"
          description="Download the raw resource file directly using its accessURL."
          code={lang === "curl"
            ? `curl -L -o data "${resourceUrl}"`
            : lang === "python"
            ? `import requests\nr = requests.get("${resourceUrl}")\nopen("data", "wb").write(r.content)`
            : lang === "javascript"
            ? `const blob = await fetch("${resourceUrl}").then(r => r.blob());\n// In browser:\nconst a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "data" });\na.click();`
            : `download.file("${resourceUrl}", "data", mode = "wb")`}
        />
      </div>

      <p className="text-xs text-gray-400 mt-6">
        <span className="font-semibold text-gray-500">Docs: </span>
        <a href="https://www.w3.org/TR/vocab-dcat/" target="_blank" rel="noopener noreferrer" className="text-[#006b65] hover:underline">DCAT W3C spec</a>
        {" · "}
        <a href="https://github.com/ckan/ckanext-dcat" target="_blank" rel="noopener noreferrer" className="text-[#006b65] hover:underline">ckanext-dcat</a>
      </p>
    </div>
  );
}
