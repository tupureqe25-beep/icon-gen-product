import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const dataDirectory = path.join(process.cwd(), ".data");
const storePath = path.join(dataDirectory, "auth-store.json");
const developmentKeyPath = path.join(dataDirectory, ".encryption-key");
const sessionCookieName = "iconops_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

type EncryptedSecret = {
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
};

type AuthAccount = {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  figmaToken?: EncryptedSecret;
};

type AuthSession = {
  userId: string;
  createdAt: string;
  expiresAt: string;
};

type AuthStore = {
  accounts: AuthAccount[];
  sessions: Record<string, AuthSession>;
};

export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type FigmaCredentialStatus = {
  hasToken: boolean;
  maskedToken?: string;
};

let mutationQueue: Promise<void> = Promise.resolve();
let encryptionKey: Buffer | undefined;

function emptyStore(): AuthStore {
  return { accounts: [], sessions: {} };
}

async function readStore(): Promise<AuthStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AuthStore>;
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      sessions: parsed.sessions && typeof parsed.sessions === "object" ? parsed.sessions : {},
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: AuthStore) {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryPath = `${storePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, storePath);
}

async function updateStore<T>(mutator: (store: AuthStore) => Promise<T> | T): Promise<T> {
  let result!: T;
  const operation = mutationQueue.then(async () => {
    const store = await readStore();
    result = await mutator(store);
    await writeStore(store);
  });
  mutationQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  await operation;
  return result;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toAuthUser(account: AuthAccount): AuthUser {
  return { id: account.id, email: account.email, createdAt: account.createdAt };
}

async function getEncryptionKey() {
  if (encryptionKey) return encryptionKey;

  const configuredKey = process.env.ICONOPS_ENCRYPTION_KEY?.trim();
  if (configuredKey) {
    encryptionKey = createHash("sha256").update(configuredKey).digest();
    return encryptionKey;
  }

  try {
    encryptionKey = Buffer.from(await readFile(developmentKeyPath, "utf8"), "base64");
    if (encryptionKey.length === 32) return encryptionKey;
  } catch {}

  encryptionKey = randomBytes(32);
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(developmentKeyPath, encryptionKey.toString("base64"), { mode: 0o600 });
  return encryptionKey;
}

async function hashPassword(password: string, salt = randomBytes(16)) {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return {
    hash: derived.toString("base64"),
    salt: salt.toString("base64"),
  };
}

async function verifyPassword(password: string, account: AuthAccount) {
  const { hash } = await hashPassword(password, Buffer.from(account.passwordSalt, "base64"));
  const expected = Buffer.from(account.passwordHash, "base64");
  const actual = Buffer.from(hash, "base64");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function encryptSecret(value: string): Promise<EncryptedSecret> {
  const key = await getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

async function decryptSecret(value: EncryptedSecret) {
  if (value.algorithm !== "aes-256-gcm") return undefined;
  const key = await getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
}

function cookieHeader(token: string, maxAge = sessionMaxAgeSeconds) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookieHeader() {
  return cookieHeader("", 0);
}

export async function createAccount(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  if (!email.includes("@") || email.length < 5) throw new Error("请输入有效的邮箱地址。");
  if (password.length < 8) throw new Error("密码至少需要 8 位。");

  return updateStore(async (store) => {
    if (store.accounts.some((account) => account.email === email)) throw new Error("该邮箱已经注册，请直接登录。");
    const passwordData = await hashPassword(password);
    const account: AuthAccount = {
      id: `user-${randomBytes(12).toString("hex")}`,
      email,
      ...{ passwordHash: passwordData.hash, passwordSalt: passwordData.salt },
      createdAt: new Date().toISOString(),
    };
    store.accounts.push(account);
    return toAuthUser(account);
  });
}

export async function authenticateAccount(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  const store = await readStore();
  const account = store.accounts.find((candidate) => candidate.email === email);
  if (!account || !(await verifyPassword(password, account))) throw new Error("邮箱或密码不正确。");
  return toAuthUser(account);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionMaxAgeSeconds * 1000);
  await updateStore((store) => {
    store.sessions[hashSessionToken(token)] = {
      userId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  });
  return { token, header: cookieHeader(token) };
}

export async function revokeSession(request: Request) {
  const token = getCookieValue(request, sessionCookieName);
  if (token) {
    await updateStore((store) => {
      delete store.sessions[hashSessionToken(token)];
    });
  }
}

export async function getAuthenticatedAccount(request: Request) {
  const token = getCookieValue(request, sessionCookieName);
  if (!token) return undefined;

  const store = await readStore();
  const sessionKey = hashSessionToken(token);
  const session = store.sessions[sessionKey];
  if (!session) return undefined;
  if (Date.parse(session.expiresAt) <= Date.now()) {
    await updateStore((nextStore) => {
      delete nextStore.sessions[sessionKey];
    });
    return undefined;
  }

  return store.accounts.find((account) => account.id === session.userId);
}

export async function getAuthenticatedUser(request: Request) {
  const account = await getAuthenticatedAccount(request);
  return account ? toAuthUser(account) : undefined;
}

export async function saveFigmaToken(request: Request, token: string) {
  const account = await getAuthenticatedAccount(request);
  if (!account) return undefined;
  const encrypted = await encryptSecret(token);
  await updateStore((store) => {
    const target = store.accounts.find((candidate) => candidate.id === account.id);
    if (target) target.figmaToken = encrypted;
  });
  return { hasToken: true, maskedToken: maskToken(token) } satisfies FigmaCredentialStatus;
}

export async function getFigmaToken(request: Request) {
  const account = await getAuthenticatedAccount(request);
  if (!account?.figmaToken) return undefined;
  return decryptSecret(account.figmaToken);
}

export async function getFigmaCredentialStatus(request: Request): Promise<FigmaCredentialStatus> {
  const account = await getAuthenticatedAccount(request);
  if (!account?.figmaToken) return { hasToken: false };
  const token = await decryptSecret(account.figmaToken).catch(() => undefined);
  return token ? { hasToken: true, maskedToken: maskToken(token) } : { hasToken: false };
}

export async function clearFigmaToken(request: Request) {
  const account = await getAuthenticatedAccount(request);
  if (!account) return false;
  await updateStore((store) => {
    const target = store.accounts.find((candidate) => candidate.id === account.id);
    if (target) delete target.figmaToken;
  });
  return true;
}

export function maskToken(token: string) {
  if (token.length <= 12) return "已保存 Token";
  return `${token.slice(0, 8)}…${token.slice(-4)}`;
}

export { sessionCookieName };
