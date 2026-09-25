import { randomInt } from "node:crypto";

import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import { defineCommand } from "#/lib/commands.ts";

const fortuneColor = 0x9b59b6;

const fortunes = [
  "u will step on poop later. somehow, both shoes.",
  "a horse will drop on top of u. it will act like u started it.",
  "ur phone will die at 1% while ur charger watches.",
  "u will wave back at someone waving to the person behind u.",
  "the mosquito in ur room already knows ur schedule.",
  "ur next sneeze will disappear right when it gets good.",
  "u will open the fridge 4 times. same nothing, bestie.",
  "ur food will arrive the second u enter the bathroom.",
  "the chair will make a fart noise. nobody will believe u.",
  "u will step in a mystery puddle while wearing socks.",
  "ur alarm will go off on ur day off. very loyal of it.",
  "someone will say 'we need to talk' and then go offline.",
  "u will lose a fight with a plastic bag in public.",
  "ur sleeve will catch the door handle on the way out.",
  "one of ur slippers will disappear. just one, obviously.",
  "ur rice will be ready. the rest of dinner is still loading.",
  "u will accidentally call someone 'mom'. everyone will hear.",
  "u will pull on a push door. someone will be watching.",
  "ur sock will slide down inside ur shoe. it will stay there.",
  "ur delivery will tour the entire city before reaching u.",
  "the elevator will close while everyone inside makes eye contact with u.",
  "the last bite of ur snack will fall on the floor. the good side down.",
  "u will forget why u walked into the room. twice.",
  "ur autocorrect will choose violence in the group chat.",
] as const;

export default defineCommand({
  data: new SlashCommandBuilder().setName("fortune").setDescription("Receive a random fortune."),

  async execute(interaction) {
    const fortune = fortunes[randomInt(fortunes.length)] ?? fortunes[0];
    const embed = new EmbedBuilder()
      .setColor(fortuneColor)
      .setTitle("🍪 your fortune")
      .setDescription(fortune);

    await interaction.reply({ embeds: [embed] });
  },
});
