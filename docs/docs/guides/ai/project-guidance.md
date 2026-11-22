---
date: 2026-11-22
title: Project guidance for AI
sidebar.label: Project guidance
---
# Project guidance for AI

`AGENTS.md` is the entry point AI clients read first. It points to `RIEBECKITE_AI.md`, which records project-specific assumptions such as content location, frontmatter, links, and verification commands. Setup also writes `CLAUDE.md` and `.github/copilot-instructions.md`, which point to the same guidance. Edit these as the project evolves.

Generated Skills cover site content, Plugin selection and authoring, application components, content migrations, deployment, Themes, configuration, troubleshooting, and upgrades. Each has `SKILL.md`, `references/guide.md`, and `assets/checklist.md`, and is written to `.agents/skills/`.

For an existing project, add the missing AI setup files:

```sh
npm exec riebeckite ai setup
```

This adds `@riebeckite/ai`, `@riebeckite/mcp`, the `content:lint` script, `AGENTS.md`, `RIEBECKITE_AI.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, and all generated Skills. Existing guidance files are left unchanged; if `RIEBECKITE_AI.md` was generated for another Riebeckite version, setup prints a warning. Outdated generated Skills are replaced after confirmation.

```sh
npm exec riebeckite skills sync
```

`skills sync` adds missing Skills and missing files inside a Skill. When a Skill version differs from the CLI, the command shows current and replacement content. Choose to review each Skill, apply all updates, or skip.

`.agents/skills/` is the location OpenCode discovers. If a client reads Skills from another path, add a link or configure that path in the client. `skills sync` only updates `.agents/skills/`.

`riebeckite doctor` warns when AI guidance is incomplete, when guidance or Skills were generated for another Riebeckite version, or when `@riebeckite/mcp` is missing.
