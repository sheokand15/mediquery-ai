import { describe,expect,it } from "vitest";
import { chunkPages } from "../lib/documents/chunk";
import { aggregateMetrics,recallAtK,reciprocalRankAtK } from "../lib/evaluation/metrics";
import { reciprocalRankFusion } from "../lib/retrieval/rrf";
describe("document chunking",()=>{it("preserves page metadata, order and text",()=>{const c=chunkPages([{page:2,text:"Hemoglobin: 13.4 g/dL\r\nReference 12.0-15.5"}],16,3);expect(c.length).toBeGreaterThan(1);expect(c.every(x=>x.page===2)).toBe(true);expect(c.map(x=>x.index)).toEqual(c.map((_,i)=>i));});it("rejects invalid overlap",()=>expect(()=>chunkPages([{page:null,text:"x"}],10,10)).toThrow());it("returns no chunks for empty text",()=>expect(chunkPages([{page:null,text:"  "}])).toEqual([]));});
describe("hybrid ranking",()=>{it("fuses ranks and deduplicates candidates",()=>{const rows=reciprocalRankFusion([{id:"a"},{id:"b"}],[{id:"b"},{id:"c"}],60,5);expect(rows[0].id).toBe("b");expect(rows).toHaveLength(3);expect(rows[0].ranks).toEqual({lexical:2,semantic:1});});});
describe("retrieval metrics",()=>{it("computes recall and reciprocal rank at five",()=>{expect(recallAtK(["a","b","c"],["b","c"],5)).toBe(1);expect(reciprocalRankAtK(["a","b"],["b"],5)).toBe(.5);expect(aggregateMetrics([{ranked:["x","a"],relevant:["a"]}])).toEqual({recallAtK:1,mrrAtK:.5});});it("uses zero reciprocal rank for unanswerable cases",()=>expect(reciprocalRankAtK(["a"],[],5)).toBe(0));});

