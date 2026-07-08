import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  cookies().delete("goalreal_session");

  let baseUrl = process.env.APP_URL;
  if (!baseUrl) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    baseUrl = `${proto}://${host}`;
  }

  try {
    const parsed = new URL(baseUrl);
    if (parsed.hostname === "0.0.0.0") {
      const hostHeader = req.headers.get("host") || "localhost:3000";
      parsed.host = hostHeader;
    }
    baseUrl = parsed.origin;
  } catch {
    baseUrl = "http://localhost:3000";
  }

  return NextResponse.redirect(new URL("/login?logout=true", baseUrl));
}

