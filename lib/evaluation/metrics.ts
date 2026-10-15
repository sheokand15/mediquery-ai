export function recallAtK(ranked:string[],relevant:string[],k=5){if(!relevant.length)return 1;const found=new Set(ranked.slice(0,k).filter(id=>relevant.includes(id)));return found.size/relevant.length;}
export function reciprocalRankAtK(ranked:string[],relevant:string[],k=5){const index=ranked.slice(0,k).findIndex(id=>relevant.includes(id));return index<0?0:1/(index+1);}
export function aggregateMetrics(rows:{ranked:string[];relevant:string[]}[],k=5){if(!rows.length)return {recallAtK:0,mrrAtK:0};return {recallAtK:rows.reduce((s,r)=>s+recallAtK(r.ranked,r.relevant,k),0)/rows.length,mrrAtK:rows.reduce((s,r)=>s+reciprocalRankAtK(r.ranked,r.relevant,k),0)/rows.length};}

