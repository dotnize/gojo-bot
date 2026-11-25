import {
  ChannelType,
  DiscordAPIError,
  EmbedBuilder,
  PermissionFlagsBits,
  ThreadAutoArchiveDuration,
  type AnyThreadChannel,
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
  summarizeAutomatedCatchUp,
  toTranscriptMessage,
  type TranscriptMessage,
} from "#/lib/catch-up.ts";

const batchSize = 70;
const retryIntervalMs = 60_000;
const maxRetryDelayMs = 15 * 60_000;
const automatedTitle = "Automated catch-up";
const starterFooter = "Open the thread for the full catch-up • AI summaries can make mistakes.";
const threadNameLimit = 100;
const embedColor = 0x5865f2;

type CatchUpChannel = Extract<SendableChannels, { guildId: string }>;
type ThreadParentChannel = Extract<
  CatchUpChannel,
  { type: ChannelType.GuildText | ChannelType.GuildAnnouncement }
>;

function canHostThreads(channel: CatchUpChannel): channel is ThreadParentChannel {
  return channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement;
}

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
  // Retain only the oldest `batchSize` eligible messages, even after a long outage.
  return batch.reverse();
}

function getBoundaryUrl(channel: CatchUpChannel, throughMessageId: string): string {
  return `https://discord.com/channels/${channel.guildId}/${channel.id}/${throughMessageId}`;
}

async function findPublishedMessage(
  channel: CatchUpChannel,
  pending: PendingCatchUp,
  boundaryValue: string,
  botId: string,
): Promise<Message | undefined> {
  // Recover a successful send if the response or subsequent checkpoint write failed.
  // The boundary link identifies the batch.
  for await (const message of messagesSince(channel, pending.throughMessageId)) {
    const embed = message.embeds[0];
    if (
      message.author.id === botId &&
      embed?.title === automatedTitle &&
      embed.fields.some((field) => field.value === boundaryValue)
    ) {
      return message;
    }
  }
  return undefined;
}

function getThreadName(pending: PendingCatchUp, starter: Message): string {
  const date = starter.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const name = pending.title ? `${pending.title} · ${date}` : `Catch-up · ${date}`;
  return name.length <= threadNameLimit ? name : `${name.slice(0, threadNameLimit - 1)}…`;
}

async function getOrStartThread(
  channel: ThreadParentChannel,
  starter: Message,
  name: string,
): Promise<AnyThreadChannel> {
  // Threads started from a message share its ID, so a retry can find an earlier one.
  try {
    const existing = await channel.threads.fetch(starter.id);
    if (existing) {
      return existing;
    }
  } catch (error) {
    if (!(error instanceof DiscordAPIError && error.code === 10003)) {
      throw error;
    }
  }
  return starter.startThread({ name, autoArchiveDuration: ThreadAutoArchiveDuration.OneHour });
}

async function ensureThreadCatchUp(
  thread: AnyThreadChannel,
  embed: EmbedBuilder,
  nonce: string,
  botId: string,
): Promise<void> {
  // The catch-up is the first reply, so check the oldest messages even if people replied since.
  const messages = await thread.messages.fetch({ after: thread.id, limit: 10, cache: false });
  const sent = messages.some(
    (message) => message.author.id === botId && message.embeds[0]?.title === automatedTitle,
  );
  if (!sent) {
    // Sending also unarchives the thread if it was archived during a long retry.
    await thread.send({
      embeds: [embed],
      allowedMentions: { parse: [] },
      nonce,
      enforceNonce: true,
    });
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
  const fullEmbed = buildCatchUpEmbed(pending.summary, batchSize, pending.previousUrl ?? undefined)
    .setTitle(automatedTitle)
    .addFields(boundaryField);
  const published = await findPublishedMessage(channel, pending, boundaryField.value, botId);

  // Threads can't nest, and some channel types can't host them: post in full there.
  if (!canHostThreads(channel)) {
    return (
      published ??
      channel.send({
        embeds: [fullEmbed],
        allowedMentions: { parse: [] },
        nonce: pending.throughMessageId,
        enforceNonce: true,
      })
    );
  }

  const starter =
    published ??
    (await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(automatedTitle)
          .setDescription(pending.tldr || `Caught up on the last ${batchSize} messages.`)
          .addFields(boundaryField)
          .setFooter({ text: starterFooter }),
      ],
      allowedMentions: { parse: [] },
      nonce: pending.throughMessageId,
      enforceNonce: true,
    }));
  const thread = await getOrStartThread(channel, starter, getThreadName(pending, starter));
  await ensureThreadCatchUp(thread, fullEmbed, `${pending.throughMessageId}t`, botId);
  return starter;
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
    // and unnecessary bursts against the shared AI quota.
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
      ...(channel.isThread()
        ? [PermissionFlagsBits.SendMessagesInThreads]
        : [PermissionFlagsBits.SendMessages]),
      ...(canHostThreads(channel)
        ? [PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.SendMessagesInThreads]
        : []),
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
        previous: null,
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
      const result = await summarizeAutomatedCatchUp(
        `automated-catch-up:${channel.id}:${throughMessageId}`,
        batch.map((message) => message.transcript),
        state.previous?.summary,
      );
      state = {
        ...state,
        pending: { throughMessageId, ...result, previousUrl: state.previous?.url ?? null },
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
      previous: { summary: state.pending.summary, url: published.url },
      pending: null,
    };
    await saveChannelState(channelId, completed);
    return true;
  }
}
