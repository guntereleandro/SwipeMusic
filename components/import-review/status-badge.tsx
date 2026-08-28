import type { DuplicateStatus, ImportAction, ImportMetadataStatus } from "@/types/import-plan";

const styles = {
  positive: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  negative: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  warning: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  neutral: "border-white/10 bg-white/[0.06] text-zinc-300",
  info: "border-sky-400/20 bg-sky-400/10 text-sky-300",
};

function Badge({ children, tone }: { children: React.ReactNode; tone: keyof typeof styles }) {
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${styles[tone]}`}>{children}</span>;
}

export function ActionBadge({ action, duplicateStatus }: { action: ImportAction; duplicateStatus: DuplicateStatus }) {
  if (action !== "IMPORT") return <Badge tone="negative">Ignorar</Badge>;
  if (duplicateStatus === "POSSIBLE_DUPLICATE") return <Badge tone="warning">Possível — preservada</Badge>;
  return <Badge tone="positive">Importar</Badge>;
}

export function DuplicateBadge({ status }: { status: DuplicateStatus }) {
  const tone = status === "EXACT_DUPLICATE" ? "negative" : status === "LIKELY_DUPLICATE" ? "info" : status === "POSSIBLE_DUPLICATE" ? "warning" : "neutral";
  return <Badge tone={tone}>{status.replaceAll("_", " ")}</Badge>;
}

export function MetadataBadge({ status }: { status: ImportMetadataStatus }) {
  return status === "NEEDS_REVIEW"
    ? <Badge tone="warning">Revisar metadados</Badge>
    : <Badge tone={status === "GOOD" ? "positive" : "neutral"}>{status}</Badge>;
}
