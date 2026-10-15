"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authSchema } from "@/lib/validation/schemas";
export async function signIn(formData:FormData){const parsed=authSchema.safeParse({email:formData.get("email"),password:formData.get("password")});if(!parsed.success)redirect("/login?error=Enter+a+valid+email+and+password+of+at+least+8+characters.");const supabase=await createClient();const {error}=await supabase.auth.signInWithPassword(parsed.data);if(error)redirect("/login?error=Unable+to+sign+in.+Check+your+details+and+try+again.");redirect("/dashboard");}
export async function signUp(formData:FormData){const parsed=authSchema.safeParse({email:formData.get("email"),password:formData.get("password")});if(!parsed.success)redirect("/signup?error=Enter+a+valid+email+and+password+of+at+least+8+characters.");const supabase=await createClient();const {error}=await supabase.auth.signUp(parsed.data);if(error)redirect("/signup?error=Unable+to+create+account.+Try+again+later.");redirect("/login?message=Check+your+email+to+confirm+your+account.");}
export async function signOut(){const supabase=await createClient();await supabase.auth.signOut();redirect("/");}

