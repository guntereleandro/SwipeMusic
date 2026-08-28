const ACCESSORY_TERMS = [
  "official audio",
  "official video",
  "lyric video",
  "lyrics",
  "320kbps",
  "128kbps",
];

export function removeDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeBase(value: string) {
  return removeDiacritics(value.trim())
    .toLocaleLowerCase("pt-BR")
    .replace(/\.(?:mp3|mpeg3)$/i, "")
    .replace(/^\s*\d{1,3}\s*(?:[-_.\s)]\s*)?/, "")
    .replace(/&/g, " e ")
    .replace(/\b(?:ft\.?|featuring)\b/g, "feat")
    .replace(/[_–—-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTitle(value: string) {
  let normalized = normalizeBase(value);

  for (const term of ACCESSORY_TERMS) {
    normalized = normalized.replace(new RegExp(`\\b${term.replace(" ", "\\s+")}\\b`, "g"), " ");
  }

  return normalized.replace(/\s+/g, " ").trim();
}

export function normalizeArtist(value: string) {
  return normalizeBase(value);
}

export function extractVersionMarkers(normalizedTitle: string) {
  const markers = new Set<string>();

  if (/\b(?:live|ao vivo)\b/.test(normalizedTitle)) markers.add("live");
  if (/\bremix\b/.test(normalizedTitle)) markers.add("remix");
  if (/\b(?:acoustic|acustico)\b/.test(normalizedTitle)) markers.add("acoustic");
  if (/\b(?:versao|version)\b/.test(normalizedTitle)) markers.add("version");
  if (/\bremaster(?:ed|izado|izada)?\b/.test(normalizedTitle)) markers.add("remastered");

  const featuredArtist = normalizedTitle.match(/\bfeat\s+(.+)$/)?.[1]?.trim();
  if (featuredArtist) markers.add(`feat:${featuredArtist}`);

  return [...markers].sort();
}
