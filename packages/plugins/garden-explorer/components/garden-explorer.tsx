import {
  type GraphLayoutNode,
  layoutForceGraph,
  layoutRadialGraph,
  shouldGuardForceLayout,
} from "@riebeckite/core/client";
import { useEffect, useMemo, useState } from "hono/jsx";
import type {
  GardenExplorerData,
  GardenExplorerGraphMode,
  GardenExplorerNote,
} from "../src/garden-explorer.js";
import { getGardenExplorerLocalGraphNotes } from "../src/garden-explorer.js";
import { searchGardenExplorerNotes } from "../src/search-notes.js";
import { FilterList, NoteDetails, NoteList } from "./explorer-panels.js";

type Props = {
  data: GardenExplorerData;
};

type MobilePanel = "graph" | "explorer" | "details";
type ViewState = { x: number; y: number; scale: number };
type DragState =
  | { kind: "pan"; x: number; y: number }
  | {
      kind: "node";
      slug: string;
      startClientX: number;
      startClientY: number;
      hasMoved: boolean;
    }
  | null;

const GRAPH_WIDTH = 900;
const GRAPH_HEIGHT = 620;
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.4;
const DRAG_THRESHOLD_PX = 4;

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
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ x: 0, y: 0, scale: 1 });
  const [drag, setDrag] = useState<DragState>(null);
  const [suppressNodeNavigation, setSuppressNodeNavigation] = useState(false);
  const [pinnedNodes, setPinnedNodes] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [forceLayoutApproved, setForceLayoutApproved] = useState(false);

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
    const searched = query ? searchGardenExplorerNotes(base, query) : base;
    return searched;
  }, [props.data.notes, query, selectedTag, selectedFolder]);

  const listNotes = useMemo(() => filteredNotes.slice(0, 80), [filteredNotes]);

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
  const graphNotes = useMemo(() => {
    if (graphMode === "local") {
      return getGardenExplorerLocalGraphNotes(
        filteredNotes,
        selectedSlug,
        props.data.options.depth,
      );
    }
    const notes = filteredNotes;
    const selectedNote = noteBySlug.get(selectedSlug);
    if (selectedNote && !notes.some((n) => n.slug === selectedSlug)) {
      return [selectedNote, ...notes];
    }
    return notes;
  }, [
    filteredNotes,
    graphMode,
    selectedSlug,
    props.data.options.depth,
    noteBySlug,
  ]);
  const graphSlugSet = useMemo(
    () => new Set(graphNotes.map((note) => note.slug)),
    [graphNotes],
  );
  const graphEdges = useMemo(
    () =>
      visibleEdges.filter(
        (edge) =>
          graphSlugSet.has(edge.source) && graphSlugSet.has(edge.target),
      ),
    [visibleEdges, graphSlugSet],
  );
  const graphKey = useMemo(
    () => graphNotes.map((note) => note.slug).join("\0"),
    [graphNotes],
  );

  const shouldGuard = shouldGuardForceLayout({
    layout: props.data.options.layout,
    mode: graphMode,
    nodeCount: graphNotes.length,
    approved: forceLayoutApproved,
  });

  const baseGraphNodes = useMemo(() => {
    if (shouldGuard) {
      return layoutRadialGraph(graphNotes, {
        width: GRAPH_WIDTH,
        height: GRAPH_HEIGHT,
        centerSlug: selectedSlug,
      });
    }
    return layoutNodes(graphNotes, selectedSlug, props.data.options);
  }, [shouldGuard, graphNotes, selectedSlug, props.data.options]);
  const graphNodes = useMemo(
    () => applyPinnedNodes(baseGraphNodes, pinnedNodes),
    [baseGraphNodes, pinnedNodes],
  );
  const selectedNote = noteBySlug.get(selectedSlug) ?? listNotes[0] ?? null;
  const relatedNotes = useMemo(
    () => (selectedNote ? getRelatedNotes(selectedNote, props.data.notes) : []),
    [selectedNote, props.data.notes],
  );
  const emphasizedSlugs = useMemo(
    () => getRelatedSlugSet(selectedSlug, hoveredSlug, graphEdges),
    [selectedSlug, hoveredSlug, graphEdges],
  );

  useEffect(() => {
    if (filteredNotes.length === 0 || visibleSlugSet.has(selectedSlug)) return;
    setSelectedSlug(listNotes[0]?.slug ?? "");
  }, [filteredNotes, selectedSlug, visibleSlugSet, listNotes]);

  useEffect(() => {
    setHoveredSlug(null);
    setDrag(null);
    setSuppressNodeNavigation(false);
    setPinnedNodes({});
    setForceLayoutApproved(false);
  }, [graphKey, graphMode, props.data.options.layout]);

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

  const approveForceLayout = () => {
    setForceLayoutApproved(true);
  };

  const zoom = (delta: number, origin?: { x: number; y: number }) => {
    setView((current) => zoomView(current, delta, origin));
  };

  const toSvgPoint = (event: PointerEvent | WheelEvent) => {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * GRAPH_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * GRAPH_HEIGHT,
    };
  };

  const toGraphPoint = (event: PointerEvent, current: ViewState) => {
    const point = toSvgPoint(event);
    return {
      x: (point.x - current.x) / current.scale,
      y: (point.y - current.y) / current.scale,
    };
  };

  const startPan = (event: PointerEvent) => {
    const point = toSvgPoint(event);
    setDrag({ kind: "pan", x: point.x, y: point.y });
    (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
  };

  const movePan = (
    event: PointerEvent,
    currentDrag: Extract<DragState, { kind: "pan" }>,
  ) => {
    const point = toSvgPoint(event);
    setView((current) => ({
      ...current,
      x: current.x + point.x - currentDrag.x,
      y: current.y + point.y - currentDrag.y,
    }));
    setDrag({ kind: "pan", x: point.x, y: point.y });
  };

  const moveNode = (
    event: PointerEvent,
    currentDrag: Extract<DragState, { kind: "node" }>,
  ) => {
    const hasMoved =
      currentDrag.hasMoved ||
      Math.hypot(
        event.clientX - currentDrag.startClientX,
        event.clientY - currentDrag.startClientY,
      ) >= DRAG_THRESHOLD_PX;
    if (!hasMoved) return;

    const point = toGraphPoint(event, view);
    setSuppressNodeNavigation(true);
    setPinnedNodes((current) => ({ ...current, [currentDrag.slug]: point }));
    if (!currentDrag.hasMoved) setDrag({ ...currentDrag, hasMoved: true });
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
            {filteredNotes.length > listNotes.length && (
              <span class="rr-garden-explorer__count-badge">
                showing {listNotes.length} of {filteredNotes.length}
              </span>
            )}
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
            {graphMode === "local" ? "Local" : "Global"} graph ·{" "}
            {graphNotes.length} notes
            {graphMode === "global" &&
              filteredNotes.length !== graphNotes.length && (
                <>
                  {" (of "}
                  {filteredNotes.length}
                  {" filtered)"}
                </>
              )}
            {shouldGuard && (
              <span class="rr-garden-explorer__perf-warning" aria-live="polite">
                ⚠ Force layout may freeze this page ({graphNotes.length} nodes)
              </span>
            )}
            {shouldGuard && !forceLayoutApproved && (
              <>
                <span class="rr-garden-explorer__perf-warning">
                  Force layout not run automatically.
                </span>
                <button
                  type="button"
                  class="rr-garden-explorer__force-approve"
                  onClick={approveForceLayout}
                >
                  Run force layout anyway
                </button>
              </>
            )}
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
          onWheel={(event: WheelEvent) => {
            event.preventDefault();
            zoom(event.deltaY > 0 ? -0.1 : 0.1, toSvgPoint(event));
          }}
          onPointerDown={(event: PointerEvent) => {
            const target = event.target as Element;
            if (target.closest(".garden-graph__node")) return;
            startPan(event);
          }}
          onPointerMove={(event: PointerEvent) => {
            if (!drag) return;
            if (drag.kind === "pan") {
              movePan(event, drag);
              return;
            }
            moveNode(event, drag);
          }}
          onPointerUp={(event: PointerEvent) => {
            setDrag(null);
            const svg = event.currentTarget as SVGSVGElement;
            if (svg.hasPointerCapture(event.pointerId)) {
              svg.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={() => {
            setDrag(null);
            setSuppressNodeNavigation(false);
          }}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
            {graphEdges.map((edge) => {
              const source = graphNodes.get(edge.source);
              const target = graphNodes.get(edge.target);
              if (!source || !target) return null;
              const emphasized =
                emphasizedSlugs.has(edge.source) &&
                emphasizedSlugs.has(edge.target);
              return (
                <line
                  class="garden-graph__edge"
                  data-muted={
                    emphasizedSlugs.size > 0 && !emphasized ? "true" : "false"
                  }
                  data-emphasized={emphasized ? "true" : "false"}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  key={`${edge.source}-${edge.target}`}
                />
              );
            })}
            {graphNotes.map((note) => {
              const node = graphNodes.get(note.slug);
              if (!node) return null;
              const selected = note.slug === selectedSlug;
              const active =
                emphasizedSlugs.size === 0 || emphasizedSlugs.has(note.slug);
              return (
                <g
                  class="garden-graph__node"
                  data-muted={active ? "false" : "true"}
                  key={note.slug}
                  onPointerEnter={() => setHoveredSlug(note.slug)}
                  onPointerLeave={() => setHoveredSlug(null)}
                >
                  <a
                    href={note.permalink}
                    aria-label={`Open ${note.title}`}
                    onClick={(event) => {
                      event.preventDefault();
                      if (suppressNodeNavigation) {
                        setSuppressNodeNavigation(false);
                        return;
                      }
                      navigateToNote(note.slug);
                    }}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={
                        selected
                          ? 15
                          : node.radius * props.data.options.nodeSize
                      }
                      data-selected={selected ? "true" : "false"}
                      onPointerDown={(event: PointerEvent) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSelectedSlug(note.slug);
                        setSuppressNodeNavigation(false);
                        setDrag({
                          kind: "node",
                          slug: note.slug,
                          startClientX: event.clientX,
                          startClientY: event.clientY,
                          hasMoved: false,
                        });
                        (
                          event.currentTarget as SVGCircleElement
                        ).setPointerCapture(event.pointerId);
                      }}
                    />
                    {props.data.options.showLabels ? (
                      <text x={node.x + 18} y={node.y + 5}>
                        {note.title}
                      </text>
                    ) : null}
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
          <p class="rr-garden-explorer__empty">Select a note to inspect links.</p>
        )}
      </aside>
    </div>
  );
}

function layoutNodes(
  notes: GardenExplorerNote[],
  selectedSlug: string,
  options: GardenExplorerData["options"],
): Map<string, GraphLayoutNode> {
  if (options.layout === "radial") {
    return layoutRadialGraph(notes, {
      width: GRAPH_WIDTH,
      height: GRAPH_HEIGHT,
      centerSlug: selectedSlug,
    });
  }

  return layoutForceGraph(notes, {
    width: GRAPH_WIDTH,
    height: GRAPH_HEIGHT,
    centerSlug: selectedSlug,
    linkDistance: options.linkDistance,
    repulsion: options.repulsion,
  });
}

function applyPinnedNodes(
  layout: Map<string, GraphLayoutNode>,
  pinnedNodes: Record<string, { x: number; y: number }>,
): Map<string, GraphLayoutNode> {
  const next = new Map(layout);
  for (const [slug, point] of Object.entries(pinnedNodes)) {
    const current = next.get(slug);
    if (current) next.set(slug, { ...current, x: point.x, y: point.y });
  }
  return next;
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

function getRelatedSlugSet(
  selectedSlug: string,
  hoveredSlug: string | null,
  edges: { source: string; target: string }[],
): Set<string> {
  const origin = hoveredSlug ?? selectedSlug;
  if (!origin) return new Set();
  const related = new Set([origin]);
  for (const edge of edges) {
    if (edge.source === origin) related.add(edge.target);
    if (edge.target === origin) related.add(edge.source);
  }
  return related;
}

function panelClass(panel: MobilePanel, activePanel: MobilePanel): string {
  return `rr-garden-explorer__panel rr-garden-explorer__panel--${panel}${
    panel === activePanel ? " rr-garden-explorer__panel--active" : ""
  }`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function zoomView(
  current: ViewState,
  delta: number,
  origin = { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2 },
): ViewState {
  const scale = clamp(current.scale + delta, MIN_SCALE, MAX_SCALE);
  if (scale === current.scale) return current;
  const graphX = (origin.x - current.x) / current.scale;
  const graphY = (origin.y - current.y) / current.scale;
  return {
    x: origin.x - graphX * scale,
    y: origin.y - graphY * scale,
    scale,
  };
}
