import { NextResponse } from "next/server";
import { questionSchema } from "@/lib/validation/schemas";
import { answerQuestion } from "@/lib/rag/answer";
export const runtime="nodejs";
export async function POST(request:Request){const parsed=questionSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Enter a question between 3 and 2,000 characters."},{status:400});try{return NextResponse.json(await answerQuestion(parsed.data.question,parsed.data.documentIds));}catch(error){if(error instanceof Error&&error.message==="Unauthorized")return NextResponse.json({error:"Sign in to ask questions."},{status:401});return NextResponse.json({error:error instanceof Error?error.message:"Could not answer your question."},{status:502});}}

