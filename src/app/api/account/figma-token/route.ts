import { clearFigmaToken, getAuthenticatedUser, getFigmaCredentialStatus, saveFigmaToken } from "@/lib/auth/store";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return Response.json({ message: "请先登录。" }, { status: 401 });
  return Response.json({ user, figma: await getFigmaCredentialStatus(request) });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return Response.json({ message: "请先登录，再保存 Figma Token。" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { token?: string };
  const token = body.token?.trim() ?? "";
  if (token.length < 20) return Response.json({ message: "Figma Token 格式不完整。" }, { status: 400 });

  const figma = await saveFigmaToken(request, token);
  return Response.json({ user, figma, message: "Figma Token 已在后端加密保存。" });
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return Response.json({ message: "请先登录。" }, { status: 401 });
  await clearFigmaToken(request);
  return Response.json({ user, figma: { hasToken: false }, message: "已删除保存的 Figma Token。" });
}
