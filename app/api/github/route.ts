import { NextRequest, NextResponse } from "next/server";
import { getGitHubPortfolioData } from "@/src/lib/github-service";

export async function GET(req: NextRequest) {
  const forceFallback = req.nextUrl.searchParams.get("fallback") === "1";

  try {
    const payload = await getGitHubPortfolioData({ forceFallback });
    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": forceFallback
          ? "no-store"
          : "s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load GitHub portfolio data." },
      { status: 500 }
    );
  }
}
