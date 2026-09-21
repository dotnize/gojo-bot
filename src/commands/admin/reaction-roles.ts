import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import {
  getReactionRoleConfigurationProblems,
  reactionRolesChannelId,
} from "#/features/reaction-roles/config.ts";
import { syncReactionRolePanels } from "#/features/reaction-roles/index.ts";
import { defineCommand } from "#/lib/commands.ts";

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName("reaction-roles")
    .setDescription("Create or update the server's reaction-role panels.")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command only works in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const problems = getReactionRoleConfigurationProblems();

    if (problems.length > 0) {
      await interaction.reply({
        content: `Complete the environment and role configuration before syncing: ${problems.join(", ")}.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await syncReactionRolePanels(interaction.client, interaction.guild);
    const duplicateNote =
      result.duplicates > 0
        ? ` I also found ${result.duplicates} duplicate panel(s); delete those manually after checking them.`
        : "";

    await interaction.editReply(
      `Synced <#${reactionRolesChannelId}>: created ${result.created}, updated ${result.updated}.${duplicateNote}`,
    );
  },
});
