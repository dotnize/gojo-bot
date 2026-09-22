import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  type Message,
} from "discord.js";

import { createCatchUp } from "#/features/language-tools/catch-up.ts";
import { defineCommand } from "#/lib/commands.ts";

const defaultMessageCount = 25;

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName("catch-up")
    .setDescription("Summarize recent channel messages in English.")
    .setContexts(InteractionContextType.Guild)
    .addIntegerOption((option) =>
      option
        .setName("messages")
        .setDescription(`Number of recent messages to check (default: ${defaultMessageCount}).`)
        .setMinValue(10)
        .setMaxValue(50),
    ),

  async execute(interaction) {
    if (!interaction.inCachedGuild() || !interaction.channel?.isTextBased()) {
      await interaction.reply({
        content: "This command only works in a server text channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!("messages" in interaction.channel)) {
      await interaction.reply({
        content: "I can't read message history in this channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const requestedCount = interaction.options.getInteger("messages") ?? defaultMessageCount;
    const fetchedMessages = await interaction.channel.messages.fetch({ limit: requestedCount });
    const chronologicalMessages = [...fetchedMessages.values()].toSorted(
      (left, right) => left.createdTimestamp - right.createdTimestamp,
    ) as Message<true>[];
    let response: Awaited<ReturnType<typeof createCatchUp>>;

    try {
      response = await createCatchUp(chronologicalMessages);
    } catch (error) {
      if (error instanceof RangeError) {
        await interaction.editReply({ content: error.message });
        return;
      }

      throw error;
    }

    await interaction.editReply({
      embeds: response.embeds,
      components: response.components,
    });
  },
});
