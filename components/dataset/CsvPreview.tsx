import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Papa from "papaparse";
import { CheckIcon } from "@heroicons/react/20/solid";
import type { DictionaryField } from "./DataDictionary";

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

function ColumnPanel({
  columns,
  visible,
  dictionary,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onClose,
}: {
  columns: string[];
  visible: Set<string>;
  dictionary: DictionaryField[];
  onToggle: (col: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const labelMap = Object.fromEntries(
    dictionary.map((f) => [f.id, f.info?.label ?? ""])
  );
  const filtered = columns.filter(
    (c) =>
      c.toLowerCase().includes(search.toLowerCase()) ||
      labelMap[c]?.toLowerCase().includes(search.toLowerCase())
  );
  const allVisible = columns.every((c) => visible.has(c));
  const noneVisible = columns.every((c) => !visible.has(c));

  return (
    <div
      role="dialog"
      aria-label="Column visibility"
      className="absolute right-0 top-full mt-1 z-50 w-72 bg-white rounded-lg border border-gray-200 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Columns ({visible.size}/{columns.length} shown)
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close column panel"
          className="text-gray-400 hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#006b65] rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100">
        <input
          type="search"
          placeholder="Search columns…"
          aria-label="Search columns"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs rounded border border-gray-200 px-2 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006b65]"
        />
      </div>

      {/* Select / Deselect all */}
      <div className="flex gap-2 px-3 py-2 border-b border-gray-100">
        <button
          type="button"
          onClick={onSelectAll}
          disabled={allVisible}
          className="text-xs text-[#006b65] hover:underline disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#006b65] rounded"
        >
          Select all
        </button>
        <span className="text-gray-300" aria-hidden="true">|</span>
        <button
          type="button"
          onClick={onDeselectAll}
          disabled={noneVisible}
          className="text-xs text-[#006b65] hover:underline disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#006b65] rounded"
        >
          Deselect all
        </button>
      </div>

      {/* Column list */}
      <ul
        role="list"
        className="max-h-64 overflow-y-auto py-1"
        aria-label="Column list"
      >
        {filtered.length === 0 && (
          <li className="px-3 py-2 text-xs text-gray-400 italic">No columns match</li>
        )}
        {filtered.map((col) => {
          const isVisible = visible.has(col);
          const label = labelMap[col];
          return (
            <li key={col}>
              <label className="flex items-start gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer select-none">
                {/* Custom checkbox */}
                <span className="mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isVisible}
                    onChange={() => onToggle(col)}
                    aria-label={`Show column ${label || col}`}
                  />
                  <span
                    aria-hidden="true"
                    className={`w-4 h-4 flex items-center justify-center rounded border-2 ${
                      isVisible
                        ? "bg-accent border-accent text-white"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    {isVisible && <CheckIcon className="w-3 h-3" />}
                  </span>
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="text-xs font-mono text-gray-800 truncate">{col}</span>
                  {label && (
                    <span className="text-xs text-gray-400 truncate">{label}</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function CsvPreview({
  resourceUrl,
  dictionary = [],
}: {
  resourceUrl: string;
  dictionary?: DictionaryField[];
}) {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [columnPanelOpen, setColumnPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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
        const cols = Object.keys(result.data[0] ?? {});
        setRows(result.data);
        setColumns(cols);
        setVisibleColumns(new Set(cols));
      })
      .catch((err) => setError(err.message));
  }, [resourceUrl]);

  // Close panel on outside click
  useEffect(() => {
    if (!columnPanelOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setColumnPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [columnPanelOpen]);

  // Close panel on Escape
  useEffect(() => {
    if (!columnPanelOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setColumnPanelOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [columnPanelOpen]);

  const toggleColumn = (col: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      return next;
    });
  };

  // Derive filtered rows for both the table and downloads
  const visibleRows =
    rows && visibleColumns.size < columns.length
      ? rows.map((row) =>
          Object.fromEntries(
            Object.entries(row).filter(([k]) => visibleColumns.has(k))
          )
        )
      : rows;

  const handleDownloadCsv = () => {
    if (!visibleRows) return;
    downloadBlob(
      Papa.unparse(visibleRows),
      "data.csv",
      "text/csv;charset=utf-8;"
    );
  };

  const handleDownloadJson = () => {
    if (!visibleRows) return;
    downloadBlob(
      JSON.stringify(visibleRows, null, 2),
      "data.json",
      "application/json"
    );
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

  const hiddenCount = columns.length - visibleColumns.size;

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-2 py-2 border-b border-gray-100">
        <span className="text-sm text-gray-500">
          {rows.length.toLocaleString()} rows ·{" "}
          {visibleColumns.size} of {columns.length} columns
          {hiddenCount > 0 && (
            <span className="ml-1 text-amber-600 font-medium">
              ({hiddenCount} hidden)
            </span>
          )}
        </span>

        <div className="flex items-center gap-2">
          {/* Columns toggle */}
          <div className="relative" ref={panelRef}>
            <button
              type="button"
              aria-expanded={columnPanelOpen}
              aria-haspopup="dialog"
              onClick={() => setColumnPanelOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#006b65]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              Columns
              {hiddenCount > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-100 text-amber-700 px-1.5 text-[10px] font-bold">
                  {hiddenCount}
                </span>
              )}
            </button>

            {columnPanelOpen && (
              <ColumnPanel
                columns={columns}
                visible={visibleColumns}
                dictionary={dictionary}
                onToggle={toggleColumn}
                onSelectAll={() => setVisibleColumns(new Set(columns))}
                onDeselectAll={() => setVisibleColumns(new Set())}
                onClose={() => setColumnPanelOpen(false)}
              />
            )}
          </div>

          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#006b65]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download CSV
          </button>
          <button
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#006b65]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download JSON
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ height: "560px" }}>
        <FlatUiTable data={visibleRows} />
      </div>
    </div>
  );
}
