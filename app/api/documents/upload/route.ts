import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkPages } from "@/lib/documents/chunk";
import { embedTexts } from "@/lib/embeddings/gemini";
export const runtime = "nodejs";
const safeName = (name:string) => name.replace(/[\\/\u0000-\u001f]/g,"_").slice(0,160) || "report";
export async function POST(request:Request) {
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) return NextResponse.json({error:"Sign in to upload reports."},{status:401});
  const form=await request.formData().catch(()=>null); const file=form?.get("file"); if(!(file instanceof File)) return NextResponse.json({error:"Choose a PDF or plain text file."},{status:400});
  const maxMb=Math.min(Number(process.env.MAX_UPLOAD_MB??10),10); if(!file.size || file.size>maxMb*1024*1024) return NextResponse.json({error:`File must be between 1 byte and ${maxMb} MB.`},{status:400});
  const isPdf=file.type==="application/pdf"&&file.name.toLowerCase().endsWith(".pdf"); const isText=(file.type==="text/plain"||file.type==="application/octet-stream")&&file.name.toLowerCase().endsWith(".txt"); if(!isPdf&&!isText) return NextResponse.json({error:"Only PDF and TXT documents are accepted."},{status:415});
  const bytes=Buffer.from(await file.arrayBuffer()); if(isPdf&&bytes.subarray(0,5).toString()!=="%PDF-") return NextResponse.json({error:"The file does not appear to be a valid PDF."},{status:400}); if(isText && (bytes.includes(0)||!Buffer.from(bytes).toString("utf8"))) return NextResponse.json({error:"The text file is not valid UTF-8."},{status:400});
  const admin=createAdminClient(); const id=crypto.randomUUID(); const path=`${user.id}/${id}/${safeName(file.name)}`; const mime=isPdf?"application/pdf":"text/plain";
  const uploaded=await admin.storage.from("medical-reports").upload(path,bytes,{contentType:mime,upsert:false}); if(uploaded.error) return NextResponse.json({error:"Secure file storage failed."},{status:502});
  const inserted=await admin.from("documents").insert({id,user_id:user.id,display_name:safeName(file.name),storage_path:path,mime_type:mime,file_size:file.size,status:"processing"}).select("id").single(); if(inserted.error){await admin.storage.from("medical-reports").remove([path]);return NextResponse.json({error:"Could not create the document record."},{status:500});}
  try {
    let pages:{page:number|null;text:string}[];
    if(isText) pages=[{page:null,text:new TextDecoder("utf-8",{fatal:true}).decode(bytes)}];
    else { const { PDFParse }=await import("pdf-parse"); const parser=new PDFParse({data:bytes}); const result=await parser.getText(); pages=result.pages.map((p:{num:number;text:string})=>({page:p.num,text:p.text})); await parser.destroy(); }
    const chunks=chunkPages(pages,Number(process.env.CHUNK_SIZE??900),Number(process.env.CHUNK_OVERLAP??120)); if(!chunks.length) throw new Error("no_text");
    for(let i=0;i<chunks.length;i+=64){const batch=chunks.slice(i,i+64);const vectors=await embedTexts(batch.map(c=>c.text));const rows=batch.map((c,j)=>({document_id:id,user_id:user.id,chunk_index:c.index,content:c.text,page_number:c.page,char_count:c.charCount,embedding:JSON.stringify(vectors[j])}));const saved=await admin.from("document_chunks").insert(rows);if(saved.error)throw new Error("index_failed");}
    await admin.from("documents").update({status:"ready",page_count:isPdf?pages.length:null,updated_at:new Date().toISOString()}).eq("id",id).eq("user_id",user.id);
    return NextResponse.json({documentId:id,status:"ready"},{status:201});
  } catch(error) { await admin.from("document_chunks").delete().eq("document_id",id).eq("user_id",user.id); await admin.from("documents").update({status:"failed",error_code:error instanceof Error&&error.message==="no_text"?"no_extractable_text":"processing_failed",updated_at:new Date().toISOString()}).eq("id",id).eq("user_id",user.id); const message=error instanceof Error&&error.message==="no_text"?"No selectable text was found. Scanned PDFs need OCR, which is not configured yet.":"Document processing failed. You can delete it and retry later."; return NextResponse.json({error:message,documentId:id},{status:422}); }
}


