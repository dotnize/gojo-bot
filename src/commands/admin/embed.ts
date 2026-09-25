import {
  ChannelType,
  EmbedBuilder,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { isReactionRolePanelMessage } from "#/features/reaction-roles/index.ts";
import { isServerInfoMessage } from "#/features/server-info/index.ts";
import { defineCommand } from "#/lib/commands.ts";

const embedColor = 0x5865f2;

function buildEmbed(content: string, title: string | null, footer: string | null): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(embedColor).setDescription(content);
  if (title !== null) embed.setTitle(title);
  if (footer !== null) embed.setFooter({ text: footer });
  return embed;
}

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Create or edit a bot-authored embed.")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create an embed in a channel.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel in which to create the embed.")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("content")
            .setDescription("The embed description, with Discord markdown supported.")
            .setMaxLength(4096)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("title").setDescription("The embed title.").setMaxLength(256),
        )
        .addStringOption((option) =>
          option.setName("footer").setDescription("The embed footer.").setMaxLength(2048),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Edit a bot-authored embed in this or another channel.")
        .addStringOption((option) =>
          option
            .setName("message-id")
            .setDescription("The ID of the message to edit.")
            .setMinLength(17)
            .setMaxLength(20)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("content")
            .setDescription("The new embed description, with Discord markdown supported.")
            .setMaxLength(4096)
            .setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The message's channel; defaults to the current channel.")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        )
        .addStringOption((option) =>
          option.setName("title").setDescription("The new embed title.").setMaxLength(256),
        )
        .addStringOption((option) =>
          option.setName("footer").setDescription("The new embed footer.").setMaxLength(2048),
        ),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command only works in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const content = interaction.options.getString("content", true);
    const title = interaction.options.getString("title");
    const footer = interaction.options.getString("footer");

    if (subcommand === "create") {
      const channelId = interaction.options.getChannel("channel", true).id;
      const channel = await interaction.guild.channels.fetch(channelId);

      if (
        !channel ||
        (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
      ) {
        await interaction.reply({
          content: "That channel cannot contain embeds.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const message = await channel.send({ embeds: [buildEmbed(content, title, footer)] });
      console.log(
        `/embed create by ${interaction.user.tag} (${interaction.user.id}): ${message.url}`,
      );

      await interaction.reply({
        content: `Created [embed](${message.url}) in <#${channel.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const selectedChannelId =
      interaction.options.getChannel("channel")?.id ?? interaction.channelId;
    const channel = await interaction.guild.channels.fetch(selectedChannelId);

    if (
      !channel ||
      (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
    ) {
      await interaction.reply({
        content: "That channel cannot contain embeds.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const messageId = interaction.options.getString("message-id", true);
    const message = await channel.messages.fetch(messageId);

    if (message.author.id !== interaction.client.user.id) {
      await interaction.reply({
        content: "I can only edit messages authored by this bot.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (isReactionRolePanelMessage(message)) {
      await interaction.reply({
        content:
          "Reaction-role panels are generated from configuration. Use `/reaction-roles` instead.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (isServerInfoMessage(message)) {
      await interaction.reply({
        content:
          "The server info embed is generated from configuration. Use `/server-info` instead.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await message.edit({ content: null, embeds: [buildEmbed(content, title, footer)] });
    console.log(`/embed edit by ${interaction.user.tag} (${interaction.user.id}): ${message.url}`);
    await interaction.reply({
      content: `Updated [embed](${message.url}).`,
      flags: MessageFlags.Ephemeral,
    });
  },
});
