// Neutral side-by-side comparison. Neither column is "better".

const ROWS: [string, string, string][] = [
  ["Primary abstraction", "Endpoint / function", "Protocol"],
  ["Tool discovery", "Application-defined", "Standardized MCP mechanism (tools/list)"],
  ["Invocation", "Application / API call", "MCP tool call (tools/call)"],
  ["Reusability", "Depends on the integration", "Designed for reusable tool exposure"],
  ["Can use APIs internally", "Yes", "Yes"],
  ["AI-specific protocol", "Not necessarily", "Yes"],
];

const HEADER = "px-4 py-2.5 font-mono text-[11px] font-medium tracking-[0.12em] uppercase";

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full min-w-[560px] text-left text-[14px]">
        <thead>
          <tr className="border-b border-line bg-wash">
            <th className={`${HEADER} text-muted`}>Concept</th>
            <th className={`${HEADER} text-api`}>API Integration</th>
            <th className={`${HEADER} text-mcp`}>MCP</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([concept, api, mcp]) => (
            <tr key={concept} className="border-b border-line last:border-0">
              <td className="px-4 py-2.5 font-medium">{concept}</td>
              <td className="px-4 py-2.5 text-muted">{api}</td>
              <td className="px-4 py-2.5 text-muted">{mcp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
