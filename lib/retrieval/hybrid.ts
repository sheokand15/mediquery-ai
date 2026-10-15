import { createClient } from "@/lib/supabase/server";
import { embedQuery } from "@/lib/embeddings/gemini";
import { reciprocalRankFusion } from "@/lib/retrieval/rrf";

export type Evidence = {
  id: string;
  document_id: string;
  document_name: string;
  content: string;
  page_number: number | null;
  score?: number;
  ranks?: { lexical?: number; semantic?: number };
};

export async function retrieve(question: string, documentIds?: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const queryEmbedding = await embedQuery(question);
  const matchCount = Number(process.env.RETRIEVAL_CANDIDATES ?? 20);
  const filterDocumentIds = documentIds?.length ? documentIds : null;
  const [lexical, semantic] = await Promise.all([
    supabase.rpc("search_chunks_lexical", {
      query_text: question,
      match_count: matchCount,
      filter_document_ids: filterDocumentIds,
    }),
    supabase.rpc("search_chunks_semantic", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: matchCount,
      filter_document_ids: filterDocumentIds,
    }),
  ]);

  if (lexical.error) throw new Error("Keyword retrieval failed.");
  if (semantic.error) throw new Error("Semantic retrieval failed.");
  const fused = reciprocalRankFusion(
    lexical.data ?? [],
    semantic.data ?? [],
    Number(process.env.RRF_K ?? 60),
    Number(process.env.RETRIEVAL_TOP_K ?? 5),
  );
  return { lexical: lexical.data as Evidence[], semantic: semantic.data as Evidence[], fused: fused as Evidence[] };
}
