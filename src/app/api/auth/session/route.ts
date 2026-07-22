import { getAuthenticatedUser, getFigmaCredentialStatus } from "@/lib/auth/store";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return Response.json({ authenticated: false, user: null, figma: { hasToken: false } });
  return Response.json({ authenticated: true, user, figma: await getFigmaCredentialStatus(request) });
}
