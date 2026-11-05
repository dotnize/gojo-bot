// Add Discord channel IDs to enable public catch-ups in those channels only.
// An empty list disables the feature. Threads must be listed by their own IDs.
export const automatedCatchUpChannelIds: readonly string[] = [];

// Keep this directory on persistent storage when deploying the bot.
export const automatedCatchUpStateDirectory = "data/automated-catch-up";
