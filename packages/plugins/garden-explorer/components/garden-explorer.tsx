import { buildGraphDocument } from "@riebeckite/graph";
import GraphView from "@riebeckite/graph/ui";
import { useEffect, useMemo, useState } from "hono/jsx";
import type {
  GardenExplorerData,
  GardenExplorerGraphMode,
  GardenExplorerNote,
} from "../src/garden-explorer.js";
import { searchGardenExplorerNotes } from "../src/search-notes.js";
import { FilterList, NoteDetails, NoteList } from "./explorer-panels.js";

type Props = {
  data: GardenExplorerData;
};

type MobilePanel = "graph" | "explorer" | "details";

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
  const [graphMode, setGraphMode] = useState<GardenExplorerGraphMode>("local");

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
    return query ? searchGardenExplorerNotes(base, query) : base;
  }, [props.data.notes, query, selectedTag, selectedFolder]);

  const listNotes = useMemo(() => filteredNotes.slice(0, 80), [filteredNotes]);
  const selectedNote = noteBySlug.get(selectedSlug) ?? listNotes[0] ?? null;
  const relatedNotes = useMemo(
    () => (selectedNote ? getRelatedNotes(selectedNote, props.data.notes) : []),
    [selectedNote, props.data.notes],
  );

  const graphSearch = useMemo(() => {
    const terms = [query.trim()];
    if (selectedTag) terms.push(`tag:${quoteQuery(selectedTag)}`);
    if (selectedFolder) terms.push(`path:${quoteQuery(selectedFolder)}`);
    return terms.filter(Boolean).join(" ");
  }, [query, selectedTag, selectedFolder]);

  const initialSettings = useMemo(
    () => ({
      depth: props.data.options.depth,
      nodeSize: props.data.options.nodeSize,
      linkDistance: props.data.options.linkDistance,
      repelForce: Math.min(2000, Math.max(0, props.data.options.repulsion / 3)),
    }),
    [props.data.options],
  );

  const graphDocument = useMemo(
    () =>
      props.data.graph ??
      buildGraphDocument(
        props.data.notes.map((note) => ({
          slug: note.slug,
          title: note.title,
          permalink: note.permalink,
          tags: note.tags,
          date: note.date,
          links: [...note.outgoing, ...note.backlinks].map((slug) => ({
            raw: slug,
            slug,
            kind: "note" as const,
          })),
        })),
        { centerSlug: props.data.notes[0]?.slug ?? null },
      ),
    [props.data.graph, props.data.notes],
  );

  useEffect(() => {
    if (
      filteredNotes.length === 0 ||
      filteredNotes.some((note) => note.slug === selectedSlug)
    ) {
      return;
    }
    setSelectedSlug(listNotes[0]?.slug ?? "");
  }, [filteredNotes, selectedSlug, listNotes]);

  const selectNote = (slug: string) => {
    setSelectedSlug(slug);
    setMobilePanel("details");
  };

  const navigateToNote = (slug: string) => {
    const note = noteBySlug.get(slug);
    if (!note) return;
    window.location.href = note.permalink;
  };

  const clearFilters = () => {
    setQuery("");
    setSelectedTag(null);
    setSelectedFolder(null);
  };

  return (
    <div class="rr-garden-explorer" data-garden-explorer>
      <fieldset class="rr-garden-explorer__mobile-tabs">
        <legend class="sr-only">Explorer panels</legend>
        {(["graph", "explorer", "details"] as const).map((panel) => (
          <button
            type="button"
            class="rr-garden-explorer__mobile-tab"
            aria-pressed={mobilePanel === panel}
            onClick={() => setMobilePanel(panel)}
          >
            {panel}
          </button>
        ))}
      </fieldset>

      <aside class={panelClass("explorer", mobilePanel)}>
        <div class="rr-garden-explorer__section">
          <p class="rr-garden-explorer__eyebrow">Explorer</p>
          <label class="rr-garden-explorer__search">
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
            class="rr-garden-explorer__text-button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>

        {props.data.options.showTags ? (
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
        ) : null}
        {props.data.options.showFolders ? (
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
        ) : null}

        <div class="rr-garden-explorer__section">
          <p class="rr-garden-explorer__eyebrow">
            Notes
            {filteredNotes.length > listNotes.length ? (
              <span class="rr-garden-explorer__count-badge">
                showing {listNotes.length} of {filteredNotes.length}
              </span>
            ) : null}
          </p>
          <NoteList
            notes={listNotes}
            selectedSlug={selectedSlug}
            onSelect={selectNote}
          />
        </div>
      </aside>

      <section class={panelClass("graph", mobilePanel)} aria-label="Note graph">
        <div class="rr-garden-explorer__graph-toolbar">
          <span>
            {graphMode === "local"
              ? "Local graph"
              : `Global graph · ${filteredNotes.length} notes`}
          </span>
          <div>
            <button
              type="button"
              aria-pressed={graphMode === "local"}
              onClick={() => setGraphMode("local")}
            >
              Local
            </button>
            <button
              type="button"
              aria-pressed={graphMode === "global"}
              onClick={() => setGraphMode("global")}
            >
              Global
            </button>
          </div>
        </div>
        <div class="rr-garden-explorer__graph-host">
          <GraphView
            document={graphDocument}
            mode={graphMode}
            centerId={selectedSlug}
            selectedId={selectedSlug}
            search={graphSearch}
            initialSettings={initialSettings}
            storageKey="riebeckite-garden-graph-settings"
            showHeader={false}
            showModeLabel={false}
            onSearchChange={setQuery}
            onSelect={(node) => {
              if (node?.kind === "note" && node.slug) {
                setSelectedSlug(node.slug);
              }
            }}
            onOpen={(node) => {
              if (node.slug) navigateToNote(node.slug);
            }}
            onShowLocal={(node) => {
              if (!node.slug) return;
              setSelectedSlug(node.slug);
              setGraphMode("local");
              setMobilePanel("graph");
            }}
          />
        </div>
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
          <p class="rr-garden-explorer__empty">
            Select a note to inspect links.
          </p>
        )}
      </aside>
    </div>
  );
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
  return `rr-garden-explorer__panel rr-garden-explorer__panel--${panel}${
    panel === activePanel ? " rr-garden-explorer__panel--active" : ""
  }`;
}

function quoteQuery(value: string): string {
  return /[\s"]/u.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}
