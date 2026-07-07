import { cookies } from "next/headers";
import { createHmac, scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { getDb } from "./db";
import type { User } from "./types";

const SECRET = process.env.SESSION_SECRET || "goalreal-dev-secret-change-me";
const COOKIE = "goalreal_session";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createSessionToken(userId: number): string {
  const payload = `${userId}.${Date.now() + 1000 * 60 * 60 * 24 * 30}`; // 30 days
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payload = `${parts[0]}.${parts[1]}`;
  if (sign(payload) !== parts[2]) return null;
  if (Number(parts[1]) < Date.now()) return null;
  return Number(parts[0]);
}

export function setSessionCookie(userId: number) {
  cookies().set(COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(COOKIE)?.value;
  const userId = verifySessionToken(token);
  if (!userId) return null;
  const db = getDb();
  return (await db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as User) || null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}
