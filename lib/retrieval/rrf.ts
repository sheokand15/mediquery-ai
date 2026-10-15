export type Ranked<T> = T & { id: string };
export type Fused<T> = T & { score: number; ranks: { lexical?: number; semantic?: number } };
export function reciprocalRankFusion<T extends Ranked<unknown>>(lexical: T[], semantic: T[], k = 60, topK = 5): Fused<T>[] {
  const entries = new Map<string, Fused<T>>();
  for (const [kind, list] of [["lexical", lexical], ["semantic", semantic]] as const) list.forEach((row, index) => {
    const prior = entries.get(row.id); const rank = index + 1;
    if (prior) { prior.score += 1 / (k + rank); prior.ranks[kind] = rank; }
    else entries.set(row.id, { ...row, score: 1 / (k + rank), ranks: { [kind]: rank } });
  });
  return [...entries.values()].sort((a,b) => b.score-a.score || a.id.localeCompare(b.id)).slice(0, topK);
}

