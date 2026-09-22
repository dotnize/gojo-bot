# Community Discord Bot

A Discord bot for a Discord community, built with discord.js and TypeScript.

## Set up

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env` and fill in your bot token, application ID, and Gemini AI API key.
   `GEMINI_MODEL` is optional and defaults to `gemini-3.5-flash-lite`.
3. During development, set `DISCORD_GUILD_ID` so command updates deploy to one server quickly.
4. In the Discord Developer Portal, enable the **Message Content Intent** for the bot. `/catch-up`
   needs it to read recent message text.
5. Run `pnpm deploy-cmds` whenever a command definition changes.
6. Run `pnpm dev` to start the bot with Node's watch mode.

Use `pnpm start` outside development and `pnpm check` to run formatting and type-aware linting
checks.

## Adding a command

Add a `.ts` file one level below `src/commands`, such as `src/commands/general/ping.ts`, and
default-export a command created with `defineCommand` from `#/lib/commands.ts`. Command modules are
discovered automatically when the bot starts and when commands are deployed, so no registry import
needs to be updated manually. The immediate folder name is the command's category and is displayed
in uppercase by `/help`.

Keep support code outside `src/commands`: every TypeScript file directly inside a category folder is
treated as a command module. Nested category folders are not scanned.

Use `defineMessageCommand` instead for a message context-menu command. Members run those commands
from **Apps** after right-clicking or long-pressing a message.

## Translation and catch-up

Use **Apps → Translate to English** on a message for an ephemeral English translation. Translation
is intended for Filipino/Tagalog, Cebuano/Bisaya, Simplified or informal Chinese/Mandarin, and
mixed messages.

`/catch-up` summarizes 10–50 recent text messages in English and is ephemeral by default. Set its
`share` option to post the result in the channel. Both features send the selected text to the
configured Gemini model and may make mistakes.

## Reaction roles

Set `DISCORD_REACTION_ROLES_CHANNEL_ID`, replace the role ID placeholders in
`src/features/reaction-roles/config.ts`, then deploy the commands and run `/reaction-roles`. The
command creates one managed message per enabled panel and updates those same messages on future
runs.

The bot requires View Channel, Send Messages, Embed Links, Read Message History, Add Reactions, and
Manage Roles in the configured channel. Its highest role must be above every role it assigns.

`/embed create` creates a simple markdown-enabled embed. `/embed edit` edits an embed in the current
channel by default; select the optional channel argument when the message is elsewhere.

## Server information

Set `DISCORD_SERVER_INFO_CHANNEL_ID` and edit the markdown in
`src/features/server-info/config.ts`, then run `/server-info`. The command creates the managed
server info embed or updates the existing one when the hardcoded markdown changes.

## Future work

See the [roadmap](./docs/roadmap.md) for features being considered but not yet implemented.

## License

[MIT](./LICENSE)
