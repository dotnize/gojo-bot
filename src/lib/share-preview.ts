import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  type ChatInputCommandInteraction,
  type EmbedBuilder,
  type MessageContextMenuCommandInteraction,
  type SendableChannels,
} from "discord.js";

const shareTimeoutMs = 14 * 60 * 1_000;

export async function showShareablePreview(
  interaction: ChatInputCommandInteraction | MessageContextMenuCommandInteraction,
  channel: SendableChannels,
  embed: EmbedBuilder,
): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("share-preview")
      .setLabel("Share")
      .setStyle(ButtonStyle.Primary),
  );
  const preview = await interaction.editReply({ embeds: [embed], components: [row] });
  const collector = preview.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: Math.max(1, shareTimeoutMs - (Date.now() - interaction.createdTimestamp)),
  });
  let sharing = false;

  collector.on("collect", async (button) => {
    if (button.user.id !== interaction.user.id) {
      await button.reply({
        content: "Only the person who requested this can share it.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sharing) {
      await button.reply({
        content: "This preview is already being shared.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    sharing = true;
    try {
      await button.update({ components: [] });
    } catch (error) {
      console.error("Failed to acknowledge the Share button:", error);
      collector.stop("failed");
      return;
    }

    try {
      const published = await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
      collector.stop("shared");
      await button
        .editReply({ content: `Shared in this channel: ${published.url}` })
        .catch((error: unknown) => console.error("Failed to confirm the shared preview:", error));
    } catch (error) {
      console.error("Failed to share a preview:", error);
      collector.stop("failed");
      await button
        .editReply({
          content:
            "I couldn't share this in the channel. Check my Send Messages and Embed Links permissions.",
        })
        .catch((editError: unknown) =>
          console.error("Failed to update the private preview:", editError),
        );
    }
  });

  collector.on("end", (_collected, reason) => {
    if (reason === "time") {
      void interaction
        .editReply({
          content: "The Share button expired. Run the command again to share a new result.",
          components: [],
        })
        .catch((error: unknown) => console.error("Failed to expire the Share button:", error));
    }
  });
}
