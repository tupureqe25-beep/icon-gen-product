import type { BatchFigmaWriteItem, FigmaTarget, FigmaWriteJob, FigmaWriteJobResult, FigmaWriteJobStatus } from "@/lib/icon-contract/types";

type CreateJobInput = {
  origin: string;
  target?: FigmaTarget;
  items: BatchFigmaWriteItem[];
  batchRunId?: string;
};

type UpdateJobInput = {
  status?: FigmaWriteJobStatus;
  result?: FigmaWriteJobResult;
  error?: string;
};

type JobGlobal = typeof globalThis & {
  __iconopsFigmaWriteJobs?: Map<string, FigmaWriteJob>;
  __iconopsFigmaBridgeStatus?: FigmaBridgeStatus;
};

export type FigmaBridgeStatus = {
  online: boolean;
  bridgeVersion?: string;
  lastSeenAt?: string;
  serverUrl?: string;
  fileName?: string;
  pageName?: string;
  listening?: boolean;
};

const globalStore = globalThis as JobGlobal;

function getStore() {
  globalStore.__iconopsFigmaWriteJobs ??= new Map<string, FigmaWriteJob>();
  return globalStore.__iconopsFigmaWriteJobs;
}

function createId() {
  return `figma-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createFigmaWriteJob(input: CreateJobInput) {
  const now = new Date().toISOString();
  const id = createId();
  const origin = input.origin.replace(/\/$/, "");
  const job: FigmaWriteJob = {
    id,
    createdAt: now,
    updatedAt: now,
    status: "queued",
    target: input.target,
    itemCount: input.items.length,
    items: input.items,
    batchRunId: input.batchRunId,
    pluginPullUrl: `${origin}/api/figma-write-jobs/${id}`,
  };

  getStore().set(id, job);
  return job;
}

export function getFigmaWriteJob(id: string) {
  return getStore().get(id);
}

export function listFigmaWriteJobs() {
  return Array.from(getStore().values()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getLatestFigmaWriteJob() {
  return listFigmaWriteJobs()[0];
}

export function updateFigmaWriteJob(id: string, input: UpdateJobInput) {
  const existing = getStore().get(id);
  if (!existing) return undefined;

  const next: FigmaWriteJob = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };

  getStore().set(id, next);
  return next;
}

export function updateFigmaBridgeStatus(input: Omit<FigmaBridgeStatus, "online" | "lastSeenAt">) {
  const status: FigmaBridgeStatus = {
    online: true,
    lastSeenAt: new Date().toISOString(),
    ...input,
  };
  globalStore.__iconopsFigmaBridgeStatus = status;
  return status;
}

export function getFigmaBridgeStatus(): FigmaBridgeStatus {
  const status = globalStore.__iconopsFigmaBridgeStatus;
  if (!status?.lastSeenAt) return { online: false };

  const lastSeenTime = new Date(status.lastSeenAt).getTime();
  const online = Number.isFinite(lastSeenTime) && Date.now() - lastSeenTime < 8000;

  return {
    ...status,
    online,
  };
}
