import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { automatedCatchUpStateDirectory } from "#/features/automated-catch-up/config.ts";

export interface PendingCatchUp {
  readonly throughMessageId: string;
  readonly summary: string;
  readonly previousUrl: string | null;
}

export interface ChannelState {
  readonly version: 1;
  readonly lastProcessedMessageId: string;
  readonly previousCatchUpMessageId: string | null;
  readonly pending: PendingCatchUp | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMessageId(value: unknown): value is string {
  return typeof value === "string" && /^\d{17,20}$/u.test(value);
}

function isState(value: unknown): value is ChannelState {
  if (!isRecord(value)) {
    return false;
  }

  const pending = value.pending;
  return (
    value.version === 1 &&
    isMessageId(value.lastProcessedMessageId) &&
    (value.previousCatchUpMessageId === null || isMessageId(value.previousCatchUpMessageId)) &&
    (pending === null ||
      (isRecord(pending) &&
        isMessageId(pending.throughMessageId) &&
        BigInt(pending.throughMessageId) > BigInt(value.lastProcessedMessageId) &&
        typeof pending.summary === "string" &&
        pending.summary.length > 0 &&
        (pending.previousUrl === null || typeof pending.previousUrl === "string")))
  );
}

export async function readChannelState(channelId: string): Promise<ChannelState | undefined> {
  let content: string;
  try {
    content = await readFile(join(automatedCatchUpStateDirectory, `${channelId}.json`), "utf8");
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }

  const state: unknown = JSON.parse(content);
  if (!isState(state)) {
    // Never silently reset progress and risk duplicating summaries.
    throw new Error(`Invalid automated catch-up state for channel ${channelId}.`);
  }
  return state;
}

export async function saveChannelState(channelId: string, state: ChannelState): Promise<void> {
  await mkdir(automatedCatchUpStateDirectory, { recursive: true, mode: 0o700 });
  const path = join(automatedCatchUpStateDirectory, `${channelId}.json`);
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state)}\n`, { mode: 0o600 });
  await rename(temporaryPath, path);
}
