import type { GeminiTextModel } from "@tanstack/ai-gemini";
import { cleanContent, type TextBasedChannel } from "discord.js";

import { getAiConfig } from "#/config.ts";

const fallbackModel = "gemini-3.1-flash-lite";
export const standardAiTimeoutMs = 5 * 60_000;
export const catchUpAiTimeoutMs = 6 * 60_000;

export function getAiText(text: string, channel: TextBasedChannel | null): string {
  const readableText = channel ? cleanContent(text, channel) : text;
  return readableText.replaceAll(/<(?:@[!&]?|#)\d+>/gu, " ").trim();
}

export async function withGeminiFallback<T>(
  request: (model: GeminiTextModel, abortController: AbortController) => Promise<T>,
  timeoutMs = standardAiTimeoutMs,
): Promise<T> {
  const { model } = getAiConfig();

  try {
    return await requestWithTimeout(model, request, timeoutMs);
  } catch (error) {
    if (model === fallbackModel) {
      throw error;
    }

    console.warn(`Gemini request failed on ${model}; retrying with ${fallbackModel}:`, error);
    return requestWithTimeout(fallbackModel, request, timeoutMs);
  }
}

async function requestWithTimeout<T>(
  model: GeminiTextModel,
  request: (model: GeminiTextModel, abortController: AbortController) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const abortController = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      request(model, abortController).then((result) => {
        if (abortController.signal.aborted) {
          throw abortController.signal.reason;
        }

        return result;
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(`Gemini request timed out after ${timeoutMs / 1_000} seconds.`);
          abortController.abort(error);
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
