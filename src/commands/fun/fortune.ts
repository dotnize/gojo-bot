import { randomInt } from "node:crypto";

import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import { defineCommand } from "#/lib/commands.ts";

const fortuneColor = 0x9b59b6;

const fortunes = [
  "A small win will find you when you least expect it.",
  "The next idea you almost dismiss is worth another look.",
  "Someone in the group is about to make your day better.",
  "A small detour will lead to something delightful.",
  "A quiet day will turn into a memorable one.",
  "An unfinished project is ready for one more try.",
  "Today favors bold ideas and bolder decisions.",
  "A pleasant surprise is hiding behind an ordinary plan.",
  "Share the good news; luck remembers generosity.",
  "The answer will arrive after a short break.",
  "Your current chaos will make sense soon.",
  "A forgotten favorite is due for a comeback.",
  "Trust your instincts, but check the details.",
  "A fresh start is closer than it looks.",
  "Someone will appreciate the message you nearly did not send.",
  "Your luck improves when you invite a friend along.",
  "The plan may change, but things will work out.",
  "A tiny victory is closer than it looks.",
  "You will soon discover a new favorite thing.",
  "Excellent vibes are heading your way.",
] as const;

export default defineCommand({
  data: new SlashCommandBuilder().setName("fortune").setDescription("Receive a random fortune."),

  async execute(interaction) {
    const fortune = fortunes[randomInt(fortunes.length)] ?? fortunes[0];
    const embed = new EmbedBuilder()
      .setColor(fortuneColor)
      .setTitle("🔮 Your Fortune")
      .setDescription(fortune);

    await interaction.reply({ embeds: [embed] });
  },
});
