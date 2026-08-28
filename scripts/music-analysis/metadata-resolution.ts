import { basename, extname } from "node:path";
import { normalizeArtist, normalizeTitle } from "./normalization";

export type MetadataSource = "ID3" | "FILENAME" | "FOLDER" | "UNKNOWN";
export type MetadataConfidence = "HIGH" | "MEDIUM" | "LOW";
export type MetadataStatus = "GOOD" | "INFERRED" | "NEEDS_REVIEW";

export type ResolvedMetadata = {
  resolvedTitle: string | null;
  resolvedArtist: string | null;
  resolvedAlbum: string | null;
  titleSource: MetadataSource;
  artistSource: MetadataSource;
  albumSource: MetadataSource;
  titleConfidence: MetadataConfidence;
  artistConfidence: MetadataConfidence;
  metadataStatus: MetadataStatus;
  suspiciousFields: string[];
};

const PROMOTIONAL_TERMS = [
  "downsertanejo",
  "sapodownloads",
  "musicasparabaixar",
  "tonobuteco",
  "sistemasertanejo",
  "download",
];

const GENERIC_FOLDERS = [
  "backup",
  "diversas",
  "diversos",
  "musicas",
  "sertanejo",
  "sertanejao",
  "modao",
  "antigas",
  "album",
  "albuns",
  "cd",
  "disco",
  "coletanea",
  "coletaneas",
];

export function isSuspiciousMetadataValue(value: string | null | undefined) {
  if (!value?.trim()) return true;

  const trimmed = value.trim();
  const normalized = normalizeTitle(trimmed);
  if (!normalized) return true;
  if (/^(?:unknown(?: artist)?|desconhecido|artista desconhecido|sem titulo|untitled)$/i.test(normalized)) return true;
  if (/^(?:faixa|track|audio|musica)\s*\d*$/i.test(normalized)) return true;
  if (/^\d+$/.test(normalized) || /^[a-z]$/i.test(normalized)) return true;
  if (/\bwww\b|\.(?:com|net|org|com br)\b/i.test(trimmed)) return true;

  const compact = normalized.replace(/\s+/g, "");
  return PROMOTIONAL_TERMS.some((term) => compact.includes(term));
}

export function parseFilename(fileName: string) {
  const withoutExtension = basename(fileName, extname(fileName)).trim();
  const withoutTrack = withoutExtension
    .replace(/^\s*\d{1,3}\s*[-_.\s)]\s*/, "")
    .trim();
  const parts = withoutTrack.split(/\s+[-–—]\s+/).map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return {
      title: parts.slice(1).join(" - "),
      artist: parts[0],
      explicitArtist: true,
    };
  }

  return { title: withoutTrack || withoutExtension, artist: null, explicitArtist: false };
}

function folderEvidence(sourceFolder: string | null) {
  if (!sourceFolder) return { artist: null, album: null };
  const segments = sourceFolder.split("/").map((segment) => segment.trim()).filter(Boolean);
  const candidate = segments.at(-1);
  if (!candidate) return { artist: null, album: null };

  const normalized = normalizeArtist(candidate);
  const compact = normalized.replace(/\s+/g, "");
  if (
    !normalized ||
    /^\d/.test(normalized) ||
    /\btop\s*\d+\b/.test(normalized) ||
    GENERIC_FOLDERS.some((folder) => compact === folder || normalized.includes(folder))
  ) return { artist: null, album: null };

  const parts = candidate.split(/\s+[-–—]\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 2 && !isSuspiciousMetadataValue(parts[0])) {
    return { artist: parts[0], album: parts[1] };
  }
  return isSuspiciousMetadataValue(candidate)
    ? { artist: null, album: null }
    : { artist: candidate, album: null };
}

export function resolveMetadata(input: {
  fileName: string;
  sourceFolder: string | null;
  id3Title: string | null;
  id3Artist: string | null;
  id3Album: string | null;
}): ResolvedMetadata {
  const suspiciousFields: string[] = [];
  const titleTrusted = !isSuspiciousMetadataValue(input.id3Title);
  const artistTrusted = !isSuspiciousMetadataValue(input.id3Artist);
  const albumTrusted = !isSuspiciousMetadataValue(input.id3Album);
  if (input.id3Title && !titleTrusted) suspiciousFields.push("id3_title");
  if (input.id3Artist && !artistTrusted) suspiciousFields.push("id3_artist");
  if (input.id3Album && !albumTrusted) suspiciousFields.push("id3_album");

  const filename = parseFilename(input.fileName);
  const folders = folderEvidence(input.sourceFolder);
  const resolvedTitle = titleTrusted ? input.id3Title : filename.title || null;
  const titleSource: MetadataSource = titleTrusted ? "ID3" : resolvedTitle ? "FILENAME" : "UNKNOWN";
  const titleConfidence: MetadataConfidence = titleTrusted
    ? "HIGH"
    : resolvedTitle
      ? filename.explicitArtist ? "HIGH" : "MEDIUM"
      : "LOW";

  const filenameArtist = filename.explicitArtist && !isSuspiciousMetadataValue(filename.artist)
    ? filename.artist
    : null;
  const resolvedArtist = artistTrusted ? input.id3Artist : filenameArtist ?? folders.artist;
  const artistSource: MetadataSource = artistTrusted
    ? "ID3"
    : filenameArtist
      ? "FILENAME"
      : resolvedArtist
        ? "FOLDER"
        : "UNKNOWN";
  const artistConfidence: MetadataConfidence = artistTrusted
    ? "HIGH"
    : artistSource === "FILENAME"
      ? "HIGH"
      : artistSource === "FOLDER" ? "MEDIUM" : "LOW";

  const resolvedAlbum = albumTrusted ? input.id3Album : folders.album;
  const albumSource: MetadataSource = albumTrusted ? "ID3" : resolvedAlbum ? "FOLDER" : "UNKNOWN";
  const inferred = titleSource !== "ID3" || artistSource !== "ID3" || albumSource === "FOLDER";
  const metadataStatus: MetadataStatus = !resolvedTitle || !resolvedArtist
    ? "NEEDS_REVIEW"
    : inferred ? "INFERRED" : "GOOD";

  return {
    resolvedTitle,
    resolvedArtist,
    resolvedAlbum,
    titleSource,
    artistSource,
    albumSource,
    titleConfidence,
    artistConfidence,
    metadataStatus,
    suspiciousFields,
  };
}
