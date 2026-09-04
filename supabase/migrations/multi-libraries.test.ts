import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202609040001_multi_libraries.sql"), "utf8");

describe("migration multi-library", () => {
  it("migra antes de exigir NOT NULL e preserva ratings", () => {
    expect(sql.indexOf("update public.songs")).toBeLessThan(sql.indexOf("alter column library_id set not null"));
    expect(sql).not.toMatch(/delete\s+from\s+public\.(songs|ratings)/i);
  });

  it("permite a mesma hash entre bibliotecas e bloqueia dentro da mesma", () => {
    expect(sql).toContain("on public.songs (library_id, file_hash)");
    expect(sql).toContain("drop index if exists public.songs_file_hash_unique_idx");
  });

  it("não concede escrita pública em songs ou libraries", () => {
    expect(sql).toContain("grant select on table public.libraries to anon, authenticated");
    expect(sql).not.toMatch(/grant\s+(insert|update|delete).*public\.(songs|libraries)/i);
  });
});
