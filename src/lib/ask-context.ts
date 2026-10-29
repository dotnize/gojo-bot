import { MessageType, type Message, type TextBasedChannel } from "discord.js";

import { getAiMessageText, getAiText } from "#/lib/ai.ts";

const recentMessageCount = 20;
const maxReplyDepth = 5;
const replyTextBudget = 16_000;
const recentTextBudget = 8_000;
const replyMessageTextLimit = 6_000;
const recentMessageTextLimit = 1_500;
const truncationNotice = "\n[message truncated]";

interface ContextMessage {
  readonly id: string;
  readonly authorId: string;
  readonly author: string;
  readonly isBot: boolean;
  readonly sentAt: string;
  readonly replyToMessageId: string | null;
  readonly text: string;
}

export interface AskContext {
  readonly replyChain: readonly ContextMessage[];
  readonly recentMessages: readonly ContextMessage[];
}

function getMessageText(message: Message): string {
  const embeds = message.embeds.map((embed) => {
    const text = [
      embed.author?.name,
      embed.title,
      embed.description,
      ...embed.fields.map((field) => `${field.name}: ${field.value}`),
      embed.footer?.text,
      embed.url,
      embed.image || embed.thumbnail ? "[embedded image; contents unavailable]" : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    return text ? `[embed]\n${getAiText(text, message.channel)}` : "";
  });

  return [getAiMessageText(message), ...embeds].filter(Boolean).join("\n");
}

function toContextMessages(
  messages: readonly Message[],
  textBudget: number,
  messageTextLimit: number,
): ContextMessage[] {
  const context: ContextMessage[] = [];
  let remaining = textBudget;

  // Inputs are nearest/newest first, so trimming keeps the most relevant messages.
  for (const message of messages) {
    if (remaining <= truncationNotice.length) {
      break;
    }

    if (message.system) {
      continue;
    }

    const text = getMessageText(message);

    if (!text) {
      continue;
    }

    const limit = Math.min(messageTextLimit, remaining);
    const excerpt =
      text.length > limit
        ? `${text.slice(0, limit - truncationNotice.length)}${truncationNotice}`
        : text;

    context.push({
      id: message.id,
      authorId: message.author.id,
      author: message.member?.displayName ?? message.author.displayName,
      isBot: message.author.bot,
      sentAt: message.createdAt.toISOString(),
      replyToMessageId:
        message.type === MessageType.Reply ? (message.reference?.messageId ?? null) : null,
      text: excerpt,
    });
    remaining -= excerpt.length;
  }

  return context.reverse();
}

async function getRecentMessages(channel: TextBasedChannel, before: string): Promise<Message[]> {
  if (!("messages" in channel)) {
    return [];
  }

  try {
    const messages = await channel.messages.fetch({
      before,
      limit: recentMessageCount,
      cache: false,
    });

    return [...messages.values()].sort(
      (left, right) => right.createdTimestamp - left.createdTimestamp,
    );
  } catch (error) {
    console.warn("Could not fetch recent messages for ask context:", error);
    return [];
  }
}

async function getReplyChain(channelId: string, repliedTo?: Message): Promise<Message[]> {
  const messages: Message[] = [];
  const visited = new Set<string>();
  let current = repliedTo;

  while (current && messages.length < maxReplyDepth) {
    if (current.channelId !== channelId || visited.has(current.id)) {
      break;
    }

    messages.push(current);
    visited.add(current.id);

    if (
      messages.length >= maxReplyDepth ||
      current.type !== MessageType.Reply ||
      !current.reference?.messageId ||
      current.reference.channelId !== channelId
    ) {
      break;
    }

    try {
      current = await current.fetchReference();
    } catch (error) {
      console.warn("Could not fetch an earlier reply for ask context:", error);
      break;
    }
  }

  return messages;
}

export async function getAskContext(
  channel: TextBasedChannel | null,
  before: string,
  repliedTo?: Message,
): Promise<AskContext> {
  if (!channel) {
    return { replyChain: [], recentMessages: [] };
  }

  const [recentMessages, replyChain] = await Promise.all([
    getRecentMessages(channel, before),
    getReplyChain(channel.id, repliedTo),
  ]);
  const replyIds = new Set(replyChain.map((message) => message.id));

  return {
    replyChain: toContextMessages(replyChain, replyTextBudget, replyMessageTextLimit),
    recentMessages: toContextMessages(
      recentMessages.filter((message) => !replyIds.has(message.id)),
      recentTextBudget,
      recentMessageTextLimit,
    ),
  };
}
