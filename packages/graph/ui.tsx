import { useEffect, useMemo, useRef, useState } from "hono/jsx";
import type { GraphRenderer, GraphRendererCallbacks } from "./client.js";
import { createGraphRenderer } from "./client.js";
import type {
  GraphDocument,
  GraphGroup,
  GraphMode,
  GraphNode,
  GraphSettings,
} from "./index.js";
import {
  buildVisibleGraph,
  DEFAULT_GRAPH_SETTINGS,
  GRAPH_SETTINGS_RANGES,
  hasDatedNodes,
  normalizeGraphSettings,
  readStoredGraphSettings,
  writeStoredGraphSettings,
} from "./index.js";

export type GraphViewProps = {
  document: GraphDocument;
  mode?: GraphMode;
  centerId?: string | null;
  initialSettings?: Partial<GraphSettings>;
  storageKey?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  selectedId?: string | null;
  onSelect?: (node: GraphNode | null) => void;
  onOpen?: (node: GraphNode) => void;
  onShowLocal?: (node: GraphNode) => void;
  expandable?: boolean;
  showHeader?: boolean;
  showModeLabel?: boolean;
  heading?: string;
  maxDepth?: number;
  class?: string;
};

const GROUP_COLORS = [
  "#e07a5f",
  "#3d85c6",
  "#6aa84f",
  "#c27ba0",
  "#e6b422",
  "#7c6ee6",
];

export default function GraphView(props: GraphViewProps) {
  const mode = props.mode ?? "global";
  const [settings, setSettings] = useState<GraphSettings>(() =>
    normalizeGraphSettings({
      ...DEFAULT_GRAPH_SETTINGS,
      ...props.initialSettings,
      search: props.search ?? props.initialSettings?.search ?? "",
      depth: Math.min(
        props.initialSettings?.depth ?? DEFAULT_GRAPH_SETTINGS.depth,
        props.maxDepth ?? GRAPH_SETTINGS_RANGES.depth.max,
      ),
    }),
  );
  const [storageReady, setStorageReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(
    props.selectedId ?? null,
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    node: GraphNode;
    x: number;
    y: number;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const groupCounter = useRef(0);

  const selectedId =
    props.selectedId !== undefined ? props.selectedId : selected;
  const visible = useMemo(
    () =>
      buildVisibleGraph({
        document: props.document,
        settings,
        mode,
        centerId: props.centerId,
      }),
    [props.document, settings, mode, props.centerId],
  );
  const dated = useMemo(() => hasDatedNodes(visible.nodes), [visible.nodes]);

  const callbacksRef = useRef<GraphRendererCallbacks>({});

  callbacksRef.current = {
    onSelect(node) {
      setSelected(node?.id ?? null);
      props.onSelect?.(node);
    },
    onOpen(node) {
      if (props.onOpen) {
        props.onOpen(node);
        return;
      }
      if (node.permalink) window.location.href = node.permalink;
    },
    onHover(node) {
      setHovered(node?.id ?? null);
    },
    onContextMenu(node, x, y) {
      setContextMenu({
        node,
        x: Math.min(x, window.innerWidth - 230),
        y: Math.min(y, window.innerHeight - 220),
      });
    },
    onAnimationChange(value) {
      setAnimating(value);
    },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const renderer = createGraphRenderer({
      canvas,
      reducedMotion: media.matches,
      onSelect: (node) => callbacksRef.current.onSelect?.(node),
      onOpen: (node) => callbacksRef.current.onOpen?.(node),
      onHover: (node) => callbacksRef.current.onHover?.(node),
      onContextMenu: (node, x, y) =>
        callbacksRef.current.onContextMenu?.(node, x, y),
      onAnimationChange: (value) =>
        callbacksRef.current.onAnimationChange?.(value),
    });
    rendererRef.current = renderer;
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.update({
      document: props.document,
      settings,
      mode,
      centerId: props.centerId,
      selectedId,
    });
  }, [props.document, props.centerId, settings, mode, selectedId]);

  useEffect(() => {
    if (!props.storageKey) {
      setStorageReady(true);
      return;
    }
    const stored = readStoredGraphSettings(
      window.localStorage,
      props.storageKey,
    );
    if (stored) {
      setSettings((current) =>
        normalizeGraphSettings({
          ...current,
          ...stored,
          depth: Math.min(
            stored.depth,
            props.maxDepth ?? GRAPH_SETTINGS_RANGES.depth.max,
          ),
        }),
      );
    }
    setStorageReady(true);
  }, [props.storageKey]);

  useEffect(() => {
    if (!storageReady || !props.storageKey) return;
    writeStoredGraphSettings(window.localStorage, props.storageKey, settings);
  }, [settings, storageReady, props.storageKey]);

  useEffect(() => {
    if (props.search === undefined) return;
    setSettings((current) =>
      current.search === props.search
        ? current
        : { ...current, search: props.search ?? "" },
    );
  }, [props.search]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    if (settings.animate) renderer.playAnimation();
    else renderer.stopAnimation();
  }, [settings.animate]);

  useEffect(() => {
    if (!panelOpen && !expanded && !contextMenu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (contextMenu) {
        setContextMenu(null);
        return;
      }
      if (panelOpen) setPanelOpen(false);
      if (expanded) setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panelOpen, expanded, contextMenu]);

  useEffect(() => {
    if (!contextMenu) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".rr-graph__menu")) {
        return;
      }
      setContextMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [contextMenu]);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  const patch = (next: Partial<GraphSettings>) => {
    setSettings((current) => ({ ...current, ...next }));
  };

  const updateSearch = (value: string) => {
    patch({ search: value });
    props.onSearchChange?.(value);
  };

  const addGroup = () => {
    groupCounter.current += 1;
    const group: GraphGroup = {
      id: `group-${Date.now().toString(36)}-${groupCounter.current}`,
      query: "",
      color:
        GROUP_COLORS[settings.groups.length % GROUP_COLORS.length] ?? "#6aa84f",
    };
    patch({ groups: [...settings.groups, group] });
  };

  const updateGroup = (id: string, next: Partial<GraphGroup>) => {
    patch({
      groups: settings.groups.map((group) =>
        group.id === id ? { ...group, ...next } : group,
      ),
    });
  };

  const moveGroup = (id: string, direction: -1 | 1) => {
    const index = settings.groups.findIndex((group) => group.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= settings.groups.length) return;
    const groups = [...settings.groups];
    const [group] = groups.splice(index, 1);
    if (!group) return;
    groups.splice(target, 0, group);
    patch({ groups });
  };

  const removeGroup = (id: string) => {
    patch({ groups: settings.groups.filter((group) => group.id !== id) });
  };

  const restoreDefaults = () => {
    setSettings(
      normalizeGraphSettings({
        ...DEFAULT_GRAPH_SETTINGS,
        ...props.initialSettings,
        search: props.search ?? "",
        depth: Math.min(
          props.initialSettings?.depth ?? DEFAULT_GRAPH_SETTINGS.depth,
          props.maxDepth ?? GRAPH_SETTINGS_RANGES.depth.max,
        ),
      }),
    );
  };

  const openFromMenu = (node: GraphNode) => {
    setContextMenu(null);
    if (props.onOpen) props.onOpen(node);
    else if (node.permalink) window.location.href = node.permalink;
  };

  const copyLink = async (node: GraphNode) => {
    setContextMenu(null);
    if (!node.permalink) return;
    const url = new URL(node.permalink, window.location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
  };

  const focusLocal = (node: GraphNode) => {
    setContextMenu(null);
    if (props.onShowLocal) {
      props.onShowLocal(node);
      return;
    }
    if (node.slug)
      window.location.href = `/explore?note=${encodeURIComponent(node.slug)}`;
  };

  const rootClass = [
    "rr-graph",
    expanded ? "rr-graph--expanded" : "",
    props.class ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      class={rootClass}
      data-graph-mode={mode}
      data-node-count={visible.nodes.length}
      data-link-count={visible.links.length}
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      {props.showHeader !== false ? (
        <div class="rr-graph__header">
          <h2 class="rr-graph__title">{props.heading ?? "Graph"}</h2>
          <span class="rr-graph__count" aria-live="polite">
            {visible.nodes.length} nodes · {visible.links.length} links
          </span>
        </div>
      ) : null}

      <div class="rr-graph__toolbar">
        {props.showModeLabel !== false ||
        visible.unsupportedOperators.length > 0 ? (
          <span class="rr-graph__status">
            {props.showModeLabel !== false
              ? mode === "local"
                ? "Local graph"
                : "Global graph"
              : null}
            {visible.unsupportedOperators.length > 0 ? (
              <span class="rr-graph__warning">
                Unsupported operators: {visible.unsupportedOperators.join(", ")}
              </span>
            ) : null}
          </span>
        ) : null}
        <div class="rr-graph__actions">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => rendererRef.current?.zoomBy(1 / 1.2)}
          >
            −
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => rendererRef.current?.zoomBy(1.2)}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => rendererRef.current?.resetView()}
          >
            Reset
          </button>
          {props.expandable ? (
            <button
              type="button"
              aria-pressed={expanded}
              aria-label={expanded ? "Exit full screen graph" : "Expand graph"}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Close" : "Expand"}
            </button>
          ) : null}
          <button
            type="button"
            class="rr-graph__settings-toggle"
            aria-label="Graph settings"
            aria-expanded={panelOpen}
            aria-controls="rr-graph-settings"
            onClick={() => setPanelOpen((value) => !value)}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
            </svg>
          </button>
        </div>
      </div>

      <div class="rr-graph__stage">
        <canvas
          ref={canvasRef}
          class="rr-graph__canvas"
          tabindex={0}
          aria-label={`${mode === "local" ? "Local" : "Global"} note graph. Use plus and minus to zoom, arrow keys to pan, Enter to open the selected note.`}
        />
        <noscript>
          <ul class="rr-graph__fallback">
            {visible.nodes
              .filter((node) => node.kind === "note" && node.permalink)
              .slice(0, 60)
              .map((node) => (
                <li key={node.id}>
                  <a href={node.permalink ?? "#"}>{node.title}</a>
                </li>
              ))}
          </ul>
        </noscript>

        {contextMenu ? (
          <div
            class="rr-graph__menu"
            role="menu"
            style={`left:${contextMenu.x}px;top:${contextMenu.y}px`}
          >
            <p class="rr-graph__menu-title">{contextMenu.node.title}</p>
            {contextMenu.node.permalink ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => openFromMenu(contextMenu.node)}
              >
                Open note
              </button>
            ) : null}
            {contextMenu.node.permalink ? (
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  window.open(
                    contextMenu.node.permalink ?? "",
                    "_blank",
                    "noopener",
                  )
                }
              >
                Open in new tab
              </button>
            ) : null}
            {contextMenu.node.permalink ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => void copyLink(contextMenu.node)}
              >
                Copy link
              </button>
            ) : null}
            {contextMenu.node.slug ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => focusLocal(contextMenu.node)}
              >
                {mode === "global" ? "Show local graph" : "Open in Explorer"}
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const node = contextMenu.node;
                setContextMenu(null);
                updateSearch(
                  node.kind === "tag"
                    ? `tag:${node.id.slice("tag:".length)}`
                    : `"${node.title}"`,
                );
              }}
            >
              Filter to this node
            </button>
          </div>
        ) : null}

        {panelOpen ? (
          <aside
            id="rr-graph-settings"
            class="rr-graph__settings"
            aria-label="Graph settings"
          >
            <div class="rr-graph__settings-header">
              <h3>Graph settings</h3>
              <button
                type="button"
                aria-label="Close graph settings"
                onClick={() => setPanelOpen(false)}
              >
                ×
              </button>
            </div>

            <details open>
              <summary>Filters</summary>
              <div class="rr-graph__field">
                <label for="rr-graph-search">Search files</label>
                <input
                  id="rr-graph-search"
                  type="search"
                  value={settings.search}
                  placeholder="tag:#topic path:notes file:title"
                  onInput={(event) =>
                    updateSearch(
                      (event.currentTarget as HTMLInputElement).value,
                    )
                  }
                />
                <p class="rr-graph__help">
                  Supports file:, path:, tag:, quotes, and -negation.
                </p>
              </div>
              <label class="rr-graph__check">
                <input
                  type="checkbox"
                  checked={settings.showTags}
                  onChange={(event) =>
                    patch({
                      showTags: (event.currentTarget as HTMLInputElement)
                        .checked,
                    })
                  }
                />
                Tags
              </label>
              <label class="rr-graph__check">
                <input
                  type="checkbox"
                  checked={settings.showAttachments}
                  onChange={(event) =>
                    patch({
                      showAttachments: (event.currentTarget as HTMLInputElement)
                        .checked,
                    })
                  }
                />
                Attachments
              </label>
              <label class="rr-graph__check">
                <input
                  type="checkbox"
                  checked={settings.existingOnly}
                  onChange={(event) =>
                    patch({
                      existingOnly: (event.currentTarget as HTMLInputElement)
                        .checked,
                    })
                  }
                />
                Existing files only
              </label>
              <label class="rr-graph__check">
                <input
                  type="checkbox"
                  checked={settings.showOrphans}
                  onChange={(event) =>
                    patch({
                      showOrphans: (event.currentTarget as HTMLInputElement)
                        .checked,
                    })
                  }
                />
                Orphans
              </label>
              {mode === "local" ? (
                <RangeField
                  label="Depth"
                  value={settings.depth}
                  range={{
                    ...GRAPH_SETTINGS_RANGES.depth,
                    max: Math.min(
                      GRAPH_SETTINGS_RANGES.depth.max,
                      props.maxDepth ?? GRAPH_SETTINGS_RANGES.depth.max,
                    ),
                  }}
                  onInput={(value) => patch({ depth: value })}
                />
              ) : null}
            </details>

            <details open>
              <summary>Groups</summary>
              <div class="rr-graph__groups">
                {settings.groups.length === 0 ? (
                  <p class="rr-graph__help">
                    Groups color nodes that match a query. The first match wins.
                  </p>
                ) : null}
                {settings.groups.map((group, index) => (
                  <div class="rr-graph__group" key={group.id}>
                    <input
                      type="color"
                      value={group.color}
                      aria-label={`Group ${index + 1} color`}
                      onInput={(event) =>
                        updateGroup(group.id, {
                          color: (event.currentTarget as HTMLInputElement)
                            .value,
                        })
                      }
                    />
                    <input
                      type="text"
                      value={group.query}
                      placeholder="tag:#topic"
                      aria-label={`Group ${index + 1} query`}
                      onInput={(event) =>
                        updateGroup(group.id, {
                          query: (event.currentTarget as HTMLInputElement)
                            .value,
                        })
                      }
                    />
                    <button
                      type="button"
                      aria-label={`Move group ${index + 1} up`}
                      onClick={() => moveGroup(group.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move group ${index + 1} down`}
                      onClick={() => moveGroup(group.id, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete group ${index + 1}`}
                      onClick={() => removeGroup(group.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addGroup}>
                  New group
                </button>
              </div>
            </details>

            <details open>
              <summary>Display</summary>
              <label class="rr-graph__check">
                <input
                  type="checkbox"
                  checked={settings.arrows}
                  onChange={(event) =>
                    patch({
                      arrows: (event.currentTarget as HTMLInputElement).checked,
                    })
                  }
                />
                Arrows
              </label>
              <RangeField
                label="Text fade threshold"
                value={settings.textFade}
                range={GRAPH_SETTINGS_RANGES.textFade}
                onInput={(value) => patch({ textFade: value })}
              />
              <RangeField
                label="Node size"
                value={settings.nodeSize}
                range={GRAPH_SETTINGS_RANGES.nodeSize}
                onInput={(value) => patch({ nodeSize: value })}
              />
              <RangeField
                label="Link thickness"
                value={settings.linkThickness}
                range={GRAPH_SETTINGS_RANGES.linkThickness}
                onInput={(value) => patch({ linkThickness: value })}
              />
              <label class="rr-graph__check">
                <input
                  type="checkbox"
                  checked={settings.animate}
                  onChange={(event) =>
                    patch({
                      animate: (event.currentTarget as HTMLInputElement)
                        .checked,
                    })
                  }
                />
                Animate
              </label>
              {settings.animate ? (
                <div class="rr-graph__animate-actions">
                  <button
                    type="button"
                    onClick={() => rendererRef.current?.playAnimation()}
                    disabled={animating || reducedMotion}
                  >
                    Play
                  </button>
                  <button
                    type="button"
                    onClick={() => rendererRef.current?.stopAnimation()}
                    disabled={!animating}
                  >
                    Stop
                  </button>
                  <button
                    type="button"
                    onClick={() => rendererRef.current?.playAnimation()}
                    disabled={reducedMotion}
                  >
                    Replay
                  </button>
                </div>
              ) : null}
              {settings.animate && !dated ? (
                <p class="rr-graph__help">
                  No publication dates are available. Notes appear in a stable
                  sequential order instead.
                </p>
              ) : null}
              {settings.animate && reducedMotion ? (
                <p class="rr-graph__help">
                  Reduced motion is enabled, so all nodes are shown immediately.
                </p>
              ) : null}
            </details>

            <details open>
              <summary>Forces</summary>
              <RangeField
                label="Center force"
                value={settings.centerForce}
                range={GRAPH_SETTINGS_RANGES.centerForce}
                onInput={(value) => patch({ centerForce: value })}
              />
              <RangeField
                label="Repel force"
                value={settings.repelForce}
                range={GRAPH_SETTINGS_RANGES.repelForce}
                onInput={(value) => patch({ repelForce: value })}
              />
              <RangeField
                label="Link force"
                value={settings.linkForce}
                range={GRAPH_SETTINGS_RANGES.linkForce}
                onInput={(value) => patch({ linkForce: value })}
              />
              <RangeField
                label="Link distance"
                value={settings.linkDistance}
                range={GRAPH_SETTINGS_RANGES.linkDistance}
                onInput={(value) => patch({ linkDistance: value })}
              />
              <button type="button" onClick={restoreDefaults}>
                Restore default settings
              </button>
            </details>

            <p class="rr-graph__selection" aria-live="polite">
              {hovered
                ? `Hover: ${visible.nodes.find((node) => node.id === hovered)?.title ?? ""}`
                : selectedId
                  ? `Selected: ${visible.nodes.find((node) => node.id === selectedId)?.title ?? ""}`
                  : "Hover or select a node to highlight its links."}
            </p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

type RangeFieldProps = {
  label: string;
  value: number;
  range: { min: number; max: number; step: number };
  onInput: (value: number) => void;
};

function RangeField(props: RangeFieldProps) {
  return (
    <label class="rr-graph__range">
      <span>
        {props.label}
        <output>{formatValue(props.value, props.range.step)}</output>
      </span>
      <input
        type="range"
        min={props.range.min}
        max={props.range.max}
        step={props.range.step}
        value={props.value}
        onInput={(event) =>
          props.onInput(Number((event.currentTarget as HTMLInputElement).value))
        }
      />
    </label>
  );
}

function formatValue(value: number, step: number): string {
  return step >= 1 ? String(Math.round(value)) : value.toFixed(2);
}
