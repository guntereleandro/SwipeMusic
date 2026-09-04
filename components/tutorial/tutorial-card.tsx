"use client";

import { useState, type ReactNode, type SyntheticEvent } from "react";
import { useSwipeGesture } from "@/hooks/use-swipe-gesture";
import type { Rating } from "@/types/song";

export function TutorialCard({ title, artist, accent, cue, muted = false, disabled = false, onSwipe, children }: {
  title: string; artist: string; accent: string; disabled?: boolean;
  cue: "RIGHT" | "LEFT" | null; muted?: boolean;
  onSwipe: (rating: Extract<Rating, "LIKE" | "DISLIKE">) => Promise<boolean>;
  children: ReactNode;
}) {
  const [demoStopped, setDemoStopped] = useState(false);
  const { setCardElement, style, handlers, direction, feedbackStrength, isDragging, isExiting } = useSwipeGesture({ disabled, onSwipe });
  const demoActive = cue !== null && !demoStopped;
  const stopDemo = (event: SyntheticEvent<HTMLDivElement>) => {
    event.currentTarget.style.animation = "none";
    event.currentTarget.style.transform = "none";
    event.currentTarget.querySelectorAll<HTMLElement>(".tutorial-demo-feedback").forEach((element) => {
      element.style.animation = "none";
      element.style.opacity = "0";
    });
    setDemoStopped(true);
  };
  return <div className="tutorial-demo-stage">
    {cue && <div aria-hidden="true" className={`tutorial-swipe-cue tutorial-swipe-cue--${cue.toLowerCase()}`}>
      {cue === "LEFT" ? <><span className="text-xl">←</span><span>Não gosto</span></> : <><span>Gosto</span><span className="text-xl">→</span></>}
    </div>}
    <div
      className={demoActive ? `tutorial-demo-motion tutorial-demo-motion--${cue.toLowerCase()}` : undefined}
      onPointerDownCapture={stopDemo}
      onTouchStartCapture={stopDemo}
    >
    <div ref={setCardElement} style={{ ...style, userSelect: isDragging ? "none" : "auto", WebkitUserSelect: isDragging ? "none" : "auto" }} {...handlers}
    className={`swipe-card relative will-change-transform ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"} ${isExiting ? "pointer-events-none" : ""}`}>
    <div aria-hidden style={{ opacity: direction === "RIGHT" ? feedbackStrength : undefined }} className={`pointer-events-none absolute left-6 top-7 z-10 rounded-lg border-2 border-emerald-300 bg-[#14251e]/90 px-3 py-1.5 text-sm font-black uppercase tracking-[0.12em] text-emerald-300 ${demoActive && cue === "RIGHT" ? "tutorial-demo-feedback" : "opacity-0"}`}>Gosto</div>
    <div aria-hidden style={{ opacity: direction === "LEFT" ? feedbackStrength : undefined }} className={`pointer-events-none absolute right-6 top-7 z-10 rounded-lg border-2 border-rose-300 bg-[#2a171c]/90 px-3 py-1.5 text-sm font-black uppercase tracking-[0.12em] text-rose-300 ${demoActive && cue === "LEFT" ? "tutorial-demo-feedback" : "opacity-0"}`}>Não gosto</div>
    <article className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#1c1c1f] p-3 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.8)] sm:p-4">
      <div className={`grid aspect-square place-items-center overflow-hidden rounded-[1.25rem] bg-gradient-to-br transition-opacity ${muted ? "opacity-40" : ""} ${accent}`}>
        <span aria-hidden className="text-7xl opacity-80">♫</span>
      </div>
      <div className={`px-2 pb-1 pt-4 text-center transition-opacity ${muted ? "opacity-40" : ""}`}><h2 className="truncate text-[1.4rem] font-bold tracking-[-0.025em] text-zinc-50">{title}</h2><p className="mt-0.5 truncate text-sm font-medium text-zinc-400">{artist}</p></div>
      <div className="mt-4 border-t border-white/[0.07] pt-3" data-swipe-ignore="true" style={{ touchAction: "manipulation" }}>{children}</div>
    </article>
    </div></div>
  </div>;
}
