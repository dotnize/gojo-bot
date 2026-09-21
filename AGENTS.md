# Discord Bot agent guidelines

A Discord bot built with discord.js v14 and a modern Node.js stack: Node.js 24+ with built-in TypeScript support, Oxlint, Oxfmt.

This bot is built only for 1 Discord server/guild, so we don't need to consider multi-guild support to keep things simple.

Prefer embeds for bot message-content responses when appropriate.

## Validation

- `pnpm lint`: Covers both type-aware linting and type checking. No need to run `tsc --noEmit`

Lint checks are enough for now, no need for tests.

## Formatting

Oxfmt is configured for consistent code formatting via `pnpm format`. It runs automatically on commit Husky + lint-staged pre-commit hooks, so manual formatting is not necessary.

<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->
