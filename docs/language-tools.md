# Language tools

The bot offers two opt-in tools for following conversations across the community's supported
languages. Both always return English and use the same Gemini Flash-Lite model as `/ask`, but use
separate, neutral prompts rather than Gojo's personality.

## Translate a message

On desktop, right-click a message; on mobile, long-press it. Choose **Apps → Translate**. The bot
sends the translation as an ephemeral response visible only to the person who requested it.

The translator recognizes Filipino/Tagalog, Cebuano/Bisaya, and Simplified Chinese/Mandarin,
including informal language, slang, and English code-switching. It preserves tone, names, mentions,
emoji, links, and formatting where possible. Messages already in English are returned unchanged.

## Catch up on a channel

Run `/catch-up` in a server text channel. The optional `messages` argument accepts 10–50 and
defaults to 25. The bot reads that many recent channel messages, removes bot messages and empty
messages, then sends the caller an ephemeral English summary. The caller can use **Share to
channel** to publish the summary when it would be useful to everyone.

The summary can include an overview, key points, decisions and plans, and open questions. File
names are supplied as context, but Gemini does not receive or inspect attachment contents.

## Privacy, limits, and failures

- Translation sends the selected message text to Gemini only after a member invokes the command.
- Catch-up sends the readable human messages in the requested history window to Gemini only after
  a member invokes the command.
- The bot does not add persistent storage for message text, translations, or summaries. Provider
  processing remains subject to the configured Gemini account and its data-handling terms.
- Translation is text-only. Catch-up reads at most 50 messages and ignores bot-only or empty
  messages.
- AI output can mistranslate slang, miss context, or summarize incorrectly. Members should check
  important details against the original conversation and report misleading output to the bot
  maintainer with the original text and the incorrect result.
- Provider errors, missing permissions, and unreadable histories produce an ephemeral error rather
  than posting partial output publicly.

## Discord configuration

`Apps → Translate` receives the explicitly selected message through the interaction. `/catch-up`
fetches arbitrary recent history, so it additionally requires:

- The privileged **Message Content Intent** enabled in the Discord developer portal.
- View Channel and Read Message History permissions in channels where it is used.
- Send Messages and Embed Links permissions to publish a shared catch-up.

After deploying the code, run `pnpm deploy-cmds` to register both application commands.
