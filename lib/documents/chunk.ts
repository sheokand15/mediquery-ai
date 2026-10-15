export type TextPage = { page: number | null; text: string };
export type Chunk = { index: number; text: string; page: number | null; charCount: number };
export function chunkPages(pages: TextPage[], size = 900, overlap = 120): Chunk[] {
  if (size < 1 || overlap < 0 || overlap >= size) throw new Error("Chunk overlap must be non-negative and smaller than chunk size.");
  const chunks: Chunk[] = [];
  for (const page of pages) {
    const text = page.text.replace(/\r\n?/g, "\n").replace(/[\t ]+/g, " ").trim();
    for (let start = 0; start < text.length;) {
      let end = Math.min(text.length, start + size);
      if (end < text.length) { const boundary = text.lastIndexOf(" ", end); if (boundary > start + Math.floor(size * .65)) end = boundary; }
      const part = text.slice(start, end).trim();
      if (part) chunks.push({ index: chunks.length, text: part, page: page.page, charCount: part.length });
      if (end >= text.length) break;
      start = Math.max(start + 1, end - overlap);
    }
  }
  return chunks;
}

