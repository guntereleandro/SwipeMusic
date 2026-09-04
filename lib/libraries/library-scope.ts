export type LibraryIdentity = {
  id: string;
  name: string;
  slug: string;
};

export function requireLibrarySlug(args: readonly string[]) {
  const flagIndex = args.indexOf("--library");
  const slug = flagIndex >= 0 ? args[flagIndex + 1]?.trim().toLowerCase() : undefined;
  if (!slug || slug.startsWith("--")) {
    throw new Error("Informe a biblioteca explicitamente com --library <slug>.");
  }
  return slug;
}

export function positionalArguments(args: readonly string[]) {
  const result: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--library") {
      index += 1;
      continue;
    }
    if (!args[index].startsWith("--")) result.push(args[index]);
  }
  return result;
}

export function filterRowsBySongIds<Row extends { song_id: string }>(
  rows: readonly Row[],
  songIds: ReadonlySet<string>,
) {
  return rows.filter((row) => songIds.has(row.song_id));
}

export async function resolveRequiredLibrary<T extends { id: string; slug: string }>(
  slug: string,
  find: (slug: string) => Promise<T | null>,
) {
  const library = await find(slug);
  if (!library) throw new Error(`Biblioteca não encontrada: ${slug}`);
  return library;
}
