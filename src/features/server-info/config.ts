import { getEnv } from "#/config.ts";

export const serverInfoChannelId = getEnv("DISCORD_SERVER_INFO_CHANNEL_ID");

/** Edit this markdown, then run `/server-info` to publish the changes. */
export const serverInfoMarkdown = `
## BAD BOY

### :speech_balloon: Languages
Bisaya • Filipino • English

### :video_game: We usually play
Counter-Strike • Roblox • Minecraft • Steam games • whatever looks fun

### :pushpin: Basically
- Don't be an asshole
- Any language welcome, but be considerate and speak English when needed
- Join VC plz
`.trim();

const snowflakePattern = /^\d{17,20}$/;

export function isServerInfoConfigured(): boolean {
  return snowflakePattern.test(serverInfoChannelId);
}
