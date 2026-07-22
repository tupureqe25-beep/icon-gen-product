import { authenticateAccount, createAccount, createSession } from "@/lib/auth/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string; mode?: "login" | "register" };
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  try {
    const user = body.mode === "register" ? await createAccount(email, password) : await authenticateAccount(email, password);
    const session = await createSession(user.id);
    return Response.json(
      { user, message: body.mode === "register" ? "账号已创建并登录。" : "登录成功。" },
      { headers: { "Set-Cookie": session.header } },
    );
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "登录失败。" }, { status: 400 });
  }
}
