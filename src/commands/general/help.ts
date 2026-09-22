import {
  ApplicationCommandType,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { defineCommand, getCommandType } from "#/lib/commands.ts";

const helpColor = 0x5865f2;
const errorColor = 0xed4245;

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("List the available commands by category.")
    .addStringOption((option) =>
      option.setName("category").setDescription("Only show commands from this category."),
    ),

  async execute(interaction, commandRegistry) {
    const selectedCategory = interaction.options.getString("category")?.trim().toUpperCase();
    const commandsByCategory = Map.groupBy(commandRegistry.values(), (command) => command.category);
    const categories = [...commandsByCategory.keys()].sort((left, right) =>
      left.localeCompare(right),
    );

    if (selectedCategory && !commandsByCategory.has(selectedCategory)) {
      const embed = new EmbedBuilder()
        .setColor(errorColor)
        .setTitle("Unknown category")
        .setDescription(
          `There is no \`${selectedCategory}\` category. Choose from ${categories
            .map((category) => `\`${category}\``)
            .join(", ")}.`,
        );

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const visibleCategories = selectedCategory ? [selectedCategory] : categories;
    const fields = visibleCategories.map((category) => {
      const commands = commandsByCategory.get(category) ?? [];
      const value = commands
        .toSorted((left, right) => left.data.name.localeCompare(right.data.name))
        .map((command) => {
          const data = command.data.toJSON();
          const isMessageCommand = getCommandType(command) === ApplicationCommandType.Message;
          const invocation = isMessageCommand
            ? `Apps → ${command.data.name}`
            : `/${command.data.name}`;
          const description =
            command.helpDescription ?? ("description" in data ? data.description : undefined);

          return `- \`${invocation}\` — ${description ?? "No description available."}`;
        })
        .join("\n");

      return { name: category, value };
    });
    const commandCount = fields.reduce(
      (count, field) => count + (commandsByCategory.get(field.name)?.length ?? 0),
      0,
    );
    const embed = new EmbedBuilder()
      .setColor(helpColor)
      .setTitle(selectedCategory ? `${selectedCategory} Commands` : "Gojo Bot Commands")
      .setDescription(
        selectedCategory
          ? `Commands available in the \`${selectedCategory}\` category.`
          : "Here are all the commands I can help you with.",
      )
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(fields)
      .setFooter({ text: `${commandCount} command${commandCount === 1 ? "" : "s"} available` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
});
