# @riebeckite/ai

AI integration configuration for Riebeckite: generated guidance, Skills, client MCP configuration, and mutation policy.

[日本語](./README_ja.md)

`getAiSetupFiles` builds `RIEBECKITE_AI.md`, `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, and generated Skills. `aiRuleFiles` writes the guidance and `aiSkillFiles` writes the Skills; both accept the Riebeckite version so generated files record it.

`mergeAiClientConfig` adds a project-local `riebeckite` MCP server to Claude, Cursor, VS Code, or OpenCode configuration while preserving other keys and servers. `createMutationPathPolicy` and `validateAiIntegration` define and validate the optional `integrations.ai` mutation boundary.
