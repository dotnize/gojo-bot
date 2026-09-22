import { geminiText, GeminiTextModels, type GeminiTextModel } from "@tanstack/ai-gemini";

import { getAiConfig } from "#/config.ts";

const fallbackModel = "gemini-3.1-flash-lite";

export function getGeminiTextAdapter(model = getAiConfig().model) {
  if (!isGeminiTextModel(model)) {
    throw new Error(`Unsupported GEMINI_MODEL: ${model}`);
  }

  return geminiText(model);
}

export async function withGeminiFallback<T>(
  request: (model: GeminiTextModel) => Promise<T>,
): Promise<T> {
  const { model } = getAiConfig();

  if (!isGeminiTextModel(model)) {
    throw new Error(`Unsupported GEMINI_MODEL: ${model}`);
  }

  try {
    return await request(model);
  } catch (error) {
    if (model === fallbackModel) {
      throw error;
    }

    console.warn(`Gemini request failed on ${model}; retrying with ${fallbackModel}:`, error);
    return request(fallbackModel);
  }
}

function isGeminiTextModel(model: string): model is GeminiTextModel {
  return GeminiTextModels.some((supportedModel) => supportedModel === model);
}
