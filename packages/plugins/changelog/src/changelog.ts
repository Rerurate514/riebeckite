import type { ContentManifestEntry } from "@riebeckite/core";
import type {
  ChangelogCommit,
  ChangelogRecord,
  NoteChangeHistory,
  ResolvedChangelogOptions,
  SiteChangelog,
  SiteChangelogEntry,
  SiteChangelogNote,
} from "./types.js";

/**
 * Converts a lookback window in days to the ISO timestamp Git's `--since`
 * accepts. Pure so callers can compute it once per build.
 */
export function resolveLookbackSince(
  lookbackDays: number | undefined,
  now: Date = new Date(),
): string | undefined {
  if (lookbackDays === undefined) return undefined;
  const since = now.getTime() - lookbackDays * 24 * 60 * 60 * 1000;
  return new Date(since).toISOString();
}

/** Formats an ISO commit date for display. */
export function formatChangelogDate(
  isoDate: string,
  options: ResolvedChangelogOptions,
): string {
  if (options.dateFormat === "iso") return isoDate.slice(0, 10);

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;

  return new Intl.DateTimeFormat(options.locale, {
    dateStyle: options.dateFormat === "long" ? "long" : "medium",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Filters commits to the lookback window and returns them newest first.
 * Git already returns newest first; sorting keeps the dataset deterministic
 * when commits share a timestamp.
 */
export function filterChangelogCommits(
  commits: readonly ChangelogCommit[],
  options: ResolvedChangelogOptions,
): ChangelogCommit[] {
  const cutoff = resolveCutoff(options.lookbackDays);
  return commits
    .filter((commit) => cutoff === null || Date.parse(commit.date) >= cutoff)
    .toSorted(compareCommitsDescending);
}

/** Builds the per-note history for one entry. */
export function buildNoteChangeHistory(
  entry: ContentManifestEntry,
  commits: readonly ChangelogCommit[],
  options: ResolvedChangelogOptions,
): NoteChangeHistory {
  return {
    slug: entry.slug,
    permalink: entry.permalink,
    title: entry.title,
    commits: filterChangelogCommits(commits, options)
      .slice(0, options.maxPerNote)
      .map((commit) => toChangelogRecord(commit, options)),
  };
}

/**
 * Builds the site-wide changelog dataset. Each commit is linked to the notes
 * it touched by matching changed paths against the manifest content index.
 */
export function buildSiteChangelog(args: {
  entries: readonly ContentManifestEntry[];
  commits: readonly ChangelogCommit[];
  contentIndex: Map<string, string>;
  options: ResolvedChangelogOptions;
}): SiteChangelog {
  const byPath = invertContentIndex(args.contentIndex, args.entries);
  const bySlug = new Map(args.entries.map((entry) => [entry.slug, entry]));

  const entries = filterChangelogCommits(args.commits, args.options)
    .slice(0, args.options.maxSiteWide)
    .map(
      (commit): SiteChangelogEntry => ({
        ...toChangelogRecord(commit, args.options),
        notes: resolveCommitNotes(commit, byPath, bySlug),
      }),
    );

  return { entries };
}

function toChangelogRecord(
  commit: ChangelogCommit,
  options: ResolvedChangelogOptions,
): ChangelogRecord {
  return {
    hash: commit.hash,
    shortHash: commit.shortHash,
    date: formatChangelogDate(commit.date, options),
    dateIso: commit.date,
    subject: commit.subject,
    author: commit.author,
  };
}

function resolveCommitNotes(
  commit: ChangelogCommit,
  byPath: Map<string, string>,
  bySlug: Map<string, ContentManifestEntry>,
): SiteChangelogNote[] {
  const notes = new Map<string, SiteChangelogNote>();

  for (const file of commit.files) {
    const slug = byPath.get(normalizePath(file));
    if (!slug) continue;
    const entry = bySlug.get(slug);
    if (!entry) continue;
    notes.set(slug, {
      slug: entry.slug,
      permalink: entry.permalink,
      title: entry.title,
    });
  }

  return [...notes.values()].toSorted((a, b) => a.title.localeCompare(b.title));
}

function invertContentIndex(
  contentIndex: Map<string, string>,
  entries: readonly ContentManifestEntry[],
): Map<string, string> {
  const byPath = new Map<string, string>();
  for (const entry of entries) {
    const path = contentIndex.get(entry.slug.toLowerCase());
    if (path) byPath.set(normalizePath(path), entry.slug);
  }
  return byPath;
}

function resolveCutoff(lookbackDays: number | undefined): number | null {
  if (lookbackDays === undefined) return null;
  return Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
}

function compareCommitsDescending(
  a: ChangelogCommit,
  b: ChangelogCommit,
): number {
  const difference = Date.parse(b.date) - Date.parse(a.date);
  if (difference !== 0) return difference;
  return b.hash.localeCompare(a.hash);
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}
