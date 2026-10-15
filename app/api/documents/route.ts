import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export async function GET() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error:"Unauthorized" },{status:401}); const { data,error } = await supabase.from("documents").select("id,display_name,mime_type,file_size,status,page_count,error_code,created_at").eq("user_id",user.id).order("created_at",{ascending:false}); if(error) return NextResponse.json({error:"Could not load documents."},{status:500}); return NextResponse.json({documents:data}); }

