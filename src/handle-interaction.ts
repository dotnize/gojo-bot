import { MessageFlags, type Interaction } from "discord.js";

import {
  getChatInputCommandKey,
  getMessageCommandKey,
  type CommandRegistry,
} from "#/lib/commands.ts";

export async function handleInteraction(
  interaction: Interaction,
  commandRegistry: CommandRegistry,
): Promise<void> {
  if (!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand()) {
    return;
  }

  const commandKey = interaction.isChatInputCommand()
    ? getChatInputCommandKey(interaction.commandName)
    : getMessageCommandKey(interaction.commandName);
  const command = commandRegistry.get(commandKey);

  if (!command) {
    console.error(`No command handler found for ${commandKey}.`);
    return;
  }

  try {
    if (interaction.isChatInputCommand() && command.kind === "chatInput") {
      await command.execute(interaction, commandRegistry);
    } else if (interaction.isMessageContextMenuCommand() && command.kind === "message") {
      await command.execute(interaction, commandRegistry);
    } else {
      throw new TypeError(`Command handler type mismatch for ${commandKey}.`);
    }
  } catch (error) {
    console.error(`Failed to execute ${commandKey}:`, error);

    const response = {
      content: "Something went wrong while running that command.",
      flags: MessageFlags.Ephemeral,
    } as const;

    if (interaction.deferred) {
      await interaction.editReply({ content: response.content, embeds: [] });
    } else if (interaction.replied) {
      await interaction.followUp(response);
    } else {
      await interaction.reply(response);
    }
  }
}
