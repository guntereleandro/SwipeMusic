import { describe, expect, it } from "vitest";
import { INITIAL_TUTORIAL_STATE, tutorialReducer } from "./tutorial-machine";

describe("tutorial interativo", () => {
  it("Gosto, Não gosto e Indiferente avançam somente na etapa correta", () => {
    let state = tutorialReducer(INITIAL_TUTORIAL_STATE, { type: "START" });
    expect(state.step).toBe("LIKE");
    expect(tutorialReducer(state, { type: "RATE", rating: "DISLIKE" })).toBe(state);
    state = tutorialReducer(state, { type: "RATE", rating: "LIKE" });
    expect(state.step).toBe("DISLIKE");
    state = tutorialReducer(state, { type: "RATE", rating: "DISLIKE" });
    expect(state.step).toBe("NEUTRAL");
    state = tutorialReducer(state, { type: "RATE", rating: "NEUTRAL" });
    expect(state.step).toBe("UNDO");
  });

  it("Undo restaura a música neutra no estado simulado", () => {
    let state = tutorialReducer(INITIAL_TUTORIAL_STATE, { type: "START" });
    for (const rating of ["LIKE", "DISLIKE", "NEUTRAL"] as const) state = tutorialReducer(state, { type: "RATE", rating });
    state = tutorialReducer(state, { type: "UNDO" });
    expect(state).toMatchObject({ step: "COMPLETE", restoredSongId: "tutorial-neutral" });
    expect(state.simulatedRatings.map(({ songId }) => songId)).toEqual(["tutorial-like", "tutorial-dislike"]);
  });

  it("Pular conclui sem tocar na fila ou em dados externos", () => {
    expect(tutorialReducer(INITIAL_TUTORIAL_STATE, { type: "SKIP" })).toEqual({ ...INITIAL_TUTORIAL_STATE, step: "COMPLETE" });
  });
});
