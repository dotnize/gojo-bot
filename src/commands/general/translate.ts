import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  InteractionContextType,
  MessageFlags,
} from "discord.js";

import { translateToEnglish } from "#/features/language-tools/ai.ts";
import { buildTranslationEmbed } from "#/features/language-tools/embeds.ts";
import { defineMessageCommand } from "#/lib/commands.ts";

export default defineMessageCommand({
  data: new ContextMenuCommandBuilder()
    .setName("Translate")
    .setType(ApplicationCommandType.Message)
    .setContexts(InteractionContextType.Guild),
  helpDescription: "Privately translate a selected message into English.",

  async execute(interaction) {
    const message = interaction.targetMessage.content.trim();

    if (!message) {
      await interaction.reply({
        content: "That message doesn't contain text I can translate.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await translateToEnglish(message);
    await interaction.editReply({ embeds: [buildTranslationEmbed(result)] });
  },
});
