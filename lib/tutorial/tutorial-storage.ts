const TUTORIAL_PREFIX = "swipemusic:tutorial:";
const COMPLETED_VALUE = "completed";

type TutorialStorage = Pick<Storage, "getItem" | "setItem">;

export function tutorialStorageKey(slug: string) {
  return `${TUTORIAL_PREFIX}${slug.trim().toLowerCase()}`;
}

function browserStorage(): TutorialStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasCompletedTutorial(slug: string, storage: TutorialStorage | null = browserStorage()) {
  try {
    return storage?.getItem(tutorialStorageKey(slug)) === COMPLETED_VALUE;
  } catch {
    return false;
  }
}

export function markTutorialCompleted(slug: string, storage: TutorialStorage | null = browserStorage()) {
  try {
    storage?.setItem(tutorialStorageKey(slug), COMPLETED_VALUE);
    return storage !== null;
  } catch {
    return false;
  }
}
