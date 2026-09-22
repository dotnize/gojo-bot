import { readdir } from "node:fs/promises";

import {
  ApplicationCommandType,
  type ChatInputCommandInteraction,
  type ContextMenuCommandBuilder,
  type MessageContextMenuCommandInteraction,
  type SlashCommandBuilder,
} from "discord.js";

export interface ChatInputCommandDefinition {
  readonly data: Pick<SlashCommandBuilder, "name" | "toJSON">;
  readonly helpDescription?: string;
  execute(
    interaction: ChatInputCommandInteraction,
    commandRegistry: CommandRegistry,
  ): Promise<void>;
}

export interface MessageCommandDefinition {
  readonly data: Pick<ContextMenuCommandBuilder, "name" | "toJSON">;
  readonly helpDescription: string;
  execute(
    interaction: MessageContextMenuCommandInteraction,
    commandRegistry: CommandRegistry,
  ): Promise<void>;
}

export type CommandDefinition = ChatInputCommandDefinition | MessageCommandDefinition;

export type ChatInputCommand = ChatInputCommandDefinition & { readonly category: string };
export type MessageCommand = MessageCommandDefinition & { readonly category: string };
export type Command = ChatInputCommand | MessageCommand;
export type SupportedCommandType =
  | ApplicationCommandType.ChatInput
  | ApplicationCommandType.Message;

/**
 * Defines a command while contextually typing its execute callback.
 */
export function defineCommand(command: ChatInputCommandDefinition): ChatInputCommandDefinition {
  return command;
}

/**
 * Defines a message context-menu command while contextually typing its execute callback.
 */
export function defineMessageCommand(command: MessageCommandDefinition): MessageCommandDefinition {
  return command;
}

export type CommandRegistry = ReadonlyMap<string, Command>;

const commandsDirectory = new URL("../commands/", import.meta.url);

function isCommandDefinition(value: unknown): value is CommandDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const command = value as Partial<CommandDefinition>;

  return (
    typeof command.data?.name === "string" &&
    typeof command.data.toJSON === "function" &&
    typeof command.execute === "function"
  );
}

export function getCommandType(command: CommandDefinition): SupportedCommandType {
  const type = command.data.toJSON().type ?? ApplicationCommandType.ChatInput;

  if (type !== ApplicationCommandType.ChatInput && type !== ApplicationCommandType.Message) {
    throw new TypeError(`Unsupported application command type: ${type}`);
  }

  return type;
}

export function isChatInputCommand(command: Command): command is ChatInputCommand {
  return getCommandType(command) === ApplicationCommandType.ChatInput;
}

export function isMessageCommand(command: Command): command is MessageCommand {
  return getCommandType(command) === ApplicationCommandType.Message;
}

function getCommandKey(type: SupportedCommandType, name: string): string {
  return `${type}:${name}`;
}

export function getRegisteredCommand(
  registry: CommandRegistry,
  type: SupportedCommandType,
  name: string,
): Command | undefined {
  return registry.get(getCommandKey(type, name));
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

  // Validate duplicate names within each command type for every consumer, including deployment.
  createCommandRegistry(commands);

  return commands;
}

export function createCommandRegistry(commands: readonly Command[]): CommandRegistry {
  const registry = new Map<string, Command>();

  for (const command of commands) {
    const name = command.data.name;
    const type = getCommandType(command);
    const key = getCommandKey(type, name);

    if (registry.has(key)) {
      throw new Error(`Duplicate command name and type: ${name} (${type})`);
    }

    registry.set(key, command);
  }

  return registry;
}
