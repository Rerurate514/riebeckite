import type { GardenExplorerNote } from "../src/garden-explorer.js";

export function FilterList(props: {
  title: string;
  items: { key: string; label: string; count: number }[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div class="garden-explorer__section">
      <p class="garden-explorer__eyebrow">{props.title}</p>
      <div class="garden-explorer__chips">
        {props.items.slice(0, 28).map((item) => (
          <button
            type="button"
            class="garden-explorer__chip"
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
    <ul class="garden-explorer__note-list">
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
}) {
  return (
    <div class="garden-explorer__details">
      <p class="garden-explorer__eyebrow">Selected Note</p>
      <h2>
        <a href={props.note.permalink}>{props.note.title}</a>
      </h2>
      <p class="garden-explorer__path">{props.note.slug}</p>
      {props.note.excerpt && <p>{props.note.excerpt}</p>}
      <div class="garden-explorer__tag-row">
        {props.note.tags.map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
      </div>
      <LinkedNoteSection
        title="Outgoing Links"
        slugs={props.note.outgoing}
        noteBySlug={props.noteBySlug}
        onSelect={props.onSelect}
      />
      <LinkedNoteSection
        title="Backlinks"
        slugs={props.note.backlinks}
        noteBySlug={props.noteBySlug}
        onSelect={props.onSelect}
      />
      <div class="garden-explorer__section garden-explorer__section--flush">
        <p class="garden-explorer__eyebrow">Related Notes</p>
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
  slugs: string[];
  noteBySlug: Map<string, GardenExplorerNote>;
  onSelect: (slug: string) => void;
}) {
  const notes = props.slugs
    .map((slug) => props.noteBySlug.get(slug))
    .filter((note): note is GardenExplorerNote => note !== undefined);

  return (
    <div class="garden-explorer__section garden-explorer__section--flush">
      <p class="garden-explorer__eyebrow">{props.title}</p>
      {notes.length > 0 ? (
        <NoteList notes={notes} selectedSlug="" onSelect={props.onSelect} />
      ) : (
        <p class="garden-explorer__empty">No notes.</p>
      )}
    </div>
  );
}
