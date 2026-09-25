import {
  ChannelType,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { defineCommand } from "#/lib/commands.ts";

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Create or edit a bot-authored plain text message.")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a plain text message in a channel.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel in which to create the message.")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("content")
            .setDescription("The message text, with Discord markdown supported.")
            .setMaxLength(2000)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Edit a bot-authored plain text message in this or another channel.")
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
            .setDescription("The new message text, with Discord markdown supported.")
            .setMaxLength(2000)
            .setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The message's channel; defaults to the current channel.")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
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
    const channelId =
      subcommand === "create"
        ? interaction.options.getChannel("channel", true).id
        : (interaction.options.getChannel("channel")?.id ?? interaction.channelId);
    const channel = await interaction.guild.channels.fetch(channelId);

    if (
      !channel ||
      (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
    ) {
      await interaction.reply({
        content: "That channel cannot contain messages.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (subcommand === "create") {
      const message = await channel.send({ content, allowedMentions: { parse: [] } });
      console.log(
        `/say create by ${interaction.user.tag} (${interaction.user.id}): ${message.url}`,
      );

      await interaction.reply({
        content: `Created [message](${message.url}) in <#${channel.id}>.`,
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

    if (message.embeds.length > 0) {
      await interaction.reply({
        content: "I can only edit plain text messages with `/say`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await message.edit({ content, allowedMentions: { parse: [] } });
    console.log(`/say edit by ${interaction.user.tag} (${interaction.user.id}): ${message.url}`);
    await interaction.reply({
      content: `Updated [message](${message.url}).`,
      flags: MessageFlags.Ephemeral,
    });
  },
});
