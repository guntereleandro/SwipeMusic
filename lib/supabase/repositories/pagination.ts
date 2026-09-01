export const SUPABASE_PAGE_SIZE = 1_000;

type RowWithId = {
  id: string;
};

export type PageFetcher<Row> = (from: number, to: number) => Promise<Row[]>;

export async function listAllPages<Row extends RowWithId>(
  fetchPage: PageFetcher<Row>,
  pageSize = SUPABASE_PAGE_SIZE,
): Promise<Row[]> {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error("O tamanho da página deve ser um inteiro positivo.");
  }

  const rows: Row[] = [];
  const seenIds = new Set<string>();
  let from = 0;

  while (true) {
    const page = await fetchPage(from, from + pageSize - 1);

    if (page.length > pageSize) {
      throw new Error("A consulta retornou mais registros do que o lote solicitado.");
    }

    let addedInThisPage = 0;
    for (const row of page) {
      if (seenIds.has(row.id)) continue;
      seenIds.add(row.id);
      rows.push(row);
      addedInThisPage += 1;
    }

    if (page.length < pageSize) return rows;

    if (addedInThisPage === 0) {
      throw new Error("A paginação não avançou; a consulta repetiu o mesmo lote.");
    }

    if (from > Number.MAX_SAFE_INTEGER - pageSize) {
      throw new Error("A paginação excedeu o intervalo numérico seguro.");
    }

    from += pageSize;
  }
}
