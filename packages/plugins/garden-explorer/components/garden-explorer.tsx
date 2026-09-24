/** @jsxImportSource hono/jsx */
import { searchItems } from "@riebeckite/plugin-search";
import { useEffect, useMemo, useState } from "hono/jsx";
import type {
  GardenExplorerData,
  GardenExplorerNote,
} from "../src/garden-explorer";
import { layoutRadialGraph } from "../src/graph";

type Props = {
  data: GardenExplorerData;
};

type MobilePanel = "graph" | "explorer" | "details";

const GRAPH_WIDTH = 900;
const GRAPH_HEIGHT = 620;
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.4;

export default function GardenExplorer(props: Props) {
  const noteBySlug = useMemo(
    () => new Map(props.data.notes.map((note) => [note.slug, note])),
    [props.data.notes],
  );
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState(
    () => props.data.notes[0]?.slug ?? "",
  );
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("graph");
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const note = params.get("note");
    const tag = params.get("tag");
    const folder = params.get("folder");
    if (note && noteBySlug.has(note)) setSelectedSlug(note);
    if (tag) setSelectedTag(tag);
    if (folder) setSelectedFolder(folder);
  }, [noteBySlug]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedSlug) params.set("note", selectedSlug);
    if (selectedTag) params.set("tag", selectedTag);
    if (selectedFolder) params.set("folder", selectedFolder);
    const next = params.toString() ? `/explore?${params}` : "/explore";
    window.history.replaceState(null, "", next);
  }, [selectedSlug, selectedTag, selectedFolder]);

  const filteredNotes = useMemo(() => {
    const base = props.data.notes.filter((note) => {
      if (selectedTag && !note.tags.includes(selectedTag)) return false;
      if (selectedFolder && note.folder !== selectedFolder) return false;
      return true;
    });
    const searched = query ? searchItems(base, query) : base;
    return searched.slice(0, 80);
  }, [props.data.notes, query, selectedTag, selectedFolder]);

  const visibleSlugSet = useMemo(
    () => new Set(filteredNotes.map((note) => note.slug)),
    [filteredNotes],
  );
  const visibleEdges = useMemo(
    () =>
      props.data.edges.filter(
        (edge) =>
          visibleSlugSet.has(edge.source) && visibleSlugSet.has(edge.target),
      ),
    [props.data.edges, visibleSlugSet],
  );
  const graphNodes = useMemo(
    () => layoutNodes(filteredNotes, selectedSlug),
    [filteredNotes, selectedSlug],
  );
  const selectedNote = noteBySlug.get(selectedSlug) ?? filteredNotes[0] ?? null;
  const relatedNotes = useMemo(
    () => (selectedNote ? getRelatedNotes(selectedNote, props.data.notes) : []),
    [selectedNote, props.data.notes],
  );

  const selectNote = (slug: string) => {
    setSelectedSlug(slug);
    setMobilePanel("details");
  };

  const clearFilters = () => {
    setQuery("");
    setSelectedTag(null);
    setSelectedFolder(null);
  };

  const zoom = (delta: number) => {
    setView((current) => ({
      ...current,
      scale: clamp(current.scale + delta, MIN_SCALE, MAX_SCALE),
    }));
  };

  return (
    <div class="garden-explorer" data-garden-explorer>
      <fieldset class="garden-explorer__mobile-tabs">
        <legend class="sr-only">Explorer panels</legend>
        {(["graph", "explorer", "details"] as const).map((panel) => (
          <button
            type="button"
            class="garden-explorer__mobile-tab"
            aria-pressed={mobilePanel === panel}
            onClick={() => setMobilePanel(panel)}
          >
            {panel}
          </button>
        ))}
      </fieldset>

      <aside class={panelClass("explorer", mobilePanel)}>
        <div class="garden-explorer__section">
          <p class="garden-explorer__eyebrow">Explorer</p>
          <label class="garden-explorer__search">
            <span class="sr-only">Search notes</span>
            <input
              type="search"
              value={query}
              placeholder="Search notes..."
              onInput={(event) =>
                setQuery((event.currentTarget as HTMLInputElement).value)
              }
            />
          </label>
          <button
            type="button"
            class="garden-explorer__text-button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>

        <FilterList
          title="Tags"
          items={props.data.tags.map((tag) => ({
            key: tag.name,
            label: `#${tag.name}`,
            count: tag.count,
          }))}
          selectedKey={selectedTag}
          onSelect={(key) => setSelectedTag(key === selectedTag ? null : key)}
        />
        <FilterList
          title="Folders"
          items={props.data.folders.map((folder) => ({
            key: folder.path,
            label: folder.path,
            count: folder.count,
          }))}
          selectedKey={selectedFolder}
          onSelect={(key) =>
            setSelectedFolder(key === selectedFolder ? null : key)
          }
        />

        <div class="garden-explorer__section">
          <p class="garden-explorer__eyebrow">Notes</p>
          <NoteList
            notes={filteredNotes}
            selectedSlug={selectedSlug}
            onSelect={selectNote}
          />
        </div>
      </aside>

      <section class={panelClass("graph", mobilePanel)} aria-label="Note graph">
        <div class="garden-explorer__graph-toolbar">
          <span>{filteredNotes.length} notes</span>
          <div>
            <button
              type="button"
              onClick={() => zoom(-0.2)}
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => zoom(0.2)}
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setView({ x: 0, y: 0, scale: 1 })}
            >
              Reset
            </button>
          </div>
        </div>
        <svg
          class="garden-graph"
          viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          role="img"
          aria-label="Interactive graph of notes and internal links"
          onWheel={(event) => {
            event.preventDefault();
            zoom(event.deltaY > 0 ? -0.1 : 0.1);
          }}
          onPointerMove={(event) => {
            if (event.buttons !== 1) return;
            setView((current) => ({
              ...current,
              x: current.x + event.movementX / current.scale,
              y: current.y + event.movementY / current.scale,
            }));
          }}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
            {visibleEdges.map((edge) => {
              const source = graphNodes.get(edge.source);
              const target = graphNodes.get(edge.target);
              if (!source || !target) return null;
              return (
                <line
                  class="garden-graph__edge"
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  key={`${edge.source}-${edge.target}`}
                />
              );
            })}
            {filteredNotes.map((note) => {
              const node = graphNodes.get(note.slug);
              if (!node) return null;
              const selected = note.slug === selectedSlug;
              return (
                <g class="garden-graph__node" key={note.slug}>
                  <a
                    href={`/explore?note=${encodeURIComponent(note.slug)}`}
                    aria-label={`Select ${note.title}`}
                    onClick={(event) => {
                      event.preventDefault();
                      selectNote(note.slug);
                    }}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={selected ? 15 : node.radius}
                      data-selected={selected ? "true" : "false"}
                    />
                    <text x={node.x + 18} y={node.y + 5}>
                      {note.title}
                    </text>
                  </a>
                </g>
              );
            })}
          </g>
        </svg>
      </section>

      <aside class={panelClass("details", mobilePanel)}>
        {selectedNote ? (
          <NoteDetails
            note={selectedNote}
            noteBySlug={noteBySlug}
            relatedNotes={relatedNotes}
            onSelect={selectNote}
          />
        ) : (
          <p class="garden-explorer__empty">Select a note to inspect links.</p>
        )}
      </aside>
    </div>
  );
}

function FilterList(props: {
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

function NoteList(props: {
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

function NoteDetails(props: {
  note: GardenExplorerNote;
  noteBySlug: Map<string, GardenExplorerNote>;
  relatedNotes: GardenExplorerNote[];
  onSelect: (slug: string) => void;
}) {
  return (
    <div class="garden-explorer__details">
      <p class="garden-explorer__eyebrow">Selected Note</p>
      <h2>
        <a href={`/${encodeURI(props.note.slug)}`}>{props.note.title}</a>
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

function layoutNodes(notes: GardenExplorerNote[], selectedSlug: string) {
  return layoutRadialGraph(notes, {
    width: GRAPH_WIDTH,
    height: GRAPH_HEIGHT,
    centerSlug: selectedSlug,
  });
}

function getRelatedNotes(
  selectedNote: GardenExplorerNote,
  notes: GardenExplorerNote[],
): GardenExplorerNote[] {
  const directSlugs = new Set([
    ...selectedNote.outgoing,
    ...selectedNote.backlinks,
  ]);
  const selectedTags = new Set(selectedNote.tags);

  return notes
    .filter((note) => note.slug !== selectedNote.slug)
    .map((note) => ({
      note,
      score:
        (directSlugs.has(note.slug) ? 8 : 0) +
        note.tags.filter((tag) => selectedTags.has(tag)).length * 3,
    }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.note.title.localeCompare(b.note.title, "ja"),
    )
    .slice(0, 8)
    .map((item) => item.note);
}

function panelClass(panel: MobilePanel, activePanel: MobilePanel): string {
  return `garden-explorer__panel garden-explorer__panel--${panel}${
    panel === activePanel ? " garden-explorer__panel--active" : ""
  }`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
