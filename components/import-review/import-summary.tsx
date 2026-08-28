import type { ImportPlanReport } from "@/types/import-plan";

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${units[unit]}`;
}

export function ImportSummary({ report }: { report: ImportPlanReport }) {
  const cards = [
    ["Arquivos encontrados", report.summary.files_found],
    ["Serão importados", report.summary.files_to_import],
    ["Exact ignoradas", report.summary.exact_duplicates_skipped],
    ["Likely ignoradas", report.summary.likely_duplicates_skipped],
    ["Possible preservadas", report.summary.possible_duplicates_preserved],
    ["Needs review", report.summary.metadata_review_preserved],
    ["Upload estimado", formatBytes(report.summary.estimated_upload_bytes)],
  ];

  return (
    <section>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/[0.08] bg-[#1c1c1f] p-4 shadow-sm">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-zinc-100">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Relatório: <span className="text-zinc-300">{report.report_name}</span>
        {report.generated_at && <> · Gerado em {new Date(report.generated_at).toLocaleString("pt-BR")}</>}
      </p>
    </section>
  );
}
