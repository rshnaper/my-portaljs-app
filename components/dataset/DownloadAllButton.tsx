import { useRef, useState } from "react";
import JSZip from "jszip";
import { ArrowDownTrayIcon, ChevronDownIcon } from "@heroicons/react/20/solid";

interface ResourceForDownload {
  id: string;
  name: string;
  url: string;
  format: string;
  description?: string;
  size?: number | string;
  created?: string;
  metadata_modified?: string;
}

interface DownloadAllButtonProps {
  resources: ResourceForDownload[];
  datasetName: string;
}

type Status = "idle" | "downloading" | "done" | "error";

/* Sanitise a string into a safe filename segment */
function safeName(s: string) {
  return s.replace(/[^a-z0-9_\-. ]/gi, "_").trim().replace(/\s+/g, "_");
}

/* Derive a filename for a resource inside the ZIP */
function resourceFilename(resource: ResourceForDownload, index: number) {
  const base = safeName(resource.name || `resource_${index + 1}`);
  const ext = resource.format ? `.${resource.format.toLowerCase()}` : "";
  return `${base}${ext}`;
}

/* Build a CSV manifest from the resource list */
function buildManifestCsv(resources: ResourceForDownload[], datasetName: string) {
  const header = ["name", "format", "url", "description", "size", "created", "modified"];
  const rows = resources.map((r) => [
    r.name ?? "",
    r.format ?? "",
    r.url ?? "",
    (r.description ?? "").replace(/"/g, '""'),
    r.size ?? "",
    r.created ?? "",
    r.metadata_modified ?? "",
  ]);
  const csvLines = [header, ...rows].map((row) =>
    row.map((cell) => `"${cell}"`).join(",")
  );
  return csvLines.join("\n");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function DownloadAllButton({
  resources,
  datasetName,
}: DownloadAllButtonProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const menuRef = useRef<HTMLDivElement>(null);
  const downloadable = resources.filter((r) => r.url);

  /* ── close on outside click ── */
  const handleToggle = () => setOpen((o) => !o);
  const handleBlur = (e: React.FocusEvent) => {
    if (!menuRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
  };

  /* ── manifest download ── */
  const handleManifest = () => {
    const csv = buildManifestCsv(downloadable, datasetName);
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `${safeName(datasetName)}_manifest.csv`
    );
    setOpen(false);
  };

  /* ── zip download ── */
  const handleZip = async () => {
    setOpen(false);
    setStatus("downloading");
    setProgress({ done: 0, total: downloadable.length, current: "" });

    const zip = new JSZip();
    const usedNames = new Map<string, number>();

    try {
      for (let i = 0; i < downloadable.length; i++) {
        const resource = downloadable[i];
        let filename = resourceFilename(resource, i);

        // Deduplicate filenames within the ZIP
        if (usedNames.has(filename)) {
          const count = usedNames.get(filename)! + 1;
          usedNames.set(filename, count);
          const dot = filename.lastIndexOf(".");
          filename =
            dot >= 0
              ? `${filename.slice(0, dot)}_${count}${filename.slice(dot)}`
              : `${filename}_${count}`;
        } else {
          usedNames.set(filename, 1);
        }

        setProgress({ done: i, total: downloadable.length, current: resource.name });

        try {
          const proxyUrl = `/api/fetch-resource-data?url=${encodeURIComponent(resource.url)}`;
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buffer = await res.arrayBuffer();
          zip.file(filename, buffer);
        } catch {
          // Add a placeholder error file so the ZIP still completes
          zip.file(
            `${filename}.error.txt`,
            `Failed to download: ${resource.url}`
          );
        }
      }

      setProgress({ done: downloadable.length, total: downloadable.length, current: "Building ZIP…" });

      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      downloadBlob(blob, `${safeName(datasetName)}.zip`);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  if (downloadable.length === 0) return null;

  const isDownloading = status === "downloading";

  return (
    <div className="relative inline-block" ref={menuRef} onBlur={handleBlur}>
      {/* Main button */}
      <div className="flex">
        <button
          type="button"
          disabled={isDownloading}
          onClick={handleToggle}
          aria-haspopup="menu"
          aria-expanded={open}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-white hover:bg-darkaccent disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006b65]"
        >
          <ArrowDownTrayIcon className="w-4 h-4" aria-hidden="true" />
          {isDownloading
            ? `Downloading… (${progress.done}/${progress.total})`
            : status === "done"
            ? "Downloaded!"
            : status === "error"
            ? "Download failed"
            : "Download All"}
          {!isDownloading && (
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          )}
        </button>
      </div>

      {/* Progress bar */}
      {isDownloading && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[220px]">
          <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-xs">
            <p className="text-gray-600 mb-1.5 truncate">
              {progress.current || "Preparing…"}
            </p>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-accent h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round((progress.done / progress.total) * 100)}%`,
                }}
              />
            </div>
            <p className="text-gray-400 mt-1">
              {progress.done} of {progress.total} files
            </p>
          </div>
        </div>
      )}

      {/* Dropdown menu */}
      {open && !isDownloading && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 z-50 w-52 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleZip}
            className="w-full flex items-start gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#006b65] focus-visible:outline-offset-[-2px]"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold block">Download as ZIP</span>
              <span className="text-xs text-gray-400">
                All {downloadable.length} files bundled
              </span>
            </span>
          </button>

          <div className="border-t border-gray-100" />

          <button
            type="button"
            role="menuitem"
            onClick={handleManifest}
            className="w-full flex items-start gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#006b65] focus-visible:outline-offset-[-2px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            <span>
              <span className="font-semibold block">Download Manifest</span>
              <span className="text-xs text-gray-400">CSV with all resource URLs</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
