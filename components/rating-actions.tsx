import { DislikeIcon, LikeIcon, NeutralIcon } from "@/components/icons";
import type { Rating } from "@/types/song";

type RatingActionsProps = {
  disabled?: boolean;
  onRate: (rating: Rating) => void | Promise<boolean>;
};

const actions = [
  {
    status: "DISLIKE",
    label: "Não gosto",
    icon: DislikeIcon,
    className:
      "text-rose-300 hover:border-rose-400/30 hover:bg-rose-400/10 focus-visible:outline-rose-400",
  },
  {
    status: "NEUTRAL",
    label: "Indiferente",
    icon: NeutralIcon,
    className:
      "text-zinc-300 hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-zinc-300",
  },
  {
    status: "LIKE",
    label: "Gosto",
    icon: LikeIcon,
    className:
      "text-emerald-300 hover:border-emerald-400/30 hover:bg-emerald-400/10 focus-visible:outline-emerald-400",
  },
] satisfies Array<{
  status: Rating;
  label: string;
  icon: typeof LikeIcon;
  className: string;
}>;

export function RatingActions({ disabled = false, onRate }: RatingActionsProps) {
  return (
    <div
      className="grid grid-cols-3 gap-2"
      aria-label="Avaliação"
      data-swipe-ignore="true"
    >
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <button
            key={action.status}
            type="button"
            disabled={disabled}
            onClick={() => void onRate(action.status)}
            className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.035] px-1.5 py-2 text-[11px] font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.96] disabled:cursor-wait disabled:opacity-50 sm:min-h-[4.5rem] sm:text-xs ${action.className}`}
          >
            <Icon className="size-5 sm:size-[1.35rem]" />
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
