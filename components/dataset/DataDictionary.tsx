export interface DictionaryField {
  id: string;
  type: string;
  info?: {
    label?: string;
    notes?: string;
    type_override?: string;
  };
}

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  numeric: "Number",
  int4: "Integer",
  int8: "Integer",
  float4: "Float",
  float8: "Float",
  bool: "Boolean",
  date: "Date",
  time: "Time",
  timestamp: "Timestamp",
  json: "JSON",
};

function TypeBadge({ type }: { type: string }) {
  const label = TYPE_LABELS[type.toLowerCase()] ?? type;
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 font-mono">
      {label}
    </span>
  );
}

export default function DataDictionary({ fields }: { fields: DictionaryField[] }) {
  if (!fields?.length) return null;

  return (
    <section aria-labelledby="data-dictionary-heading" className="mt-8">
      <h2
        id="data-dictionary-heading"
        className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
          />
        </svg>
        Data Dictionary
        <span className="text-sm font-normal text-gray-500">
          ({fields.length} {fields.length === 1 ? "field" : "fields"})
        </span>
      </h2>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-48"
              >
                Field
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-48"
              >
                Label
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
              >
                Description
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {fields.map((field, i) => (
              <tr key={field.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-4 py-3 font-mono text-sm text-gray-900 align-top break-all">
                  {field.id}
                </td>
                <td className="px-4 py-3 align-top">
                  <TypeBadge type={field.type} />
                </td>
                <td className="px-4 py-3 text-gray-700 align-top">
                  {field.info?.label || (
                    <span className="text-gray-400 italic">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 align-top leading-relaxed">
                  {field.info?.notes || (
                    <span className="text-gray-400 italic">No description</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
