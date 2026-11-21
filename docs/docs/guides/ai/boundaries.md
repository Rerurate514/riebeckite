---
date: 2026-11-22
title: AI capability boundaries
sidebar.label: Safety boundaries
---
# AI capability boundaries

MCP provides local reads and mutation validation, plus a read-only npm registry lookup for official Plugin packages. With the optional mutation token, it can create a stored mutation plan and apply it, but only after a human approves the plan with the CLI. MCP cannot approve a plan itself; human approval and the existing CLI flow remain required for changes.

Skill synchronization is never automatic. Review updates before accepting them, and back up customized Skills when needed. If MCP is unavailable, generated Skills fall back to CLI checks.
