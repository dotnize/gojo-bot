# Roadmap

This document tracks features that are planned, under consideration, or recently shipped.

## Message translation (implemented)

Help members of a multilingual community understand one another without forcing everyone to use
the same language. The first version should translate a message only when a member explicitly asks
for it, preserve the original message, and clearly label the source and target languages.

Members can use **Apps → Translate to English** on a single message. The result is ephemeral and
labels the automatically detected source as Filipino/Tagalog, Cebuano/Bisaya, Chinese/Mandarin, or
a mixture of supported languages. It uses the configured Gemini Flash-Lite model and is intended
for Simplified, modern, slang, and informal Chinese rather than Traditional Chinese. Messages that
are already entirely English are returned unchanged.
The translator can read up to two messages before and two after the selected message to resolve
meaning, while translating only the selected message.

`/catch-up` uses the same model to translate and summarize the last 10–50 text messages. Results
are ephemeral unless the caller enables `share`. This feature requires Discord's Message Content
privileged intent and the Read Message History permission.

Selected or fetched message text is sent to Gemini only when a member invokes one of these
features. Both prompts treat messages as untrusted text, and responses warn that AI translations
and summaries can make mistakes.

See [language tools](./language-tools.md) for complete behavior, privacy expectations, limits,
permissions, and failure behavior.
