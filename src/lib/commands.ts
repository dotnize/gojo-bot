import { readdir } from "node:fs/promises";

import { ApplicationCommandType } from "discord.js";
import type {
  ChatInputCommandInteraction,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

export interface ChatInputCommandDefinition {
  readonly kind: "chatInput";
  readonly data: Pick<SlashCommandBuilder, "name" | "toJSON">;
  readonly helpDescription?: string;
  execute(
    interaction: ChatInputCommandInteraction,
    commandRegistry: CommandRegistry,
  ): Promise<void>;
}

export interface MessageCommandDefinition {
  readonly kind: "message";
  readonly data: Pick<ContextMenuCommandBuilder, "name" | "toJSON">;
  readonly helpDescription: string;
  execute(
    interaction: MessageContextMenuCommandInteraction,
    commandRegistry: CommandRegistry,
  ): Promise<void>;
}

export type CommandDefinition = ChatInputCommandDefinition | MessageCommandDefinition;

export type Command = CommandDefinition & {
  readonly category: string;
};

/**
 * Defines a command while contextually typing its execute callback.
 */
export function defineCommand(
  command: Omit<ChatInputCommandDefinition, "kind">,
): ChatInputCommandDefinition {
  return { ...command, kind: "chatInput" };
}

/**
 * Defines a message context-menu command while contextually typing its execute callback.
 */
export function defineMessageCommand(
  command: Omit<MessageCommandDefinition, "kind">,
): MessageCommandDefinition {
  return { ...command, kind: "message" };
}

export type CommandRegistry = ReadonlyMap<string, Command>;

const commandsDirectory = new URL("../commands/", import.meta.url);

function isCommandDefinition(value: unknown): value is CommandDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const command = value as Partial<CommandDefinition>;

  const kindIsValid = command.kind === "chatInput" || command.kind === "message";

  return (
    kindIsValid &&
    typeof command.data?.name === "string" &&
    typeof command.data.toJSON === "function" &&
    typeof command.execute === "function"
  );
}

/**
 * Loads command modules one level below src/commands. The containing directory is the category.
 */
export async function loadCommands(): Promise<readonly Command[]> {
  const categoryDirectories = (await readdir(commandsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));

  const commandsByCategory = await Promise.all(
    categoryDirectories.map(async (directory) => {
      const categoryDirectory = new URL(`${directory.name}/`, commandsDirectory);
      const commandFiles = (await readdir(categoryDirectory, { withFileTypes: true }))
        .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
        .sort((left, right) => left.name.localeCompare(right.name));

      return Promise.all(
        commandFiles.map(async (file): Promise<Command> => {
          const commandUrl = new URL(file.name, categoryDirectory);
          const commandModule = (await import(commandUrl.href)) as { default?: unknown };

          if (!isCommandDefinition(commandModule.default)) {
            throw new TypeError(
              `${directory.name}/${file.name} must default-export a valid command.`,
            );
          }

          return {
            ...commandModule.default,
            category: directory.name.toUpperCase(),
          };
        }),
      );
    }),
  );
  const commands = commandsByCategory.flat();

  // Validate duplicate names for every consumer, including the deployment script.
  createCommandRegistry(commands);

  return commands;
}

export function createCommandRegistry(commands: readonly Command[]): CommandRegistry {
  const registry = new Map<string, Command>();

  for (const command of commands) {
    const key =
      command.kind === "chatInput"
        ? getChatInputCommandKey(command.data.name)
        : getMessageCommandKey(command.data.name);

    if (registry.has(key)) {
      throw new Error(`Duplicate command: ${key}`);
    }

    registry.set(key, command);
  }

  return registry;
}

export function getCommandKey(type: ApplicationCommandType, name: string): string {
  return `${type}:${name}`;
}

export function getChatInputCommandKey(name: string): string {
  return getCommandKey(ApplicationCommandType.ChatInput, name);
}

export function getMessageCommandKey(name: string): string {
  return getCommandKey(ApplicationCommandType.Message, name);
}
