# Language tools

The bot offers translation and catch-up tools for following conversations across the community's
supported languages. Both return English and use the same configured Gemini model as `/ask`.
Translation uses a neutral prompt; catch-up uses Gojo's casual narration.

## Translate a message

On desktop, right-click a message; on mobile, long-press it. Choose **Apps → Translate to
English**. The bot sends the translation as an ephemeral response visible only to the person who
requested it. Review it, then press **Share** to publish it in the same channel if you want.
The translation shows the original author and message text as a clickable link in both the private
preview and the published post. Long original messages are shortened to 120 characters; clicking
the text jumps to the full original. The published footer identifies the member who shared it.

The bot also reads up to two messages before and two after the selected message in the same channel
to help resolve its meaning when they are clearly related. The translator is instructed to ignore
unrelated messages and translate only the selected message. Bot and empty nearby messages are
excluded; if nearby history is unavailable, it translates the selected message alone.

The translator recognizes Filipino/Tagalog, Cebuano/Bisaya, and Simplified Chinese/Mandarin,
including informal language, slang, and English code-switching. It preserves tone, names, mentions,
emoji, links, and formatting where possible. Messages already entirely in English are returned
unchanged and labeled **Already in English**.

## Catch up on a channel

Run `/catch-up` in a server text channel. The optional `messages` argument accepts 5–100 and
defaults to 50. The bot reads that many recent channel messages, removes bot and empty messages,
then sends an English summary.

The result is always ephemeral. Review it, then press **Share** to publish it in the same channel
if you want. The Share button expires 14 minutes after the command starts, and a successful share
can only post once. The published footer identifies the member who shared it.

## Automated catch-ups

Add exact channel IDs to `automatedCatchUpChannelIds` in
`src/features/automated-catch-up/config.ts` and restart the bot. An empty array disables all automated
catch-ups, including background polling and state-file writes. A parent channel does not implicitly
enable its threads; list each desired thread's ID separately.

On first initialization, the bot saves the latest message as its starting point and waits for 100
new eligible messages. It does not summarize the channel's old history. After that, progress survives
restarts and messages sent while the bot was offline are processed in consecutive batches of 100.
The counter excludes bots, webhooks, system messages, and messages with no readable text or attachment
placeholder. Attachments count, but their contents are never read. Deleted messages disappear from
unprocessed batches; edits and deletions do not rewrite already published summaries.

Each full batch is posted directly in an **Automated catch-up** embed. The previous automated
summary is supplied separately as background context, with instructions to cover only new
developments. A small **See previous catch-up 100 messages ago** link appears above the generated
summary when that previous post is available. Manual `/catch-up` results never affect this chain.
If the previous automated post was deleted, the next batch continues without its context or link.
The embed title is plain text. A **Conversation** field below the summary contains a
**Jump to last summarized message** link to the last message covered.
Messages sent during generation belong to the next batch, so generation delays do not create gaps.

Live message events trigger checks; a one-minute poll also catches partial batches, missed events,
and downtime. A batch may therefore wait up to a minute before generation starts, plus time spent
on earlier queued batches. Automatic generation is serialized across enabled channels. Failures
retain the batch and retry with exponential delays from one to fifteen minutes, in addition to the
existing Gemini fallback. Generated output is saved before publication, so send failures retry the
same output without another Gemini call. Publication recovery checks for the same batch already
posted by this bot and also uses Discord's nonce deduplication.

State lives in `data/automated-catch-up/`, ignored by Git. Keep that directory on a persistent,
writable volume and run **one bot process**; this implementation does not coordinate multiple
instances. State contains message IDs and, only while publication is pending, the generated summary
and previous-summary URL. It does not persist source message text. Corrupt state is logged and
retried rather than silently reset. Removing state starts counting fresh on the next initialization
and loses the previous-summary chain. Removing an ID from the allowlist pauses that channel;
re-adding it resumes its saved progress, including intervening messages.

Tell members which channels are enabled: their messages are sent to Gemini and summaries are
published automatically without a private preview or Share button. Automation shares API quota
with manual AI commands and uses the existing `GEMINI_MODEL` and fallback settings.

## Privacy, limits, and failures

- Translation sends the selected message and up to four nearby human messages to Gemini only after
  a member invokes the command. Nearby text is limited to 1,000 characters per message.
- Manual catch-up sends the readable human messages in the requested history window to Gemini only
  after a member invokes the command. Enabled automated channels send each full batch automatically,
  together with the previous automated summary when available.
- Manual tools do not persist message text, translations, or summaries. Automated catch-up stores
  progress and pending output as described above. Provider processing remains subject to the
  configured Gemini account and its data-handling terms.
- Translation is text-only. Manual catch-up inspects at most 100 recent channel messages. Automated
  catch-up paginates history as needed to collect 100 eligible messages. Both exclude bots and empty
  messages and represent attachments with placeholders rather than reading their contents.
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

Automated catch-up needs the same intent, View Channel, Read Message History, Send Messages, and
Embed Links permissions in every configured channel. Threads require Send Messages in Threads.
Missing permissions pause processing and are logged for the maintainer.

After deploying the code, run `pnpm deploy-cmds` to register both application commands. Enabling
automated catch-up alone does not change command definitions or require command deployment.
