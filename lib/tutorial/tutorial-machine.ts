import type { Rating } from "../../types/song";

export type TutorialStep = "INTRO" | "LIKE" | "DISLIKE" | "NEUTRAL" | "UNDO" | "COMPLETE";

export type TutorialState = {
  step: TutorialStep;
  simulatedRatings: Array<{ songId: string; rating: Rating }>;
  restoredSongId: string | null;
};

export type TutorialAction =
  | { type: "START" }
  | { type: "SKIP" }
  | { type: "RATE"; rating: Rating }
  | { type: "UNDO" };

export const INITIAL_TUTORIAL_STATE: TutorialState = {
  step: "INTRO",
  simulatedRatings: [],
  restoredSongId: null,
};

const SONG_BY_STEP = { LIKE: "tutorial-like", DISLIKE: "tutorial-dislike", NEUTRAL: "tutorial-neutral" } as const;

export function tutorialReducer(state: TutorialState, action: TutorialAction): TutorialState {
  if (action.type === "START" && state.step === "INTRO") return { ...state, step: "LIKE" };
  if (action.type === "SKIP") return { ...state, step: "COMPLETE" };
  if (action.type === "RATE") {
    const expected = state.step === "LIKE" ? "LIKE" : state.step === "DISLIKE" ? "DISLIKE" : state.step === "NEUTRAL" ? "NEUTRAL" : null;
    if (action.rating !== expected || !expected) return state;
    const next = state.step === "LIKE" ? "DISLIKE" : state.step === "DISLIKE" ? "NEUTRAL" : "UNDO";
    return { ...state, step: next, simulatedRatings: [...state.simulatedRatings, { songId: SONG_BY_STEP[state.step as keyof typeof SONG_BY_STEP], rating: action.rating }] };
  }
  if (action.type === "UNDO" && state.step === "UNDO") {
    const restored = state.simulatedRatings.at(-1);
    return { step: "COMPLETE", simulatedRatings: state.simulatedRatings.slice(0, -1), restoredSongId: restored?.songId ?? null };
  }
  return state;
}
