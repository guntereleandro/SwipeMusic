"use client";

import type { ReactNode } from "react";
import { MusicCard } from "@/components/music-card";
import { useSwipeGesture } from "@/hooks/use-swipe-gesture";
import type { Rating, Song } from "@/types/song";

type SwipeableMusicCardProps = {
  song: Song;
  onSwipe: (rating: Extract<Rating, "LIKE" | "DISLIKE">) => void;
  children: ReactNode;
};

export function SwipeableMusicCard({ song, onSwipe, children }: SwipeableMusicCardProps) {
  const {
    setCardElement,
    style,
    handlers,
    direction,
    feedbackStrength,
    isDragging,
    isExiting,
  } = useSwipeGesture({ onSwipe });

  return (
    <div
      ref={setCardElement}
      style={{
        ...style,
        userSelect: isDragging ? "none" : "auto",
        WebkitUserSelect: isDragging ? "none" : "auto",
      }}
      {...handlers}
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

      <MusicCard song={song}>{children}</MusicCard>
    </div>
  );
}
