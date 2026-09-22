import { geminiText } from "@tanstack/ai-gemini";

export const geminiModel = "gemini-3.5-flash-lite";

export function createGeminiTextAdapter() {
  return geminiText(geminiModel);
}
