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

/**
 * Replace every enabled option's role ID with the corresponding Discord role ID.
 * The disabled Interests panel is a template for when that category is decided.
 */
export const reactionRolePanels = [
  {
    key: "languages",
    title: "Languages",
    description: "React below to show the non-English languages you speak.",
    color: 0x57f287,
    enabled: true,
    options: [
      { emoji: "🇵🇭", label: "Filipino", roleId: "REPLACE_WITH_FILIPINO_ROLE_ID" },
      { emoji: "🌴", label: "Mandarin", roleId: "REPLACE_WITH_CEBUANO_ROLE_ID" },
    ],
  },
  {
    key: "lfg",
    title: "Looking for Group",
    description: "React below to receive pings when people are looking for a group.",
    color: 0x5865f2,
    enabled: true,
    options: [
      { emoji: "🔴", label: "Roblox", roleId: "REPLACE_WITH_ROBLOX_ROLE_ID" },
      { emoji: "⛏️", label: "Minecraft", roleId: "REPLACE_WITH_MINECRAFT_ROLE_ID" },
      { emoji: "🔺", label: "Valorant", roleId: "REPLACE_WITH_VALORANT_ROLE_ID" },
    ],
  },
  {
    key: "interests",
    title: "Interests",
    description: "React below to share your interests with the community.",
    color: 0xfee75c,
    enabled: false,
    options: [{ emoji: "📚", label: "Replace me", roleId: "REPLACE_WITH_INTEREST_ROLE_ID" }],
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
