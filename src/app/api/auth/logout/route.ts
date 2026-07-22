import { clearSessionCookieHeader, revokeSession } from "@/lib/auth/store";

export async function POST(request: Request) {
  await revokeSession(request);
  return Response.json({ authenticated: false }, { headers: { "Set-Cookie": clearSessionCookieHeader() } });
}
