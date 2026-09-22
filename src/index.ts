import { Client, Events, GatewayIntentBits, Partials } from "discord.js";

import { handleAskMention } from "#/commands/general/ask.ts";
import { getBotConfig } from "#/config.ts";
import { handleReactionRoleChange } from "#/features/reaction-roles/index.ts";
import { handleInteraction } from "#/handle-interaction.ts";
import { createCommandRegistry, loadCommands } from "#/lib/commands.ts";

const { token } = getBotConfig();
const commandRegistry = createCommandRegistry(await loadCommands());
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.User, Partials.Channel, Partials.Message, Partials.Reaction],
});

client.once(Events.ClientReady, (readyClient) => {
  console.info(`Ready as ${readyClient.user.tag}.`);
});

client.on(Events.InteractionCreate, (interaction) => {
  void handleInteraction(interaction, commandRegistry).catch((error: unknown) => {
    console.error("Failed to handle an interaction:", error);
  });
});

client.on(Events.MessageCreate, (message) => {
  void handleAskMention(message).catch((error: unknown) => {
    console.error("Failed to handle a mention:", error);
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
