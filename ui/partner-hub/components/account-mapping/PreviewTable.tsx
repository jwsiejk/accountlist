"use client";

const PreviewTable = ({
  headers,
  rows,
}: {
  headers: string[];
  rows: Record<string, string>[];
}) => (
  <div className="max-h-64 overflow-auto rounded-lg border border-foreground/10">
    <table className="min-w-full divide-y divide-foreground/10 text-xs">
      <thead className="sticky top-0 bg-background">
        <tr>
          {headers.map((header) => (
            <th
              key={header}
              className="whitespace-nowrap px-3 py-2 text-left font-semibold text-foreground/70"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-foreground/10">
        {rows.map((row, index) => (
          <tr key={index}>
            {headers.map((header) => (
              <td key={header} className="whitespace-nowrap px-3 py-2 text-foreground/70">
                {row[header] ?? ""}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export { PreviewTable };
