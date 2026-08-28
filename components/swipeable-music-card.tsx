"use client";

import type { ReactNode } from "react";
import { MusicCard } from "@/components/music-card";
import { SWIPE_DEBUG, useSwipeGesture } from "@/hooks/use-swipe-gesture";
import type { Rating, Song } from "@/types/song";

type SwipeableMusicCardProps = {
  song: Song;
  disabled?: boolean;
  onSwipe: (rating: Extract<Rating, "LIKE" | "DISLIKE">) => Promise<boolean>;
  children: ReactNode;
};

export function SwipeableMusicCard({
  song,
  disabled = false,
  onSwipe,
  children,
}: SwipeableMusicCardProps) {
  const {
    setCardElement,
    style,
    handlers,
    direction,
    feedbackStrength,
    isDragging,
    isExiting,
    debug,
  } = useSwipeGesture({ disabled, onSwipe });

  return (
    <div
      ref={setCardElement}
      style={{
        ...style,
        userSelect: isDragging ? "none" : "auto",
        WebkitUserSelect: isDragging ? "none" : "auto",
      }}
      {...handlers}
      aria-busy={disabled}
      className={`swipe-card relative will-change-transform ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"} ${isExiting ? "pointer-events-none" : ""}`}
    >
      <div
        aria-hidden="true"
        style={{ opacity: direction === "RIGHT" ? feedbackStrength : 0 }}
        className="pointer-events-none absolute left-6 top-7 z-10 rounded-lg border-2 border-emerald-300 bg-[#14251e]/90 px-3 py-1.5 text-sm font-black uppercase tracking-[0.12em] text-emerald-300 shadow-lg transition-opacity"
      >
        Gosto
      </div>
      <div
        aria-hidden="true"
        style={{ opacity: direction === "LEFT" ? feedbackStrength : 0 }}
        className="pointer-events-none absolute right-6 top-7 z-10 rounded-lg border-2 border-rose-300 bg-[#2a171c]/90 px-3 py-1.5 text-sm font-black uppercase tracking-[0.12em] text-rose-300 shadow-lg transition-opacity"
      >
        Não gosto
      </div>

      <MusicCard song={song}>
        {children}
      </MusicCard>

      {SWIPE_DEBUG && process.env.NODE_ENV === "development" && (
        <aside className="pointer-events-none fixed bottom-2 left-2 z-50 w-[min(15rem,calc(100vw-1rem))] rounded-lg border border-cyan-400/40 bg-black/90 p-2 font-mono text-[10px] leading-4 text-cyan-200 shadow-xl">
          <p className="font-bold text-cyan-300">SWIPE DEBUG</p>
          <p>EVENT: {debug.event}</p>
          <p>DX: {debug.deltaX} · DY: {debug.deltaY}</p>
          <p>pointerType: {debug.pointerType}</p>
          <p>hasPointerCapture: {String(debug.hasPointerCapture)}</p>
          <p>dragging: {String(debug.dragging)}</p>
        </aside>
      )}
    </div>
  );
}
