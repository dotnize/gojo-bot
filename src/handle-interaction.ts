import { MessageFlags, type Interaction } from "discord.js";

import { handleShareCatchUp, shareCatchUpButtonId } from "#/features/language-tools/catch-up.ts";
import {
  getRegisteredCommand,
  isChatInputCommand,
  isMessageCommand,
  type CommandRegistry,
} from "#/lib/commands.ts";

export async function handleInteraction(
  interaction: Interaction,
  commandRegistry: CommandRegistry,
): Promise<void> {
  if (interaction.isButton()) {
    if (interaction.customId !== shareCatchUpButtonId) {
      return;
    }

    try {
      await handleShareCatchUp(interaction);
    } catch (error) {
      console.error("Failed to share a catch-up:", error);

      const response = {
        content: "I couldn't share that catch-up. Please try again.",
        flags: MessageFlags.Ephemeral,
      } as const;

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(response);
      } else {
        await interaction.reply(response);
      }
    }

    return;
  }

  if (!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand()) {
    return;
  }

  const command = getRegisteredCommand(
    commandRegistry,
    interaction.commandType,
    interaction.commandName,
  );

  if (!command) {
    console.error(
      `No command handler found for ${interaction.commandName} (${interaction.commandType}).`,
    );
    return;
  }

  try {
    if (interaction.isChatInputCommand() && isChatInputCommand(command)) {
      await command.execute(interaction, commandRegistry);
    } else if (interaction.isMessageContextMenuCommand() && isMessageCommand(command)) {
      await command.execute(interaction, commandRegistry);
    } else {
      throw new TypeError(`Command handler type does not match ${interaction.commandName}.`);
    }
  } catch (error) {
    console.error(`Failed to execute ${interaction.commandName}:`, error);

    const response = {
      content: "Something went wrong while running that command.",
      flags: MessageFlags.Ephemeral,
    } as const;

    if (interaction.replied) {
      await interaction.followUp(response);
    } else if (interaction.deferred) {
      await interaction.editReply({ content: response.content });
    } else {
      await interaction.reply(response);
    }
  }
}
