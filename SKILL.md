---
name: traveller-project-commands
description: Apply the user's command preferences and working instructions when developing or maintaining the Traveller stablecoin payment repository.
---

# Project commands and instructions

Edit this file to specify commands, workflows, and preferences for coding agents working in this repository. `AGENTS.md` directs agents to read it. This is repository guidance, not a globally installed skill.

## command for commiting and pushing to remote gh

staged - `git add <file name where things changed >`
commit - `git commit -m "<commit msg>"` - without adding any signoffs by AI agents

## General commands

Run commands from the repository root unless a task requires another directory. Use `pnpm` for this workspace.

| Purpose | Command |
| --- | --- |
| Type-check the workspace | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Run tests | `pnpm test` |
| Build the backend | `pnpm --filter @traveller/api build` |
| Export the Android JavaScript bundle | `pnpm --filter @traveller/mobile build` |
| Check formatting of edited files | `pnpm exec prettier --check <file-paths>` |
| Format edited files | `pnpm exec prettier --write <file-paths>` |

Choose checks appropriate to the changed code. Android bundle export does not produce an APK or verify a physical camera scan. Replace `<file-paths>` with the actual edited paths.

## Servers

The user runs development servers. Do not start a persistent server unless asked. Do not stop a server the user started for testing merely because it is running. Shut down any temporary server started by the agent when its authorized use is complete.

Commands to give the user when needed:

```sh
pnpm dev:api
pnpm dev:mobile
```

## Working preferences

- Keep README files suitable for public GitHub readers. Keep internal command instructions in this file.
- Preserve existing uncommitted work and reference assets.
- Limit visual changes to the requested scope and use supplied design references.

## My additional instructions

Add your own instructions below as Markdown bullets. For command rules, specify when to use the command and any required working directory.
