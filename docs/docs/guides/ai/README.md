---
date: 2026-11-22
title: AI integration
sidebar.label: AI integration
---
# AI integration

Riebeckite gives AI tools the current development state instead of asking them to infer it. It does not apply content changes without human approval.

## In this section

- [Connect MCP](./mcp.md)
- [Project guidance for AI](./project-guidance.md)
- [Capability boundaries](./boundaries.md)

Choose only the integrations you need when creating a project:

```sh
npx create-riebeckite my-site --ai mcp,lint,rules,skills
```

`mcp` adds the MCP package, `lint` adds `npm run content:lint`, `rules` creates `RIEBECKITE_AI.md`, and `skills` creates `.agents/skills/`. Client configuration is not changed automatically.
