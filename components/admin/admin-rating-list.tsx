import { CoverImage } from "@/components/cover-image";
import { RatingBadge } from "@/components/admin/rating-badge";
import { formatRatingDate, type AdminRatingItem } from "@/lib/admin/admin-data";
import { getCoverUrl } from "@/lib/supabase/media";

function RatingCover({ item }: { item: AdminRatingItem }) {
  return (
    <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
      <CoverImage src={getCoverUrl(item.coverPath)} title={item.title} />
    </div>
  );
}

export function AdminRatingList({ items }: { items: AdminRatingItem[] }) {
  return (
    <>
      <div className="mt-4 hidden overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1c1c1f] md:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-white/[0.08] bg-white/[0.025] text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="w-[52%] px-4 py-3 font-semibold">Música</th>
              <th className="w-[20%] px-4 py-3 font-semibold">Avaliação</th>
              <th className="w-[28%] px-4 py-3 font-semibold">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {items.map((item) => (
              <tr key={item.id} className="transition hover:bg-white/[0.025]">
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <RatingCover item={item} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-100">{item.title}</p>
                      <p className="truncate text-xs text-zinc-500">{item.artist}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><RatingBadge rating={item.rating} /></td>
                <td className="px-4 py-3 text-sm tabular-nums text-zinc-400">{formatRatingDate(item.ratedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-2 md:hidden">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-white/[0.08] bg-[#1c1c1f] p-3">
            <div className="flex min-w-0 items-center gap-3">
              <RatingCover item={item} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-100">{item.title}</p>
                <p className="truncate text-xs text-zinc-500">{item.artist}</p>
              </div>
              <RatingBadge rating={item.rating} />
            </div>
            <p className="mt-3 border-t border-white/[0.06] pt-2 text-right text-xs tabular-nums text-zinc-500">
              {formatRatingDate(item.ratedAt)}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
