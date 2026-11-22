import fs from "node:fs/promises";
import path from "node:path";
import type { DevelopmentDiagnostic } from "@riebeckite/diagnostics";
import type { RiebeckiteProject } from "../application_root.js";
import { cliVersion } from "../version.js";

const versionPattern = /^riebeckiteVersion:\s*["']?([^"'\n]+)["']?/m;

type SkillVersion = {
  readonly path: string;
  readonly version?: string;
};

export async function collectAiDiagnostics(
  project: RiebeckiteProject,
): Promise<readonly DevelopmentDiagnostic[]> {
  const root = project.projectRoot;
  const [agents, guide, skills, dependencies] = await Promise.all([
    readText(path.join(root, "AGENTS.md")),
    readText(path.join(root, "RIEBECKITE_AI.md")),
    readSkills(root),
    readDependencies(root),
  ]);
  const hasSkills = skills.length > 0;
  const hasAiPackage = dependencies?.has("@riebeckite/ai") === true;
  const hasMcpPackage = dependencies?.has("@riebeckite/mcp") === true;
  if (
    agents === undefined &&
    guide === undefined &&
    !hasSkills &&
    !hasAiPackage
  ) {
    return [];
  }

  const diagnostics: DevelopmentDiagnostic[] = [];
  const riebeckiteArtifact = guide !== undefined || hasSkills || hasAiPackage;
  if (riebeckiteArtifact && (agents === undefined || guide === undefined)) {
    const missing = [
      agents === undefined ? "AGENTS.md" : undefined,
      guide === undefined ? "RIEBECKITE_AI.md" : undefined,
    ].filter((name): name is string => name !== undefined);
    diagnostics.push({
      code: "AI_GUIDANCE_INCOMPLETE",
      category: "ai",
      severity: "warning",
      message: `AI guidance is missing ${missing.join(" and ")}.`,
      subject: { kind: "ai", value: missing[0] },
      details:
        "Run `riebeckite ai setup` to add the missing guidance. Existing files are kept.",
      fix: {
        kind: "review",
        description: "Review the generated guidance before committing it.",
      },
    });
  }

  const guideVersion = guide === undefined ? undefined : versionOf(guide);
  if (guideVersion !== undefined && guideVersion !== cliVersion) {
    diagnostics.push({
      code: "AI_RULES_OUTDATED",
      category: "ai",
      severity: "warning",
      message: `RIEBECKITE_AI.md was generated for ${guideVersion}.`,
      subject: { kind: "ai", value: "RIEBECKITE_AI.md" },
      location: { file: "RIEBECKITE_AI.md" },
      details: `The installed Riebeckite CLI is ${cliVersion}.`,
      fix: {
        kind: "review",
        description:
          "Review RIEBECKITE_AI.md and update its commands, or move it aside and run `riebeckite ai setup` again.",
      },
    });
  }

  const outdated = skills.filter((skill) => skill.version !== cliVersion);
  if (outdated.length > 0) {
    diagnostics.push({
      code: "AI_SKILLS_OUTDATED",
      category: "ai",
      severity: "warning",
      message: `${outdated.length} generated Skill${outdated.length === 1 ? "" : "s"} ${outdated.length === 1 ? "is" : "are"} outdated.`,
      subject: { kind: "ai", value: ".agents/skills" },
      location: { file: outdated[0].path },
      details: outdated
        .map((skill) => `${skill.path}: ${skill.version ?? "no version"}`)
        .join("; "),
      fix: {
        kind: "review",
        description:
          "Run `riebeckite skills sync` and review each replacement.",
      },
    });
  }

  if ((hasAiPackage || hasSkills) && !hasMcpPackage) {
    diagnostics.push({
      code: "AI_MCP_DEPENDENCY_MISSING",
      category: "ai",
      severity: "warning",
      message: "@riebeckite/mcp is not installed.",
      subject: { kind: "ai", value: "@riebeckite/mcp" },
      location: { file: "package.json" },
      details:
        "The MCP server is needed for AI clients to read project context and diagnostics.",
      fix: {
        kind: "review",
        description:
          "Run `riebeckite ai setup` to add the dependency, then install it.",
      },
    });
  }

  return diagnostics;
}

async function readSkills(root: string): Promise<readonly SkillVersion[]> {
  const directory = path.join(root, ".agents", "skills");
  const entries = await fs
    .readdir(directory, { withFileTypes: true })
    .catch(() => undefined);
  if (entries === undefined) return [];
  const skills: SkillVersion[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("riebeckite-")) continue;
    const file = path.join(directory, entry.name, "SKILL.md");
    const content = await readText(file);
    if (content === undefined) continue;
    skills.push({
      path: path.relative(root, file).replace(/\\/g, "/"),
      version: versionOf(content),
    });
  }
  return skills;
}

async function readDependencies(
  root: string,
): Promise<ReadonlySet<string> | undefined> {
  const raw = await readText(path.join(root, "package.json"));
  if (raw === undefined) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed)) return undefined;
  const names = new Set<string>();
  for (const key of ["dependencies", "devDependencies"]) {
    const value = parsed[key];
    if (isRecord(value)) {
      for (const name of Object.keys(value)) names.add(name);
    }
  }
  return names;
}

function versionOf(content: string): string | undefined {
  return versionPattern.exec(content)?.[1];
}

async function readText(file: string): Promise<string | undefined> {
  return await fs.readFile(file, "utf8").catch(() => undefined);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
