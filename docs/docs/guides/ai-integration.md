---
date: 2026-11-22
title: AI integration
sidebar.label: AI integration
---
# AI integration

> This page remains for migration. See [AI integration](./ai/README.md) for the new structure.

## Start MCP without shared environment variables

Register `npm exec riebeckite ai mcp` as a stdio MCP command in an AI client.
It starts the local development server and MCP server together, creates a
temporary Bridge token, and keeps it out of the client configuration. Keep the
client command running for the development session.

Riebeckite AI integration gives AI tools existing site state and validation results instead of asking them to guess. It does not let an AI apply approved changes automatically.

## Add it when creating a project

Interactive `create-riebeckite` setup lets you choose each option. In non-interactive use:

```sh
npx create-riebeckite my-site --ai mcp,lint,rules,skills
```

`mcp` adds `@riebeckite/mcp`; `lint` adds `npm run content:lint` for `riebeckite check`; `rules` creates `AGENTS.md` and `RIEBECKITE_AI.md`; and `skills` creates OpenCode-compatible `.agents/skills/`. Client configuration is not created automatically.

For an existing project, `npm exec riebeckite ai setup` adds the missing MCP dependency, lint script, guidance files, and Skills without overwriting existing guidance files.

## Connect MCP

MCP is a thin stdio adapter over the development-only Bridge. It exposes authoritative preview, publication, diagnostics, links, and inventory data. `riebeckite_plugin_catalog` also searches the public npm registry for official Plugin packages without changing the site. Start development with a token of at least 32 characters:

```sh
RIEBECKITE_BRIDGE_TOKEN=<token> npm run dev
```

Configure the client to run `npx -y @riebeckite/mcp` with `RIEBECKITE_BRIDGE_DEVELOPMENT_ORIGIN` (for example `http://127.0.0.1:5173`) and the same `RIEBECKITE_BRIDGE_TOKEN`. MCP offers reads and mutation validation. With the optional mutation token, it can also create a stored plan and apply it after a human approves it with `npm exec riebeckite bridge approve <plan-id>`. Approval remains a human CLI operation.

## Generated Skills

Skills cover site content, Plugin selection and authoring, application components, content migrations, deployment, Themes, configuration, troubleshooting, and upgrades. Each has `SKILL.md`, `references/guide.md`, and `assets/checklist.md`, and may be edited. They prefer MCP data when available and use CLI checks as a fallback.

When `riebeckiteVersion` differs from the CLI version, run:

```sh
npm exec riebeckite skills sync
```

The interactive command shows the current and replacement content. You can review each Skill, replace all supported generated Skills, or skip. It never updates without confirmation; review or back up custom changes before replacing all Skills.
