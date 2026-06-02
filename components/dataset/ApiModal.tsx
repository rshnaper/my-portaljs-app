import { useEffect, useRef, useState } from "react";
import { Dialog } from "@headlessui/react";
import { XMarkIcon, ClipboardIcon, CheckIcon } from "@heroicons/react/20/solid";

/* ─── types ─────────────────────────────────────────────────────────────── */

interface ApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  ckanUrl: string;
  resourceId: string;
  datasetName: string;
  resourceUrl: string;
  hasDataStore: boolean;
}

type Language = "curl" | "python" | "javascript" | "r";
type Section = "resource" | "dataset" | "datastore" | "download";

const LANGUAGES: { id: Language; label: string }[] = [
  { id: "curl", label: "cURL" },
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "r", label: "R" },
];

/* ─── code generators ────────────────────────────────────────────────────── */

function resourceShowCode(lang: Language, base: string, id: string): string {
  const url = `${base}/api/3/action/resource_show?id=${id}`;
  switch (lang) {
    case "curl":
      return `curl "${url}"`;
    case "python":
      return `import requests\n\nurl = "${url}"\nresponse = requests.get(url)\ndata = response.json()\nprint(data["result"])`;
    case "javascript":
      return `const response = await fetch("${url}");\nconst data = await response.json();\nconsole.log(data.result);`;
    case "r":
      return `library(httr)\nlibrary(jsonlite)\n\nurl <- "${url}"\nresponse <- GET(url)\ndata <- fromJSON(content(response, "text"))\nprint(data$result)`;
  }
}

function packageShowCode(lang: Language, base: string, name: string): string {
  const url = `${base}/api/3/action/package_show?id=${name}`;
  switch (lang) {
    case "curl":
      return `curl "${url}"`;
    case "python":
      return `import requests\n\nurl = "${url}"\nresponse = requests.get(url)\ndata = response.json()\nprint(data["result"])`;
    case "javascript":
      return `const response = await fetch("${url}");\nconst data = await response.json();\nconsole.log(data.result);`;
    case "r":
      return `library(httr)\nlibrary(jsonlite)\n\nurl <- "${url}"\nresponse <- GET(url)\ndata <- fromJSON(content(response, "text"))\nprint(data$result)`;
  }
}

function datastoreSearchCode(lang: Language, base: string, id: string): string {
  const url = `${base}/api/3/action/datastore_search`;
  switch (lang) {
    case "curl":
      return `curl -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"resource_id": "${id}", "limit": 100}'`;
    case "python":
      return `import requests\n\nurl = "${url}"\npayload = {\n    "resource_id": "${id}",\n    "limit": 100,\n    # "filters": {"column": "value"},  # optional\n    # "q": "search term",              # optional full-text search\n}\nresponse = requests.post(url, json=payload)\ndata = response.json()\nrecords = data["result"]["records"]\nprint(f"Total records: {data['result']['total']}")\nprint(records[:3])`;
    case "javascript":
      return `const response = await fetch("${url}", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({\n    resource_id: "${id}",\n    limit: 100,\n    // filters: { column: "value" }, // optional\n    // q: "search term",            // optional full-text search\n  }),\n});\nconst data = await response.json();\nconst { records, total } = data.result;\nconsole.log(\`Total records: \${total}\`);\nconsole.log(records.slice(0, 3));`;
    case "r":
      return `library(httr)\nlibrary(jsonlite)\n\nurl <- "${url}"\nbody <- list(\n  resource_id = "${id}",\n  limit = 100\n  # filters = list(column = "value")  # optional\n)\nresponse <- POST(url, body = toJSON(body, auto_unbox = TRUE),\n                 content_type_json())\ndata <- fromJSON(content(response, "text"))\nrecords <- data$result$records\ncat("Total records:", data$result$total, "\\n")\nprint(head(records, 3))`;
  }
}

function downloadCode(lang: Language, resourceUrl: string): string {
  switch (lang) {
    case "curl":
      return `curl -L -o data.csv "${resourceUrl}"`;
    case "python":
      return `import requests\n\nurl = "${resourceUrl}"\nresponse = requests.get(url)\nwith open("data.csv", "wb") as f:\n    f.write(response.content)\nprint("Downloaded to data.csv")`;
    case "javascript":
      return `// In Node.js\nconst fs = require("fs");\nconst https = require("https");\n\nconst file = fs.createWriteStream("data.csv");\nhttps.get("${resourceUrl}", (response) => {\n  response.pipe(file);\n  file.on("finish", () => file.close());\n});`;
    case "r":
      return `url <- "${resourceUrl}"\ndownload.file(url, destfile = "data.csv", mode = "wb")\ndf <- read.csv("data.csv")\nhead(df)`;
  }
}

/* ─── CopyButton ─────────────────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied!" : "Copy to clipboard"}
      className="absolute top-2.5 right-2.5 p-1.5 rounded bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
    >
      {copied ? (
        <CheckIcon className="w-4 h-4 text-green-400" aria-hidden="true" />
      ) : (
        <ClipboardIcon className="w-4 h-4" aria-hidden="true" />
      )}
    </button>
  );
}

/* ─── CodeBlock ─────────────────────────────────────────────────────────── */

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 pr-12 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre">
        {code}
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

/* ─── SectionCard ────────────────────────────────────────────────────────── */

function SectionCard({
  title,
  description,
  endpoint,
  code,
}: {
  title: string;
  description: string;
  endpoint?: string;
  code: string;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        {endpoint && (
          <code className="text-xs text-[#006b65] font-mono mt-1 block">
            {endpoint}
          </code>
        )}
      </div>
      <div className="p-4">
        <CodeBlock code={code} />
      </div>
    </div>
  );
}

/* ─── ApiModal ───────────────────────────────────────────────────────────── */

export default function ApiModal({
  isOpen,
  onClose,
  ckanUrl,
  resourceId,
  datasetName,
  resourceUrl,
  hasDataStore,
}: ApiModalProps) {
  const [lang, setLang] = useState<Language>("curl");

  // Trim trailing slash from base URL
  const base = ckanUrl.replace(/\/$/, "");

  const sections: { id: Section; label: string }[] = [
    { id: "resource", label: "Resource" },
    { id: "dataset", label: "Dataset" },
    ...(hasDataStore ? [{ id: "datastore" as Section, label: "DataStore" }] : []),
    { id: "download", label: "Direct Download" },
  ];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />

      {/* Panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div>
              <Dialog.Title className="text-base font-bold text-gray-900">
                API Access
              </Dialog.Title>
              <p className="text-xs text-gray-500 mt-0.5">
                CKAN base URL:{" "}
                <code className="font-mono text-[#006b65]">{base}</code>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close API panel"
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#006b65]"
            >
              <XMarkIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Language tabs */}
          <div
            className="flex gap-1 px-6 pt-4 pb-3 border-b border-gray-100 flex-shrink-0"
            role="tablist"
            aria-label="Programming language"
          >
            {LANGUAGES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={lang === id}
                onClick={() => setLang(id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#006b65] ${
                  lang === id
                    ? "bg-[#006b65] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            <SectionCard
              title="Get resource metadata"
              description="Fetch the resource's metadata including name, format, URL, and description."
              endpoint={`GET /api/3/action/resource_show?id=${resourceId}`}
              code={resourceShowCode(lang, base, resourceId)}
            />

            <SectionCard
              title="Get dataset metadata"
              description="Fetch the full dataset record including all resources and metadata fields."
              endpoint={`GET /api/3/action/package_show?id=${datasetName}`}
              code={packageShowCode(lang, base, datasetName)}
            />

            {hasDataStore && (
              <SectionCard
                title="Query via DataStore"
                description="Search, filter, and paginate the tabular data using the CKAN DataStore API."
                endpoint={`POST /api/3/action/datastore_search`}
                code={datastoreSearchCode(lang, base, resourceId)}
              />
            )}

            <SectionCard
              title="Direct download"
              description="Download the raw file directly from its source URL."
              code={downloadCode(lang, resourceUrl)}
            />

            {/* Reference links */}
            <div className="text-xs text-gray-500 pt-1 pb-2">
              <span className="font-semibold">Docs: </span>
              <a
                href="https://docs.ckan.org/en/latest/api/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#006b65] hover:underline"
              >
                CKAN API reference
              </a>
              {hasDataStore && (
                <>
                  {" · "}
                  <a
                    href="https://docs.ckan.org/en/latest/maintaining/datastore.html#ckan.logic.action.datastore_search"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#006b65] hover:underline"
                  >
                    DataStore search reference
                  </a>
                </>
              )}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
