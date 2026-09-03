import { describe, expect, it } from "vitest";
import type { ImportDecision } from "../../types/import-plan";
import { createResumePlan } from "./resume-plan";

function decision(hash: string): ImportDecision {
  return {
    relative_path: `${hash}.mp3`, original_filename: `${hash}.mp3`, source_folder: null,
    resolved_title: hash, resolved_artist: null, resolved_album: null, duration_seconds: 1,
    file_hash: hash, file_size: 10, action: "IMPORT", reason: "preserved",
    duplicate_status: "UNIQUE", duplicate_group: null, representative: `${hash}.mp3`,
    representative_reason: [], bitrate: null, sample_rate: null, has_cover: false,
    metadata_status: "GOOD",
  };
}

describe("plano de retomada", () => {
  it("pula hashes existentes sem upload", () => {
    const plan = createResumePlan([decision("a"), decision("b")], new Set(["a"]), new Set(["a.mp3"]));
    expect(plan.alreadyImported.map((item) => item.file_hash)).toEqual(["a"]);
    expect(plan.missing.map((item) => item.file_hash)).toEqual(["b"]);
    expect(plan.uploadsRequired).toBe(1);
  });

  it("reutiliza áudio órfão em vez de reenviá-lo", () => {
    const plan = createResumePlan([decision("a")], new Set(), new Set(["a.mp3"]), new Set(["a.jpg"]));
    expect(plan.missing[0]).toMatchObject({ audio_upload_required: false, orphan_audio_reused: true });
    expect(plan.orphanAudioPaths).toEqual(["a.mp3"]);
    expect(plan.orphanCoverPaths).toEqual(["a.jpg"]);
    expect(plan.uploadsRequired).toBe(0);
  });
});
