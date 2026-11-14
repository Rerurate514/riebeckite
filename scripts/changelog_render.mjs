import {
  CHANGE_TYPES,
  REPOSITORY_URL,
  TYPE_HEADINGS,
} from "./changelog_schema.mjs";

export function linkForReference(value, kind) {
  if (value === "") {
    return null;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  if (kind === "adr") {
    return `${REPOSITORY_URL}/blob/main/${value}`;
  }
  return `${REPOSITORY_URL}/${kind}/${value}`;
}

export function renderEntry(entry) {
  const lines = [];
  const bodyLines = entry.body.split(/\r?\n/);
  const breakingPrefix = entry.breaking ? "**Breaking:** " : "";

  lines.push(`- ${breakingPrefix}${bodyLines[0]}`);
  for (const line of bodyLines.slice(1)) {
    lines.push(line === "" ? "" : `  ${line.trimEnd()}`);
  }

  if (entry.packages.length > 0) {
    lines.push(
      `  Packages: ${entry.packages
        .map((packageName) => `\`${packageName}\``)
        .join(", ")}`,
    );
  }

  if (entry.migration !== "") {
    lines.push(`  Migration: ${entry.migration}`);
  }

  const references = [];
  const pr = linkForReference(entry.pr, "pull");
  const issue = linkForReference(entry.issue, "issues");
  const adr = linkForReference(entry.adr, "adr");

  if (pr) {
    references.push(`PR: ${pr}`);
  }
  if (issue) {
    references.push(`Issue: ${issue}`);
  }
  if (adr) {
    references.push(`ADR: ${adr}`);
  }
  if (references.length > 0) {
    lines.push(`  ${references.join(" · ")}`);
  }

  return lines.join("\n");
}

export function renderEntries(entries) {
  if (entries.length === 0) {
    return ["No user-facing changes recorded."];
  }

  const lines = [];

  if (entries.some((entry) => entry.breaking)) {
    lines.push(
      "> **Breaking changes are included.** Read the migration notes before upgrading.",
    );
    lines.push("");
  }

  for (const type of CHANGE_TYPES) {
    const typed = entries.filter((entry) => entry.type === type);
    if (typed.length === 0) {
      continue;
    }
    lines.push(`### ${TYPE_HEADINGS[type]}`);
    lines.push("");
    for (const entry of typed) {
      lines.push(renderEntry(entry));
      lines.push("");
    }
  }

  return lines.slice(0, -1);
}

export function compareLink(version, previousVersion) {
  if (previousVersion) {
    return `${REPOSITORY_URL}/compare/v${previousVersion}...v${version}`;
  }
  return `${REPOSITORY_URL}/releases/tag/v${version}`;
}

export function renderReleaseSection(release, previousVersion) {
  return [
    `## [${release.version}] - ${release.date}`,
    "",
    ...renderEntries(release.entries),
    "",
    `[${release.version}]: ${compareLink(release.version, previousVersion)}`,
  ];
}

export function renderChangelog({ unreleased, releases }) {
  const latest = releases[0]?.version;
  const lines = [
    "# Changelog",
    "",
    "All notable changes to Riebeckite are documented in this file.",
    "",
    "The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),",
    "and Riebeckite follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)",
    "from 1.0 onward. Before 1.0, minor releases may contain breaking changes.",
    "",
    "This changelog is generated from `changes/`. Do not edit it by hand.",
    "",
    latest
      ? `Release history in this file begins with ${releases.at(-1).version}. Earlier releases are available as Git tags and GitHub Releases.`
      : "Release history in this file begins with the first release after the change-entry system was introduced. Earlier releases are available as Git tags and GitHub Releases.",
    "",
    "## [Unreleased]",
    "",
    ...renderEntries(unreleased),
    "",
    latest
      ? `[Unreleased]: ${REPOSITORY_URL}/compare/v${latest}...HEAD`
      : `[Unreleased]: ${REPOSITORY_URL}/commits/main`,
  ];

  for (let index = 0; index < releases.length; index += 1) {
    const release = releases[index];
    const previousVersion = releases[index + 1]?.version;
    lines.push("", ...renderReleaseSection(release, previousVersion));
  }

  return `${lines.join("\n")}\n`;
}

export function renderReleaseNotes({ version, date, entries, changelogUrl }) {
  return [
    `# Riebeckite v${version}`,
    "",
    `Released ${date}.`,
    "",
    ...renderEntries(entries),
    "",
    "---",
    "",
    `Full changelog: ${changelogUrl}`,
    `Compare: ${compareLink(version, null)}`,
    "",
  ].join("\n");
}
