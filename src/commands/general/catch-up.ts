import { InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";

import { buildCatchUpEmbed, summarizeMessages, toTranscriptMessage } from "#/lib/catch-up.ts";
import { defineCommand } from "#/lib/commands.ts";
import { showShareablePreview } from "#/lib/share-preview.ts";

const defaultMessageCount = 50;

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName("catch-up")
    .setDescription("Summarize recent messages in English.")
    .setContexts(InteractionContextType.Guild)
    .addIntegerOption((option) =>
      option
        .setName("messages")
        .setDescription(`Number of recent messages to inspect (default: ${defaultMessageCount}).`)
        .setMinValue(5)
        .setMaxValue(100),
    ),

  async execute(interaction) {
    const channel = interaction.channel;

    if (!channel?.isTextBased() || !("messages" in channel) || !channel.isSendable()) {
      await interaction.reply({
        content: "I can't read message history in this channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const messageCount = interaction.options.getInteger("messages") ?? defaultMessageCount;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const fetchedMessages = await channel.messages.fetch({ limit: messageCount });
    const transcript = fetchedMessages
      .sorted((left, right) => left.createdTimestamp - right.createdTimestamp)
      .map(toTranscriptMessage)
      .filter((message) => message !== undefined);

    if (transcript.length === 0) {
      await interaction.editReply("I couldn't find any recent messages to summarize.");
      return;
    }

    const summary = await summarizeMessages(interaction.id, transcript);
    const embed = buildCatchUpEmbed(summary, transcript.length);

    await showShareablePreview(interaction, channel, embed);
  },
});
