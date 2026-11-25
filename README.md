# Gojo

A Discord bot for a small community server, built with discord.js and TypeScript. AI features use
OpenAI's latest Luna model.

## Features

- **Ask Gojo**: use `/ask`, mention Gojo, or reply to Gojo. It reads recent channel messages and
  the reply chain for context.
- **Translate to English**: right-click a message → **Apps** → **Translate to English**. Built for
  Filipino/Tagalog, Cebuano/Bisaya, Mandarin, and mixed messages.
- **Catch-up**: `/catch-up` summarizes recent messages privately, with a **Share** button. It can
  also post summaries automatically every 70 messages in chosen channels.
- **Community tools**: reaction roles, a server info message, and `/embed` and `/say` for managed
  posts.

See [language tools](./docs/language-tools.md) for translation and catch-up details, including
privacy and limits.

## Setup

1. Run `pnpm install`.
2. Copy `.env.example` to `.env` and fill in your Discord token, application ID, OpenAI API key,
   and channel IDs. Set `DISCORD_GUILD_ID` during development so commands update instantly.
3. Enable the **Message Content Intent** in the Discord Developer Portal.
4. Run `pnpm deploy-cmds` to register commands. Run it again whenever a command definition changes.
5. Run `pnpm dev` to start the bot in watch mode, or `pnpm start` in production.

Run `pnpm check` to format and lint.

## Configuration

Feature settings live in `src/features/*/config.ts`:

| Feature                     | File                           | Then run          |
| --------------------------- | ------------------------------ | ----------------- |
| Automated catch-up channels | `automated-catch-up/config.ts` | Restart the bot   |
| Reaction role panels        | `reaction-roles/config.ts`     | `/reaction-roles` |
| Server info message         | `server-info/config.ts`        | `/server-info`    |

Automated catch-up saves progress in `data/automated-catch-up/`. Keep it on persistent storage and
run only one bot process. For reaction roles, the bot's highest role must be above every role it
assigns.

## Adding a command

Add a `.ts` file one level below `src/commands`, such as `src/commands/general/ping.ts`, and
default-export `defineCommand(...)` or `defineMessageCommand(...)` from `#/lib/commands.ts`.
Commands are discovered automatically. The folder name is the command's category in `/help`.

## License

[MIT](./LICENSE)
