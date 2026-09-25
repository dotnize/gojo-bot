import { Client, Events, GatewayIntentBits, Partials } from "discord.js";

import { handleAskMessage } from "#/commands/general/ask.ts";
import { getBotConfig } from "#/config.ts";
import { handleReactionRoleChange } from "#/features/reaction-roles/index.ts";
import { handleInteraction } from "#/handle-interaction.ts";
import { createCommandRegistry, loadCommands } from "#/lib/commands.ts";

const { memberRoleId, token } = getBotConfig();
const commandRegistry = createCommandRegistry(await loadCommands());
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.User, Partials.Channel, Partials.Message, Partials.Reaction],
});

client.once(Events.ClientReady, (readyClient) => {
  console.info(`Ready as ${readyClient.user.tag}.`);
});

client.on(Events.GuildMemberAdd, (member) => {
  if (member.user.bot) {
    return;
  }

  void member.roles
    .add(memberRoleId, "Automatically assigned member role on join")
    .catch((error: unknown) => {
      console.error(`Failed to assign the member role to ${member.user.id}:`, error);
    });
});

client.on(Events.InteractionCreate, (interaction) => {
  void handleInteraction(interaction, commandRegistry).catch((error: unknown) => {
    console.error("Failed to handle an interaction:", error);
  });
});

client.on(Events.MessageCreate, (message) => {
  void handleAskMessage(message).catch((error: unknown) => {
    console.error("Failed to handle an ask message:", error);
  });
});

client.on(Events.MessageReactionAdd, (reaction, user) => {
  void handleReactionRoleChange(reaction, user, true).catch((error: unknown) => {
    console.error("Failed to add a reaction role:", error);
  });
});

client.on(Events.MessageReactionRemove, (reaction, user) => {
  void handleReactionRoleChange(reaction, user, false).catch((error: unknown) => {
    console.error("Failed to remove a reaction role:", error);
  });
});

async function shutDown(signal: NodeJS.Signals): Promise<void> {
  console.info(`Received ${signal}; disconnecting.`);
  await client.destroy();
}

function handleShutDownSignal(signal: NodeJS.Signals): void {
  void shutDown(signal).catch((error: unknown) => {
    console.error("Failed to disconnect cleanly:", error);
    process.exitCode = 1;
  });
}

process.once("SIGINT", () => handleShutDownSignal("SIGINT"));
process.once("SIGTERM", () => handleShutDownSignal("SIGTERM"));

await client.login(token);
