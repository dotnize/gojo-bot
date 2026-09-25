import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { isServerInfoConfigured, serverInfoChannelId } from "#/features/server-info/config.ts";
import { syncServerInfo } from "#/features/server-info/index.ts";
import { defineCommand } from "#/lib/commands.ts";

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName("server-info")
    .setDescription("Create or update the server information embeds.")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command only works in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!isServerInfoConfigured()) {
      await interaction.reply({
        content: "Set DISCORD_SERVER_INFO_CHANNEL_ID before syncing.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await syncServerInfo(interaction.client, interaction.guild);
    const action = result.created ? "Created" : "Updated";
    const duplicateNote =
      result.duplicates > 0
        ? ` I also found ${result.duplicates} duplicate message(s); delete those manually after checking them.`
        : "";

    await interaction.editReply(
      `${action} the [server info embeds](${result.message.url}) in <#${serverInfoChannelId}>.${duplicateNote}`,
    );
  },
});
