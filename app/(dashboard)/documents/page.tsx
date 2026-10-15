import { requireUser } from "@/lib/auth/user";import { DocumentManager } from "@/components/document-manager";
export default async function Documents(){const {supabase,user}=await requireUser();const {data}=await supabase.from("documents").select("id,display_name,mime_type,file_size,status,page_count,error_code,created_at").eq("user_id",user.id).order("created_at",{ascending:false});return <main className="container" style={{padding:"42px 0"}}><h1>Your documents</h1><p className="muted">Only you can access reports uploaded to your account.</p><DocumentManager initial={data??[]}/></main>}

