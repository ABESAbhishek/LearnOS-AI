import { NextResponse } from "next/server";
import { testGeminiConnection } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await testGeminiConnection();
  return NextResponse.json(result);
}
