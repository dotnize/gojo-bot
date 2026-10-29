# Community Discord Bot

A Discord bot for a Discord community, built with discord.js and TypeScript.

## Set up

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env` and fill in your bot token, application ID, and Gemini AI API key.
   `GEMINI_MODEL` is optional and defaults to `gemini-3.5-flash-lite`. If a Gemini request fails,
   the bot retries it once with `gemini-3.1-flash-lite` (unless that is already the selected model).
   Each attempt has a five-minute timeout, except `/catch-up`, which allows six minutes per attempt.
3. During development, set `DISCORD_GUILD_ID` so command updates deploy to one server quickly.
4. In the Discord Developer Portal, enable the **Message Content Intent** for the bot. `/ask`
   and `/catch-up` need it to read recent message text.
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

## Ask Gojo

Use `/ask`, mention Gojo, or reply to a message posted by Gojo to ask a question. Replying to
another member's message also works when you explicitly mention Gojo.

Each request can use the 20 preceding messages in the current channel, including messages from
other members and bots. Message replies also follow up to five earlier messages in the reply
chain, regardless of author or age. The reply chain takes priority and is deduplicated from recent
history. Both are presented oldest first, with authors, timestamps, and reply relationships.

Context includes message text and embed titles, descriptions, fields, authors, footers, and links.
This lets Gojo understand replies to `/say create`, `/embed create`, shared catch-up summaries,
and earlier `/ask` responses. A shared catch-up provides its published summary, not the original
messages behind it. Attachments and embedded images are represented by placeholders; their
contents are not read.

Reply context is limited to 6,000 characters per message and 16,000 characters of message text in
total. Recent context is limited to 1,500 characters per message and 8,000 characters of message
text in total. Longer messages are marked as truncated; the nearest replies and newest channel
messages are kept first. Gojo is instructed to ignore unrelated chat and treat context as quoted
data rather than instructions.

Reading history requires View Channel, Read Message History, and the Message Content Intent.
If a referenced message or recent history cannot be read, Gojo continues with the available
context. Relevant text is sent to the configured Gemini model only when Gojo is invoked; this
feature adds no persistent message storage.

## Translation and catch-up

Use **Apps → Translate to English** on a message for a private English translation. Translation
is intended for Filipino/Tagalog, Cebuano/Bisaya, Simplified or informal Chinese/Mandarin, and
mixed messages. It can use up to two nearby messages on each side for context.

`/catch-up` summarizes 5–100 recent text messages in English (50 by default). Both results are
ephemeral. After reviewing a result, press **Share** to publish it in the same channel. Both
features send relevant message text to the configured Gemini model and may make mistakes.

See [the language tools documentation](./docs/language-tools.md) for supported languages, privacy
behavior, limits, and required permissions.

## Reaction roles

Set `DISCORD_REACTION_ROLES_CHANNEL_ID`, replace the role ID placeholders in
`src/features/reaction-roles/config.ts`, then deploy the commands and run `/reaction-roles`. The
command creates one managed message per enabled panel and updates those same messages on future
runs.

The bot requires View Channel, Send Messages, Embed Links, Read Message History, Add Reactions, and
Manage Roles in the configured channel. Its highest role must be above every role it assigns.

`/embed create` creates a markdown-enabled embed with an optional title and footer. `/embed edit`
replaces an embed's description, optional title, and optional footer in the current channel by
default; select the optional channel argument when the message is elsewhere.

## Server information

Set `DISCORD_SERVER_INFO_CHANNEL_ID` and edit the markdown in
`src/features/server-info/config.ts`, then run `/server-info`. The command creates the managed
server info message with two embeds (server information and translation features), or updates the
existing message when the hardcoded markdown changes.

## Future work

See the [roadmap](./docs/roadmap.md) for features being considered but not yet implemented.

## License

[MIT](./LICENSE)
