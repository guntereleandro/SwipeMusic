import type { ImportDecision } from "../../types/import-plan";

export type ResumeDecision = ImportDecision & {
  resume_status: "already_imported" | "missing";
  audio_upload_required: boolean;
  orphan_audio_reused: boolean;
};

export type ResumePlan = {
  alreadyImported: ResumeDecision[];
  missing: ResumeDecision[];
  orphanAudioPaths: string[];
  orphanCoverPaths: string[];
  uploadsRequired: number;
};

export function createResumePlan(
  candidates: ImportDecision[],
  existingHashes: ReadonlySet<string>,
  musicObjects: ReadonlySet<string>,
  coverObjects: ReadonlySet<string> = new Set(),
): ResumePlan {
  const alreadyImported: ResumeDecision[] = [];
  const missing: ResumeDecision[] = [];
  const expectedAudioPaths = new Set(candidates.map((decision) => `${decision.file_hash}.mp3`));
  const candidateHashes = new Set(candidates.map((decision) => decision.file_hash));

  for (const decision of candidates) {
    const imported = existingHashes.has(decision.file_hash);
    const audioPath = `${decision.file_hash}.mp3`;
    const orphanAudioReused = !imported && musicObjects.has(audioPath);
    const resumeDecision: ResumeDecision = {
      ...decision,
      resume_status: imported ? "already_imported" : "missing",
      audio_upload_required: !imported && !orphanAudioReused,
      orphan_audio_reused: orphanAudioReused,
    };
    (imported ? alreadyImported : missing).push(resumeDecision);
  }

  return {
    alreadyImported,
    missing,
    orphanAudioPaths: [...musicObjects].filter((path) =>
      expectedAudioPaths.has(path) && !existingHashes.has(path.replace(/\.mp3$/, "")),
    ),
    orphanCoverPaths: [...coverObjects].filter((path) => {
      const filename = path.split("/").at(-1) ?? "";
      const hash = filename.replace(/\.[^.]+$/, "");
      return candidateHashes.has(hash) && !existingHashes.has(hash);
    }),
    uploadsRequired: missing.filter((decision) => decision.audio_upload_required).length,
  };
}
