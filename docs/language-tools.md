# Language tools

The bot offers two opt-in tools for following conversations across the community's supported
languages. Both always return English and use the same configured Gemini Flash-Lite model as
`/ask`, but use separate, neutral prompts rather than Gojo's personality.

## Translate a message

On desktop, right-click a message; on mobile, long-press it. Choose **Apps → Translate to
English**. The bot sends the translation as an ephemeral response visible only to the person who
requested it. Review it, then press **Share** to publish it in the same channel if you want.

The bot also reads up to two messages before and two after the selected message in the same channel
to help resolve its meaning when they are clearly related. The translator is instructed to ignore
unrelated messages and translate only the selected message. Bot and empty nearby messages are
excluded; if nearby history is unavailable, it translates the selected message alone.

The translator recognizes Filipino/Tagalog, Cebuano/Bisaya, and Simplified Chinese/Mandarin,
including informal language, slang, and English code-switching. It preserves tone, names, mentions,
emoji, links, and formatting where possible. Messages already entirely in English are returned
unchanged and labeled **Already in English**.

## Catch up on a channel

Run `/catch-up` in a server text channel. The optional `messages` argument accepts 5–50 and
defaults to 15. The bot reads that many recent channel messages, removes bot and empty messages,
then sends an English summary.

The result is always ephemeral. Review it, then press **Share** to publish it in the same channel
if you want. The Share button expires 14 minutes after the command starts, and a successful share
can only post once.

## Privacy, limits, and failures

- Translation sends the selected message and up to four nearby human messages to Gemini only after
  a member invokes the command. Nearby text is limited to 1,000 characters per message.
- Catch-up sends the readable human messages in the requested history window to Gemini only after
  a member invokes the command.
- The bot does not add persistent storage for message text, translations, or summaries. Provider
  processing remains subject to the configured Gemini account and its data-handling terms.
- Translation is text-only. Catch-up reads at most 50 messages and ignores bot, attachment-only,
  and empty messages.
- AI output can mistranslate slang, miss context, or summarize incorrectly. Members should check
  important details against the original conversation and report misleading output to the bot
  maintainer with the original text and the incorrect result.
- If a Gemini request fails or times out, the bot retries once with `gemini-3.1-flash-lite`.
  Translation allows five minutes per attempt; catch-up allows six minutes per attempt. If the retry
  also fails, the command returns an error. Unreadable nearby history does not prevent translation of the
  selected message; unreadable catch-up history returns an error instead of a partial summary.

## Discord configuration

`Apps → Translate to English` receives the explicitly selected message through the interaction.
Reading nearby messages also requires View Channel and Read Message History permissions and the
privileged **Message Content Intent** enabled in the Discord Developer Portal.
`/catch-up` also fetches recent history and requires:

- The privileged **Message Content Intent** enabled in the Discord Developer Portal.
- View Channel and Read Message History permissions in channels where it is used.
- Send Messages and Embed Links permissions to publish with **Share**. Translation needs these
  permissions to publish its preview too.

After deploying the code, run `pnpm deploy-cmds` to register both application commands.
