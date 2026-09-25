import { getEnv } from "#/config.ts";

export const serverInfoChannelId = getEnv("DISCORD_SERVER_INFO_CHANNEL_ID");

/** Edit this markdown, then run `/server-info` to publish the changes. */
export const serverInfoMarkdown = `
## hunter the bad boy

### :video_game: We usually play
Roblox • Minecraft • Steam games • whatever looks fun

### :pushpin: Basically
- Don't be an asshole
- Any language welcome, but be considerate and speak English when needed
- Don't be a stranger, join VC sometimes
`.trim();

export const translationFeaturesMarkdown = `
## translation features

most members here are Filipinos and occasionally speak Filipino in the chats, but this is still a global group of friends so we obviously want to make everyone feel welcome and included in the conversations

so the @Gojo bot has these 2 features:

- **Translate a message:** right-click a message (or hold on mobile) → Apps → Gojo → Translate to English
- \`/catch-up\`: just type this command in the chat to translate+summarize recent messages, defaults to recent 15 messages

these are private by default, so don't be shy. Nobody will know you used them, unless you click the Share button after :)
`.trim();

const snowflakePattern = /^\d{17,20}$/;

export function isServerInfoConfigured(): boolean {
  return snowflakePattern.test(serverInfoChannelId);
}
