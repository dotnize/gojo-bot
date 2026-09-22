# Community Discord Bot

A Discord bot for a Discord community, built with discord.js and TypeScript.

## Set up

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env` and fill in your bot token, application ID, and Gemini AI API key.
3. During development, set `DISCORD_GUILD_ID` so command updates deploy to one server quickly.
4. Enable the **Message Content Intent** on the bot's Discord developer portal page. This is
   required for `/catch-up` to read recent channel messages.
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

## Language tools

Right-click or long-press a message and choose **Apps → Translate** to privately translate it into
English. `/catch-up` privately summarizes the latest 10–50 human messages in the current channel
in English, with a button to share the result to the channel.

Both features use Gemini Flash-Lite. See [the language tools documentation](./docs/language-tools.md)
for supported languages, privacy behavior, limits, and required permissions.

## Future work

See the [roadmap](./docs/roadmap.md) for features being considered but not yet implemented.

## License

[MIT](./LICENSE)
