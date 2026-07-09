import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/home", "/communities", "/profile", "/analytics", "/coach", "/notifications", "/post"];
const COOKIE = "goalreal_session";
const SECRET = process.env.SESSION_SECRET || "goalreal-dev-secret-change-me";

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [userId, expiry, sig] = parts;
  const exp = Number(expiry);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  if (!userId || Number.isNaN(Number(userId))) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${userId}.${expiry}`));
    return base64url(mac) === sig;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const token = req.cookies.get(COOKIE)?.value;
  const hasValid = await isValidToken(token);

  if (isProtected && !hasValid) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (token) url.searchParams.set("logout", "true");
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete(COOKIE);
    return res;
  }

  if ((pathname === "/login" || pathname === "/") && hasValid) {
    if (req.nextUrl.searchParams.has("logout")) {
      const res = NextResponse.next();
      res.cookies.delete(COOKIE);
      return res;
    }
    const url = req.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  if (token && !hasValid && (pathname === "/login" || pathname === "/")) {
    const res = NextResponse.next();
    res.cookies.delete(COOKIE);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|seed|uploads|api).*)"],
};
