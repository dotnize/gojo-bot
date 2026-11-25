import { cleanContent, type Message, type TextBasedChannel } from "discord.js";

export const aiModel = "gpt-6-luna";
export const standardAiTimeoutMs = 5 * 60_000;
export const catchUpAiTimeoutMs = 6 * 60_000;

export function getAiText(text: string, channel: TextBasedChannel | null): string {
  const readableText = channel ? cleanContent(text, channel) : text;
  return readableText.replaceAll(/<(?:@[!&]?|#)\d+>/gu, " ").trim();
}

export function getAiMessageText(message: Message, text = message.content): string {
  const attachments = message.attachments.map((attachment) => {
    const mediaType = attachment.contentType?.split("/")[0] ?? "file";
    const type = ["image", "video", "audio"].includes(mediaType) ? mediaType : "file";
    return `[${type} attached; contents unavailable]`;
  });

  return [getAiText(text, message.channel), ...attachments].filter(Boolean).join("\n");
}

export async function withAiTimeout<T>(
  request: (abortController: AbortController) => Promise<T>,
  timeoutMs = standardAiTimeoutMs,
): Promise<T> {
  const abortController = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      request(abortController).then((result) => {
        if (abortController.signal.aborted) {
          throw abortController.signal.reason;
        }

        return result;
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(`AI request timed out after ${timeoutMs / 1_000} seconds.`);
          abortController.abort(error);
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
