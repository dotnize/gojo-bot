import { EmbedBuilder } from "discord.js";

import type { CatchUpResult, TranslationResult } from "#/features/language-tools/ai.ts";

const languageToolsColor = 0x3498db;
const embedDescriptionLimit = 4_096;
const embedFieldValueLimit = 1_024;
const catchUpDescriptionLimit = 1_800;
const catchUpFieldValueLimit = 900;
const truncationNotice = "\n\n_The rest was cut short._";

function truncate(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - truncationNotice.length)}${truncationNotice}`;
}

function formatList(items: readonly string[]): string {
  return truncate(items.map((item) => `- ${item}`).join("\n"), catchUpFieldValueLimit);
}

function formatSourceLanguages(languages: TranslationResult["sourceLanguages"]): string {
  return languages.length > 0 ? languages.join(" + ") : "English";
}

export function buildTranslationEmbed(result: TranslationResult): EmbedBuilder {
  const source = formatSourceLanguages(result.sourceLanguages);
  const title = result.sourceLanguages.length > 0 ? `${source} → English` : "Already in English";
  const embed = new EmbedBuilder()
    .setColor(languageToolsColor)
    .setTitle(title)
    .setDescription(truncate(result.translation, embedDescriptionLimit))
    .setFooter({ text: "AI translation can make mistakes." });

  if (result.note) {
    embed.addFields({ name: "Context", value: truncate(result.note, embedFieldValueLimit) });
  }

  return embed;
}

export function buildCatchUpEmbed(result: CatchUpResult, messageCount: number): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(languageToolsColor)
    .setTitle(`Catch-up • ${messageCount} message${messageCount === 1 ? "" : "s"}`)
    .setDescription(truncate(result.overview, catchUpDescriptionLimit));

  const fields = [
    { name: "Key points", items: result.keyPoints },
    { name: "Decisions & plans", items: result.decisions },
    { name: "Open questions", items: result.openQuestions },
  ]
    .filter((field) => field.items.length > 0)
    .map((field) => ({ name: field.name, value: formatList(field.items) }));

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  const languageNote =
    result.sourceLanguages.length > 0
      ? `Translated from ${result.sourceLanguages.join(", ")} • `
      : "";
  embed.setFooter({ text: `${languageNote}AI summary can miss context.` });

  return embed;
}
