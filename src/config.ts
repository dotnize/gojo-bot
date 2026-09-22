export function getEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function requireEnv(name: string): string {
  const value = getEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getBotConfig() {
  return {
    token: requireEnv("DISCORD_TOKEN"),
  } as const;
}

export function getCommandDeploymentConfig() {
  return {
    applicationId: requireEnv("DISCORD_APPLICATION_ID"),
    guildId: getEnv("DISCORD_GUILD_ID") || undefined,
    token: requireEnv("DISCORD_TOKEN"),
  } as const;
}

export function getAiConfig() {
  return {
    model: getEnv("GEMINI_MODEL") || "gemini-3.5-flash-lite",
  } as const;
}
