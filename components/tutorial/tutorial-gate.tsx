"use client";

import { useState, useSyncExternalStore } from "react";
import { MusicRater } from "@/components/music-rater";
import { MusicTutorial } from "@/components/tutorial/music-tutorial";
import { hasCompletedTutorial, markTutorialCompleted } from "@/lib/tutorial/tutorial-storage";

export function TutorialGate({ libraryId, libraryName, librarySlug }: { libraryId: string; libraryName: string; librarySlug: string }) {
  const hydrated = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const [mode, setMode] = useState<"AUTO" | "OPEN" | "CLOSED">("AUTO");
  const showTutorial = mode === "OPEN" || (mode === "AUTO" && !hasCompletedTutorial(librarySlug));

  function finish() {
    markTutorialCompleted(librarySlug);
    setMode("CLOSED");
  }

  if (!hydrated) return <main className="min-h-[100svh] bg-[#111113]" aria-label="Preparando biblioteca" />;
  if (showTutorial) return <MusicTutorial libraryName={libraryName} onSkip={finish} onComplete={finish} />;
  return <MusicRater libraryId={libraryId} libraryName={libraryName} onOpenTutorial={() => setMode("OPEN")} />;
}
