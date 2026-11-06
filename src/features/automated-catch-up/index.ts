import {
  DiscordAPIError,
  PermissionFlagsBits,
  type Client,
  type Message,
  type SendableChannels,
} from "discord.js";

import { automatedCatchUpChannelIds } from "#/features/automated-catch-up/config.ts";
import {
  readChannelState,
  saveChannelState,
  type ChannelState,
  type PendingCatchUp,
} from "#/features/automated-catch-up/state.ts";
import {
  buildCatchUpEmbed,
  summarizeMessages,
  toTranscriptMessage,
  type TranscriptMessage,
} from "#/lib/catch-up.ts";

const batchSize = 70;
const retryIntervalMs = 60_000;
const maxRetryDelayMs = 15 * 60_000;
const automatedTitle = "Automated catch-up";

type CatchUpChannel = Extract<SendableChannels, { guildId: string }>;

interface BatchMessage {
  readonly id: string;
  readonly transcript: TranscriptMessage;
}

// Walk backwards to a fixed checkpoint, regardless of Discord's page ordering.
// Deleted checkpoints still work: snowflake comparisons establish the boundary.
async function* messagesSince(channel: CatchUpChannel, after: string): AsyncGenerator<Message> {
  let before: string | undefined;
  while (true) {
    const fetched = await channel.messages.fetch({
      ...(before ? { before } : {}),
      limit: batchSize,
      cache: false,
    });
    const messages = [...fetched.values()].sort((left, right) =>
      BigInt(left.id) > BigInt(right.id) ? -1 : 1,
    );
    for (const message of messages) {
      if (BigInt(message.id) <= BigInt(after)) {
        return;
      }
      yield message;
    }

    const oldest = messages.at(-1);
    if (!oldest || fetched.size < batchSize) {
      return;
    }
    before = oldest.id;
  }
}

async function getNextBatch(channel: CatchUpChannel, after: string): Promise<BatchMessage[]> {
  const batch: BatchMessage[] = [];
  for await (const message of messagesSince(channel, after)) {
    if (message.system || message.webhookId) {
      continue;
    }
    const transcript = toTranscriptMessage(message);
    if (transcript) {
      batch.push({ id: message.id, transcript });
      if (batch.length > batchSize) {
        batch.shift();
      }
    }
  }
  // Retain only the oldest 100 eligible messages, even after a long outage.
  return batch.reverse();
}

function getBoundaryUrl(channel: CatchUpChannel, throughMessageId: string): string {
  return `https://discord.com/channels/${channel.guildId}/${channel.id}/${throughMessageId}`;
}

async function getPreviousCatchUp(
  channel: CatchUpChannel,
  messageId: string | null,
  botId: string,
): Promise<Message | undefined> {
  if (!messageId) {
    return undefined;
  }
  try {
    const message = await channel.messages.fetch({ message: messageId, cache: false });
    return message.author.id === botId && message.embeds[0]?.title === automatedTitle
      ? message
      : undefined;
  } catch (error) {
    if (error instanceof DiscordAPIError && error.code === 10008) {
      return undefined;
    }
    throw error;
  }
}

async function publishCatchUp(
  channel: CatchUpChannel,
  pending: PendingCatchUp,
  botId: string,
): Promise<Message> {
  const boundaryUrl = getBoundaryUrl(channel, pending.throughMessageId);
  const boundaryField = {
    name: "Conversation",
    value: `[Jump to last summarized message](${boundaryUrl})`,
  };
  // Recover a successful send if the response or subsequent checkpoint write failed.
  // The source link identifies the batch; also recognize older posts with linked titles.
  for await (const message of messagesSince(channel, pending.throughMessageId)) {
    const embed = message.embeds[0];
    if (
      message.author.id === botId &&
      embed?.title === automatedTitle &&
      (embed.url === boundaryUrl ||
        embed.fields.some(
          (field) => field.name === boundaryField.name && field.value === boundaryField.value,
        ))
    ) {
      return message;
    }
  }

  const embed = buildCatchUpEmbed(pending.summary, batchSize, pending.previousUrl ?? undefined)
    .setTitle(automatedTitle)
    .addFields(boundaryField);
  return channel.send({
    embeds: [embed],
    allowedMentions: { parse: [] },
    nonce: pending.throughMessageId,
    enforceNonce: true,
  });
}

export class AutomatedCatchUp {
  private readonly client: Client;
  private readonly channelIds = new Set(automatedCatchUpChannelIds);
  private readonly queued = new Set<string>();
  private readonly messageCounts = new Map<string, number>();
  private readonly failures = new Map<string, { attempts: number; retryAt: number }>();
  private worker: Promise<void> | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private stopped = false;

  constructor(client: Client) {
    this.client = client;
    for (const channelId of this.channelIds) {
      if (!/^\d{17,20}$/u.test(channelId)) {
        throw new Error(`Invalid automated catch-up channel ID: ${channelId}`);
      }
    }
  }

  start(): void {
    if (this.channelIds.size === 0 || this.timer || this.stopped) {
      return;
    }
    const checkChannels = (): void => {
      for (const channelId of this.channelIds) {
        this.enqueue(channelId);
      }
    };
    checkChannels();
    // Also recovers missed events, downtime, partial batches, and failed requests.
    this.timer = setInterval(checkChannels, retryIntervalMs);
    this.timer.unref();
  }

  handleMessage(message: Message): void {
    if (
      this.stopped ||
      !message.inGuild() ||
      !this.channelIds.has(message.channelId) ||
      message.system ||
      message.webhookId ||
      !toTranscriptMessage(message)
    ) {
      return;
    }

    const count = (this.messageCounts.get(message.channelId) ?? 0) + 1;
    this.messageCounts.set(message.channelId, count);
    if (count >= batchSize) {
      this.enqueue(message.channelId);
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    clearInterval(this.timer);
    this.queued.clear();
    await this.worker;
  }

  private enqueue(channelId: string): void {
    if (this.stopped || (this.failures.get(channelId)?.retryAt ?? 0) > Date.now()) {
      return;
    }
    this.queued.add(channelId);
    this.worker ??= this.drain().finally(() => {
      this.worker = undefined;
    });
  }

  private async drain(): Promise<void> {
    // Serialize automatic AI requests across channels to avoid overlapping batches
    // and unnecessary bursts against the shared Gemini quota.
    while (!this.stopped && this.queued.size > 0) {
      const channelId = this.queued.values().next().value;
      if (!channelId) {
        return;
      }
      this.queued.delete(channelId);
      if ((this.failures.get(channelId)?.retryAt ?? 0) > Date.now()) {
        continue;
      }
      this.messageCounts.set(channelId, 0);
      try {
        const more = await this.processChannel(channelId);
        this.failures.delete(channelId);
        if (more && !this.stopped) {
          this.queued.add(channelId);
        }
      } catch (error) {
        const attempts = (this.failures.get(channelId)?.attempts ?? 0) + 1;
        const delay = Math.min(retryIntervalMs * 2 ** Math.min(attempts - 1, 4), maxRetryDelayMs);
        this.failures.set(channelId, { attempts, retryAt: Date.now() + delay });
        console.error(`Automated catch-up failed in channel ${channelId}; will retry:`, error);
      }
    }
  }

  private async processChannel(channelId: string): Promise<boolean> {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel || !channel.isSendable() || !channel.isTextBased() || channel.isDMBased()) {
      throw new Error(`Automated catch-up channel ${channelId} must be a sendable guild channel.`);
    }
    const botId = this.client.user?.id;
    if (!botId) {
      throw new Error("Automated catch-up requires a logged-in bot.");
    }

    const requiredPermissions = [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.EmbedLinks,
      channel.isThread()
        ? PermissionFlagsBits.SendMessagesInThreads
        : PermissionFlagsBits.SendMessages,
    ];
    if (!channel.permissionsFor(botId)?.has(requiredPermissions)) {
      throw new Error(`Missing permissions for automated catch-up in channel ${channelId}.`);
    }

    let state = await readChannelState(channelId);
    if (!state) {
      // Enabling a channel starts from now, without publishing its entire backlog.
      const recent = await channel.messages.fetch({ limit: 1, cache: false });
      await saveChannelState(channelId, {
        version: 1,
        lastProcessedMessageId: recent.first()?.id ?? channel.id,
        previousCatchUpMessageId: null,
        pending: null,
      });
      return false;
    }

    if (!state.pending) {
      const batch = await getNextBatch(channel, state.lastProcessedMessageId);
      const throughMessageId = batch.at(-1)?.id;
      if (batch.length < batchSize || !throughMessageId || this.stopped) {
        return false;
      }
      const previous = await getPreviousCatchUp(channel, state.previousCatchUpMessageId, botId);
      const summary = await summarizeMessages(
        `automated-catch-up:${channel.id}:${throughMessageId}`,
        batch.map((message) => message.transcript),
        previous?.embeds[0]?.description ?? undefined,
      );
      state = {
        ...state,
        pending: { throughMessageId, summary, previousUrl: previous?.url ?? null },
      };
      // Save generated output before sending, so publication retries don't spend
      // tokens again or lose the selected batch boundary across restarts.
      await saveChannelState(channelId, state);
    }

    if (this.stopped || !state.pending) {
      return false;
    }
    const published = await publishCatchUp(channel, state.pending, botId);
    const completed: ChannelState = {
      version: 1,
      lastProcessedMessageId: state.pending.throughMessageId,
      previousCatchUpMessageId: published.id,
      pending: null,
    };
    await saveChannelState(channelId, completed);
    return true;
  }
}
