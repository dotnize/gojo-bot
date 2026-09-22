import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  escapeMarkdown,
  MessageFlags,
  type ButtonInteraction,
  type Message,
} from "discord.js";

import { summarizeInEnglish, type TranscriptMessage } from "#/features/language-tools/ai.ts";
import { buildCatchUpEmbed } from "#/features/language-tools/embeds.ts";

export const shareCatchUpButtonId = "catch-up:share";

function toTranscriptMessage(message: Message<true>): TranscriptMessage | undefined {
  if (message.author.bot) {
    return undefined;
  }

  const text = message.cleanContent.trim();
  const attachments = message.attachments.map((attachment) => `[Attachment: ${attachment.name}]`);
  const content = [text, ...attachments].filter(Boolean).join("\n");

  if (!content) {
    return undefined;
  }

  return {
    author: message.member?.displayName ?? message.author.displayName,
    sentAt: message.createdAt.toISOString(),
    content,
  };
}

export async function createCatchUp(messages: readonly Message<true>[]): Promise<{
  readonly embeds: [ReturnType<typeof buildCatchUpEmbed>];
  readonly components: [ActionRowBuilder<ButtonBuilder>];
  readonly messageCount: number;
}> {
  const transcript = messages.map(toTranscriptMessage).filter((message) => message !== undefined);

  if (transcript.length === 0) {
    throw new RangeError("There are no readable human messages to summarize.");
  }

  const result = await summarizeInEnglish(transcript);
  const shareButton = new ButtonBuilder()
    .setCustomId(shareCatchUpButtonId)
    .setLabel("Share to channel")
    .setStyle(ButtonStyle.Secondary);

  return {
    embeds: [buildCatchUpEmbed(result, transcript.length)],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(shareButton)],
    messageCount: transcript.length,
  };
}

export async function handleShareCatchUp(interaction: ButtonInteraction): Promise<void> {
  if (interaction.customId !== shareCatchUpButtonId) {
    return;
  }

  if (!interaction.inGuild() || !interaction.channel?.isSendable()) {
    await interaction.reply({
      content: "I can't share the catch-up in this channel.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embeds = interaction.message.embeds.map((embed) => embed.toJSON());

  await interaction.update({ components: [] });
  await interaction.channel.send({
    content: `**Catch-up shared by ${escapeMarkdown(interaction.user.displayName)}**`,
    embeds,
    allowedMentions: { parse: [] },
  });
}
