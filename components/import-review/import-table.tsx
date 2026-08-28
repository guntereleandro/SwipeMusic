import { Fragment, useState } from "react";
import { DuplicateGroupDetails } from "@/components/import-review/duplicate-group-details";
import { ActionBadge, DuplicateBadge, MetadataBadge } from "@/components/import-review/status-badge";
import type { ImportDecision, ImportPlanDuplicateGroup } from "@/types/import-plan";

function duration(seconds: number | null) {
  if (seconds === null) return "—";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function reasonLabel(decision: ImportDecision) {
  if (decision.reason === "likely_duplicate_representative") return "Melhor representante";
  if (decision.reason === "exact_duplicate_representative") return "Representante do hash";
  if (decision.reason === "exact_duplicate") return "Hash idêntico";
  if (decision.reason === "likely_duplicate") return "Representante inferior";
  if (decision.duplicate_status === "POSSIBLE_DUPLICATE") return "Preservada por segurança";
  return "Importação normal";
}

export function ImportTable({ decisions, allDecisions, groups }: { decisions: ImportDecision[]; allDecisions: ImportDecision[]; groups: ImportPlanDuplicateGroup[] }) {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const groupById = new Map(groups.map((group) => [group.duplicate_group, group]));

  const toggleGroup = (group: number | null) => {
    if (group === null) return;
    setExpandedGroup((current) => current === group ? null : group);
  };

  return (
    <>
      <div className="mt-4 hidden overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1c1c1f] md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-white/[0.025] text-zinc-500">
              <tr><th className="p-3">Ação</th><th className="p-3">Música</th><th className="p-3">Artista / álbum</th><th className="p-3">Duplicidade</th><th className="p-3">Metadados</th><th className="p-3">Duração</th><th className="p-3">Bitrate</th><th className="p-3">Capa</th><th className="p-3">Pasta/origem</th><th className="p-3">Grupo</th><th className="p-3">Motivo</th></tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {decisions.map((decision) => {
                const group = decision.duplicate_group !== null ? groupById.get(decision.duplicate_group) : undefined;
                return (
                  <Fragment key={decision.relative_path}>
                    <tr className="align-top transition hover:bg-white/[0.025]">
                      <td className="p-3"><ActionBadge action={decision.action} duplicateStatus={decision.duplicate_status} /></td>
                      <td className="max-w-52 p-3"><p className="truncate font-semibold text-zinc-200">{decision.resolved_title ?? decision.original_filename}</p><p className="mt-1 truncate text-zinc-600">{decision.original_filename}</p></td>
                      <td className="max-w-44 p-3 text-zinc-400"><p className="truncate">{decision.resolved_artist ?? "Artista não resolvido"}</p><p className="mt-1 truncate text-zinc-600">{decision.resolved_album ?? "—"}</p></td>
                      <td className="p-3"><DuplicateBadge status={decision.duplicate_status} /></td>
                      <td className="p-3"><MetadataBadge status={decision.metadata_status} /></td>
                      <td className="p-3 tabular-nums text-zinc-400">{duration(decision.duration_seconds)}</td>
                      <td className="p-3 tabular-nums text-zinc-400">{decision.bitrate ? `${Math.round(decision.bitrate / 1000)} kbps` : "—"}</td>
                      <td className="p-3 text-zinc-400">{decision.has_cover ? "Sim" : "Não"}</td>
                      <td className="max-w-56 p-3"><p className="break-words text-zinc-500">{decision.source_folder ?? "Raiz"}</p></td>
                      <td className="p-3">{group ? <button type="button" onClick={() => toggleGroup(group.duplicate_group)} className="rounded-lg border border-white/10 px-2 py-1.5 font-semibold text-amber-300 hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-amber-500">Grupo {group.duplicate_group}</button> : "—"}</td>
                      <td className="max-w-44 p-3 text-zinc-500">{reasonLabel(decision)}</td>
                    </tr>
                    {group && expandedGroup === group.duplicate_group && <tr><td colSpan={11} className="p-3"><DuplicateGroupDetails group={group} decisions={allDecisions} /></td></tr>}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        {decisions.map((decision) => {
          const group = decision.duplicate_group !== null ? groupById.get(decision.duplicate_group) : undefined;
          return (
            <article key={decision.relative_path} className="rounded-2xl border border-white/[0.08] bg-[#1c1c1f] p-4">
              <div className="flex flex-wrap gap-2"><ActionBadge action={decision.action} duplicateStatus={decision.duplicate_status} /><DuplicateBadge status={decision.duplicate_status} /></div>
              <h2 className="mt-3 font-bold text-zinc-100">{decision.resolved_title ?? decision.original_filename}</h2>
              <p className="mt-1 text-sm text-zinc-400">{decision.resolved_artist ?? "Artista não resolvido"}</p>
              <div className="mt-3"><MetadataBadge status={decision.metadata_status} /></div>
              <details className="mt-3 text-xs text-zinc-500">
                <summary className="cursor-pointer font-semibold text-zinc-300">Ver detalhes</summary>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2"><dt>Arquivo</dt><dd className="break-all text-zinc-300">{decision.original_filename}</dd><dt>Pasta</dt><dd className="break-all text-zinc-300">{decision.source_folder ?? "Raiz"}</dd><dt>Duração</dt><dd>{duration(decision.duration_seconds)}</dd><dt>Bitrate</dt><dd>{decision.bitrate ? `${Math.round(decision.bitrate / 1000)} kbps` : "—"}</dd><dt>Capa</dt><dd>{decision.has_cover ? "Sim" : "Não"}</dd><dt>Motivo</dt><dd>{reasonLabel(decision)}</dd></dl>
              </details>
              {group && <button type="button" onClick={() => toggleGroup(group.duplicate_group)} className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-amber-300">{expandedGroup === group.duplicate_group ? "Fechar grupo" : `Abrir grupo ${group.duplicate_group}`}</button>}
              {group && expandedGroup === group.duplicate_group && <div className="mt-3"><DuplicateGroupDetails group={group} decisions={allDecisions} /></div>}
            </article>
          );
        })}
      </div>
    </>
  );
}
