import type { GardenExplorerNote } from "../src/garden-explorer.js";
import type { GardenExplorerLabels } from "../src/labels.js";

export function FilterList(props: {
  title: string;
  items: { key: string; label: string; count: number }[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div class="rr-garden-explorer__section">
      <p class="rr-garden-explorer__eyebrow">{props.title}</p>
      <div class="rr-garden-explorer__chips">
        {props.items.slice(0, 28).map((item) => (
          <button
            type="button"
            class="rr-garden-explorer__chip"
            aria-pressed={props.selectedKey === item.key}
            onClick={() => props.onSelect(item.key)}
            key={item.key}
          >
            <span>{item.label}</span>
            <span>{item.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NoteList(props: {
  notes: GardenExplorerNote[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <ul class="rr-garden-explorer__note-list">
      {props.notes.map((note) => (
        <li key={note.slug}>
          <button
            type="button"
            aria-pressed={props.selectedSlug === note.slug}
            onClick={() => props.onSelect(note.slug)}
          >
            <span>{note.title}</span>
            <small>{note.folder}</small>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function NoteDetails(props: {
  note: GardenExplorerNote;
  noteBySlug: Map<string, GardenExplorerNote>;
  relatedNotes: GardenExplorerNote[];
  onSelect: (slug: string) => void;
  labels: GardenExplorerLabels;
}) {
  return (
    <div class="rr-garden-explorer__details">
      <p class="rr-garden-explorer__eyebrow">{props.labels.selectedNote}</p>
      <h2>
        <a href={props.note.permalink}>{props.note.title}</a>
      </h2>
      <p class="rr-garden-explorer__path">{props.note.slug}</p>
      {props.note.excerpt && <p>{props.note.excerpt}</p>}
      <div class="rr-garden-explorer__tag-row">
        {props.note.tags.map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
      </div>
      <LinkedNoteSection
        title={props.labels.outgoingLinks}
        emptyLabel={props.labels.noNotes}
        slugs={props.note.outgoing}
        noteBySlug={props.noteBySlug}
        onSelect={props.onSelect}
      />
      <LinkedNoteSection
        title={props.labels.backlinks}
        emptyLabel={props.labels.noNotes}
        slugs={props.note.backlinks}
        noteBySlug={props.noteBySlug}
        onSelect={props.onSelect}
      />
      <div class="rr-garden-explorer__section rr-garden-explorer__section--flush">
        <p class="rr-garden-explorer__eyebrow">{props.labels.relatedNotes}</p>
        <NoteList
          notes={props.relatedNotes}
          selectedSlug={props.note.slug}
          onSelect={props.onSelect}
        />
      </div>
    </div>
  );
}

function LinkedNoteSection(props: {
  title: string;
  emptyLabel: string;
  slugs: string[];
  noteBySlug: Map<string, GardenExplorerNote>;
  onSelect: (slug: string) => void;
}) {
  const notes = props.slugs
    .map((slug) => props.noteBySlug.get(slug))
    .filter((note): note is GardenExplorerNote => note !== undefined);

  return (
    <div class="rr-garden-explorer__section rr-garden-explorer__section--flush">
      <p class="rr-garden-explorer__eyebrow">{props.title}</p>
      {notes.length > 0 ? (
        <NoteList notes={notes} selectedSlug="" onSelect={props.onSelect} />
      ) : (
        <p class="rr-garden-explorer__empty">{props.emptyLabel}</p>
      )}
    </div>
  );
}
