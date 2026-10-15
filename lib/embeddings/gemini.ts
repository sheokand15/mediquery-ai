const MODEL = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-2";
const DIMENSIONS = 1536;
type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";
async function embed(input: string[], taskType: TaskType): Promise<number[][]> {
  if (!input.length) return [];
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("AI services are not configured. Set GEMINI_API_KEY.");
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":batchEmbedContents", {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ requests: input.map((text) => ({ model: "models/" + MODEL, content: { parts: [{ text }] }, embedContentConfig: { taskType, outputDimensionality: DIMENSIONS } })) }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? "Gemini embeddings request failed (" + response.status + ").");
  }
  const body = await response.json() as { embeddings?: { values?: number[] }[] };
  const vectors = body.embeddings?.map((item) => item.values ?? []);
  if (!vectors || vectors.length !== input.length || vectors.some((vector) => vector.length !== DIMENSIONS)) throw new Error("Gemini returned embeddings with an unexpected size.");
  return vectors;
}
export const embedTexts = (input: string[]) => embed(input, "RETRIEVAL_DOCUMENT");
export async function embedQuery(input: string) { return (await embed([input], "RETRIEVAL_QUERY"))[0]; }
