import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Papa from "papaparse";

const FlatUiTable = dynamic(
  () => import("@portaljs/components").then((mod) => mod.FlatUiTable),
  { ssr: false }
);

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CsvPreview({ resourceUrl }: { resourceUrl: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resourceUrl) return;

    const proxyUrl = `/api/fetch-resource-data?url=${encodeURIComponent(resourceUrl)}`;

    fetch(proxyUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
        return res.text();
      })
      .then((csvText) => {
        const result = Papa.parse<Record<string, unknown>>(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transform: (v) => v.trim(),
        });

        if (result.errors.length && result.data.length === 0) {
          throw new Error("CSV parsing failed: " + result.errors[0]?.message);
        }

        setRows(result.data);
      })
      .catch((err) => setError(err.message));
  }, [resourceUrl]);

  const handleDownloadCsv = () => {
    if (!rows) return;
    downloadBlob(Papa.unparse(rows), "data.csv", "text/csv;charset=utf-8;");
  };

  const handleDownloadJson = () => {
    if (!rows) return;
    downloadBlob(JSON.stringify(rows, null, 2), "data.json", "application/json");
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-red-500 text-sm">
        Failed to load preview: {error}
      </div>
    );
  }

  if (!rows) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm animate-pulse">
        Loading preview…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No data found in this file.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Download toolbar */}
      <div className="flex items-center justify-between gap-3 mb-2 py-2 border-b border-gray-100">
        <span className="text-sm text-gray-500">
          {rows.length.toLocaleString()} rows · {Object.keys(rows[0] ?? {}).length} columns
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download CSV
          </button>
          <button
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download JSON
          </button>
        </div>
      </div>

      {/* Data table — extra height so flat-ui's own toolbar is visible too */}
      <div style={{ height: "560px" }}>
        <FlatUiTable data={rows} />
      </div>
    </div>
  );
}
