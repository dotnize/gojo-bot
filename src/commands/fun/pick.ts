import { randomInt } from "node:crypto";

import {
  EmbedBuilder,
  escapeMarkdown,
  heading,
  HeadingLevel,
  MessageFlags,
  SlashCommandBuilder,
  subtext,
} from "discord.js";

import { defineCommand } from "#/lib/commands.ts";

const pickColor = 0xf1c40f;
const errorColor = 0xed4245;

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName("pick")
    .setDescription("Pick one item from a list of choices.")
    .addStringOption((option) =>
      option
        .setName("choices")
        .setDescription("Two or more choices separated by commas.")
        .setMinLength(3)
        .setMaxLength(1_000)
        .setRequired(true),
    ),

  async execute(interaction) {
    const choices = interaction.options
      .getString("choices", true)
      .split(",")
      .map((choice) => choice.trim())
      .filter((choice) => choice.length > 0);

    if (choices.length < 2) {
      const embed = new EmbedBuilder()
        .setColor(errorColor)
        .setTitle("Not enough choices")
        .setDescription("Give me at least two choices separated by commas.");

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (choices.length > 25) {
      const embed = new EmbedBuilder()
        .setColor(errorColor)
        .setTitle("Too many choices")
        .setDescription("Keep the list to 25 choices or fewer.");

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const selectedIndex = randomInt(choices.length);
    const selectedChoice = escapeMarkdown(choices[selectedIndex] ?? "");
    const choiceList = [
      subtext("Choices"),
      ...choices.map((choice) => subtext(`- ${escapeMarkdown(choice)}`)),
    ].join("\n");
    const embed = new EmbedBuilder()
      .setColor(pickColor)
      .setDescription(
        [choiceList, heading(`🎲 Picked: ${selectedChoice}`, HeadingLevel.Two)].join("\n"),
      )
      .setFooter({ text: "Decision made." });

    await interaction.reply({
      embeds: [embed],
    });
  },
});
