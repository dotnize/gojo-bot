import { getEnv } from "#/config.ts";

export interface ReactionRoleOption {
  readonly emoji: string;
  readonly label: string;
  readonly roleId: string;
}

export interface ReactionRolePanel {
  readonly color: number;
  readonly description: string;
  readonly enabled: boolean;
  readonly key: string;
  readonly options: readonly ReactionRoleOption[];
  readonly title: string;
}

export const reactionRolesChannelId = getEnv("DISCORD_REACTION_ROLES_CHANNEL_ID");

/** Replace every option's role ID with the corresponding Discord role ID. */
export const reactionRolePanels = [
  {
    key: "languages",
    title: "Languages",
    description: "React below for the non-English languages you speak.",
    color: 0x57f287,
    enabled: true,
    options: [
      { emoji: "🟡", label: "Filipino", roleId: "1553057648113483776" },
      { emoji: "🟣", label: "Mandarin", roleId: "1553057674365636660" },
    ],
  },
  {
    key: "activities",
    title: "Activities",
    description: "Get pinged for invites for games or other activities.",
    color: 0x5865f2,
    enabled: true,
    options: [
      { emoji: "🧱", label: "Roblox", roleId: "1553062033694662656" },
      { emoji: "🎯", label: "FPS Games", roleId: "1553062052850049044" },
      { emoji: "⛏️", label: "Minecraft", roleId: "1553062082918883499" },
      { emoji: "🎉", label: "Party Games", roleId: "1553062106234880151" },
      { emoji: "🎬", label: "Movie Nights", roleId: "1553062127504330793" },
    ],
  },
] as const satisfies readonly ReactionRolePanel[];

const snowflakePattern = /^\d{17,20}$/;

export function getEnabledReactionRolePanels(): readonly ReactionRolePanel[] {
  return reactionRolePanels.filter((panel) => panel.enabled);
}

export function getReactionRoleConfigurationProblems(): readonly string[] {
  const problems: string[] = [];

  if (!snowflakePattern.test(reactionRolesChannelId)) {
    problems.push("the reaction-role channel ID");
  }

  for (const panel of getEnabledReactionRolePanels()) {
    for (const option of panel.options) {
      if (!snowflakePattern.test(option.roleId)) {
        problems.push(`the ${option.label} role ID`);
      }
    }
  }

  return problems;
}

export function isConfiguredRoleId(roleId: string): boolean {
  return snowflakePattern.test(roleId);
}
