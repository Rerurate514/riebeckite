import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type {
  ChangelogRecord,
  NoteChangeHistory,
  ResolvedChangelogOptions,
  SiteChangelog,
  SiteChangelogEntry,
} from "./types.js";

/** Boolean attribute that marks a rendered per-note history section. */
export const CHANGELOG_NOTE_ATTRIBUTE = "data-changelog-note";

/** Boolean attribute that marks the rendered site-wide changelog section. */
export const CHANGELOG_SITE_ATTRIBUTE = "data-changelog-site";

/**
 * Renders a note's change history. Returns an empty string when there is
 * nothing to show, so callers can leave the entry's HTML untouched.
 */
export function renderNoteChangeHistory(
  history: NoteChangeHistory,
  options: ResolvedChangelogOptions,
): string {
  if (history.commits.length === 0) return "";

  const className = escapeHtmlAttribute(options.className);
  const heading = options.heading
    ? renderHeading(className, options.perNoteHeading)
    : "";
  const items = history.commits
    .map((commit) => renderCommit(commit, className, options, []))
    .join("");

  return `<section class="${className} ${className}--note" ${CHANGELOG_NOTE_ATTRIBUTE}>${heading}<ol class="${className}__list">${items}</ol></section>`;
}

/**
 * Renders the site-wide changelog dataset. Returns an empty string when there
 * are no commits, so callers can leave the target's HTML untouched.
 */
export function renderSiteChangelog(
  changelog: SiteChangelog,
  options: ResolvedChangelogOptions,
): string {
  if (changelog.entries.length === 0) return "";

  const className = escapeHtmlAttribute(options.className);
  const heading = options.heading
    ? renderHeading(className, options.siteWideHeading)
    : "";
  const items = changelog.entries
    .map((entry) => renderCommit(entry, className, options, entry.notes))
    .join("");

  return `<section class="${className} ${className}--site" ${CHANGELOG_SITE_ATTRIBUTE}>${heading}<ol class="${className}__list">${items}</ol></section>`;
}

function renderHeading(className: string, text: string): string {
  return `<h2 class="${className}__heading">${escapeHtml(text)}</h2>`;
}

function renderCommit(
  commit: ChangelogRecord,
  className: string,
  options: ResolvedChangelogOptions,
  notes: SiteChangelogEntry["notes"],
): string {
  const author = options.showAuthor
    ? `<span class="${className}__author">${escapeHtml(commit.author)}</span>`
    : "";
  const subject = `<span class="${className}__subject">${escapeHtml(
    commit.subject,
  )}</span>`;
  const hash = `<code class="${className}__hash" title="${escapeHtmlAttribute(
    commit.hash,
  )}">${escapeHtml(commit.shortHash)}</code>`;
  const date = `<time class="${className}__date" datetime="${escapeHtmlAttribute(
    commit.dateIso,
  )}">${escapeHtml(commit.date)}</time>`;
  const noteList = renderNotes(notes, className);

  return `<li class="${className}__item">${date}${subject}${author}${hash}${noteList}</li>`;
}

function renderNotes(
  notes: SiteChangelogEntry["notes"],
  className: string,
): string {
  if (notes.length === 0) return "";

  const items = notes
    .map(
      (note) =>
        `<li class="${className}__note"><a class="${className}__note-link" href="${escapeHtmlAttribute(
          note.permalink,
        )}">${escapeHtml(note.title)}</a></li>`,
    )
    .join("");

  return `<ul class="${className}__notes">${items}</ul>`;
}
