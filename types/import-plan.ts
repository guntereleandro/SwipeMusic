export type ImportAction = "IMPORT" | "SKIP_EXACT" | "SKIP_LIKELY";
export type DuplicateStatus =
  | "EXACT_DUPLICATE"
  | "LIKELY_DUPLICATE"
  | "POSSIBLE_DUPLICATE"
  | "UNIQUE";
export type ImportMetadataStatus = "GOOD" | "INFERRED" | "NEEDS_REVIEW";

export type ImportDecision = {
  relative_path: string;
  original_filename: string;
  source_folder: string | null;
  resolved_title: string | null;
  resolved_artist: string | null;
  resolved_album: string | null;
  duration_seconds: number | null;
  file_hash: string;
  file_size: number;
  action: ImportAction;
  reason: string;
  duplicate_status: DuplicateStatus;
  duplicate_group: number | null;
  representative: string;
  representative_reason: string[];
  bitrate: number | null;
  sample_rate: number | null;
  has_cover: boolean;
  metadata_status: ImportMetadataStatus;
};

export type ImportPlanSummary = {
  files_found: number;
  files_to_import: number;
  exact_duplicates_skipped: number;
  likely_duplicates_skipped: number;
  possible_duplicates_preserved: number;
  metadata_review_preserved: number;
  estimated_upload_bytes: number;
};

export type ImportPlanDuplicateGroup = {
  duplicate_group: number;
  duplicate_status: Exclude<DuplicateStatus, "UNIQUE">;
  confidence: number;
  hash?: string;
  quantity: number;
  wasted_bytes?: number;
  files: string[];
  reasons: string[];
};

export type ImportPlanReport = {
  generated_at: string;
  report_name: string;
  summary: ImportPlanSummary;
  decisions: ImportDecision[];
  duplicate_groups: ImportPlanDuplicateGroup[];
};
