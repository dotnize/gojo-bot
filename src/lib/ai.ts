import { geminiText, GeminiTextModels, type GeminiTextModel } from "@tanstack/ai-gemini";

import { getAiConfig } from "#/config.ts";

export function getGeminiTextAdapter() {
  const { model } = getAiConfig();

  if (!isGeminiTextModel(model)) {
    throw new Error(`Unsupported GEMINI_MODEL: ${model}`);
  }

  return geminiText(model);
}

function isGeminiTextModel(model: string): model is GeminiTextModel {
  return GeminiTextModels.some((supportedModel) => supportedModel === model);
}
