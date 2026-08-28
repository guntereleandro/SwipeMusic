import { ActionBadge, MetadataBadge } from "@/components/import-review/status-badge";
import { getDuplicateGroupView } from "@/lib/import-plan/filter-import-plan";
import type { ImportDecision, ImportPlanDuplicateGroup } from "@/types/import-plan";

function formatBytes(bytes?: number) {
  if (!bytes) return null;
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

export function DuplicateGroupDetails({
  group,
  decisions,
}: {
  group: ImportPlanDuplicateGroup;
  decisions: ImportDecision[];
}) {
  const { members, representative } = getDuplicateGroupView(decisions, group.duplicate_group);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-zinc-100">Grupo {group.duplicate_group} · {group.duplicate_status}</p>
          {group.hash && <p className="mt-1 break-all font-mono text-[10px] text-zinc-600">SHA-256: {group.hash}</p>}
        </div>
        {group.wasted_bytes ? <span className="text-xs text-zinc-400">Economia: {formatBytes(group.wasted_bytes)}</span> : null}
      </div>

      <div className="mt-3 space-y-2">
        {members.map((member) => (
          <div key={member.relative_path} className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <ActionBadge action={member.action} duplicateStatus={member.duplicate_status} />
              <MetadataBadge status={member.metadata_status} />
              {member.relative_path === representative?.relative_path && <span className="text-xs font-semibold text-emerald-300">Representante</span>}
            </div>
            <p className="mt-2 text-sm font-semibold text-zinc-200">{member.resolved_title ?? member.original_filename}</p>
            <p className="mt-1 break-all text-xs text-zinc-500">{member.relative_path}</p>
            <p className="mt-1 text-xs text-zinc-400">{member.bitrate ? `${Math.round(member.bitrate / 1000)} kbps` : "bitrate desconhecido"} · capa: {member.has_cover ? "sim" : "não"}</p>
          </div>
        ))}
      </div>

      {representative?.representative_reason.length ? (
        <div className="mt-4 border-t border-white/[0.07] pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Motivo da escolha</p>
          <ul className="mt-2 space-y-1 text-xs text-zinc-500">
            {representative.representative_reason.map((reason) => <li key={reason}>• {reason}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
