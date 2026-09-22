# Language tools

The bot offers two opt-in tools for following conversations across the community's supported
languages. Both always return English and use the same configured Gemini Flash-Lite model as
`/ask`, but use separate, neutral prompts rather than Gojo's personality.

## Translate a message

On desktop, right-click a message; on mobile, long-press it. Choose **Apps → Translate to
English**. The bot sends the translation as an ephemeral response visible only to the person who
requested it.

The translator recognizes Filipino/Tagalog, Cebuano/Bisaya, and Simplified Chinese/Mandarin,
including informal language, slang, and English code-switching. It preserves tone, names, mentions,
emoji, links, and formatting where possible. Messages already entirely in English are returned
unchanged and labeled **Already in English**.

## Catch up on a channel

Run `/catch-up` in a server text channel. The optional `messages` argument accepts 10–50 and
defaults to 25. The bot reads that many recent channel messages, removes bot and empty messages,
then sends an English summary.

The result is ephemeral by default. Enable the optional `share` argument to post it directly in the
channel instead. Shared summaries are generated publicly without a private preview.

## Privacy, limits, and failures

- Translation sends the selected message text to Gemini only after a member invokes the command.
- Catch-up sends the readable human messages in the requested history window to Gemini only after
  a member invokes the command.
- The bot does not add persistent storage for message text, translations, or summaries. Provider
  processing remains subject to the configured Gemini account and its data-handling terms.
- Translation is text-only. Catch-up reads at most 50 messages and ignores bot, attachment-only,
  and empty messages.
- AI output can mistranslate slang, miss context, or summarize incorrectly. Members should check
  important details against the original conversation and report misleading output to the bot
  maintainer with the original text and the incorrect result.
- Provider errors, missing permissions, and unreadable histories return an error instead of posting
  a partial translation or summary.

## Discord configuration

`Apps → Translate to English` receives the explicitly selected message through the interaction.
`/catch-up` fetches arbitrary recent history, so it additionally requires:

- The privileged **Message Content Intent** enabled in the Discord Developer Portal.
- View Channel and Read Message History permissions in channels where it is used.
- Send Messages and Embed Links permissions when `share` is enabled.

After deploying the code, run `pnpm deploy-cmds` to register both application commands.
