import { NextRequest, NextResponse } from "next/server";
import { testGeminiConnection } from "@/lib/gemini";
import { protectAPIRequest } from "@/lib/api-protection";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const protection = protectAPIRequest(request, { key: "gemini-test", limit: 3, maxBodyBytes: 0 });
  if (protection) {
    return NextResponse.json({ error: protection.message }, {
      status: protection.status,
      headers: protection.retryAfterSeconds ? { "Retry-After": String(protection.retryAfterSeconds) } : undefined,
    });
  }
  try {
    const result = await testGeminiConnection();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "AI provider status is unavailable." }, { status: 503 });
  }
}
