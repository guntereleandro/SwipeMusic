import { extractVersionMarkers } from "./normalization";

export type DuplicateStatus =
  | "EXACT_DUPLICATE"
  | "LIKELY_DUPLICATE"
  | "POSSIBLE_DUPLICATE"
  | "UNIQUE";

export type ComparableTrack = {
  normalizedTitle: string;
  normalizedArtist: string;
  durationSeconds: number | null;
  titleTrusted: boolean;
  artistTrusted: boolean;
};

export type ComparisonResult = {
  duplicateStatus: Extract<DuplicateStatus, "LIKELY_DUPLICATE" | "POSSIBLE_DUPLICATE"> | null;
  confidence: number;
  reasons: string[];
};

function bigrams(value: string) {
  if (value.length < 2) return new Set([value]);
  const result = new Set<string>();
  for (let index = 0; index < value.length - 1; index += 1) result.add(value.slice(index, index + 2));
  return result;
}

export function textSimilarity(left: string, right: string) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftBigrams = bigrams(left);
  const rightBigrams = bigrams(right);
  let intersection = 0;
  for (const item of leftBigrams) if (rightBigrams.has(item)) intersection += 1;
  return (2 * intersection) / (leftBigrams.size + rightBigrams.size);
}

function sameMarkers(left: string[], right: string[]) {
  return left.length === right.length && left.every((marker, index) => marker === right[index]);
}

function baseTitle(title: string) {
  return title
    .replace(/\b(?:ao vivo|live|remix|acoustic|acustico|versao|version)\b/g, " ")
    .replace(/\bremaster(?:ed|izado|izada)?\b/g, " ")
    .replace(/\bfeat\s+.+$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compareTracks(left: ComparableTrack, right: ComparableTrack): ComparisonResult {
  if (!left.titleTrusted || !right.titleTrusted || !left.artistTrusted || !right.artistTrusted) {
    return { duplicateStatus: null, confidence: 0, reasons: [] };
  }

  const titleSimilarity = textSimilarity(baseTitle(left.normalizedTitle), baseTitle(right.normalizedTitle));
  const artistSimilarity = textSimilarity(left.normalizedArtist, right.normalizedArtist);
  const versionConflict = !sameMarkers(
    extractVersionMarkers(left.normalizedTitle),
    extractVersionMarkers(right.normalizedTitle),
  );
  const durationDifference =
    left.durationSeconds !== null && right.durationSeconds !== null
      ? Math.abs(left.durationSeconds - right.durationSeconds)
      : null;
  const reasons = [
    `title_similarity_${titleSimilarity.toFixed(2)}`,
    `artist_similarity_${artistSimilarity.toFixed(2)}`,
  ];
  if (durationDifference !== null) reasons.push(`duration_difference_${durationDifference}s`);
  if (versionConflict) reasons.push("version_or_feature_conflict");

  if (versionConflict || titleSimilarity < 0.9 || artistSimilarity < 0.9) {
    return { duplicateStatus: null, confidence: 0, reasons: [] };
  }

  if (
    durationDifference !== null &&
    durationDifference <= 5 &&
    titleSimilarity >= 0.95 &&
    artistSimilarity >= 0.95
  ) {
    return { duplicateStatus: "LIKELY_DUPLICATE", confidence: 0.96, reasons };
  }

  if (durationDifference === null || durationDifference <= 15) {
    return { duplicateStatus: "POSSIBLE_DUPLICATE", confidence: 0.78, reasons };
  }

  return { duplicateStatus: null, confidence: 0, reasons: [] };
}
