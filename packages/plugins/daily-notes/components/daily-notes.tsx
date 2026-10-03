import type { DailyNote } from "../src/daily-notes.js";

const DEFAULT_LIMIT = 5;

type Props = {
  notes: DailyNote[];
  limit?: number;
};

export default function DailyNotes(props: Props) {
  const limit = props.limit ?? DEFAULT_LIMIT;
  const notes = props.notes.slice(0, Math.max(0, limit));

  if (notes.length === 0) return null;

  return (
    <section
      class="daily-notes rr-daily-notes"
      aria-labelledby="daily-notes-title"
    >
      <div class="daily-notes__header">
        <p class="daily-notes__eyebrow">DAILY NOTES</p>
        <h2 class="daily-notes__title" id="daily-notes-title">
          Recent Daily Notes
        </h2>
      </div>
      <ul class="daily-notes__list">
        {notes.map((note) => (
          <li class="daily-notes__item" key={note.slug}>
            <div class="daily-notes__meta">
              {note.date.length > 0 ? (
                <time class="daily-notes__date" dateTime={note.date}>
                  {note.dateDisplay}
                </time>
              ) : null}
              {note.sourceUrl !== null ? (
                <a class="daily-notes__source" href={note.sourceUrl}>
                  {resolveSourceLabel(note)}
                </a>
              ) : null}
            </div>
            <p class="daily-notes__snippet">{note.snippet}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function resolveSourceLabel(note: DailyNote): string {
  if (note.sourceTitle !== null && note.sourceTitle.length > 0) {
    return note.sourceTitle;
  }
  return note.sourceUrl ?? "";
}
