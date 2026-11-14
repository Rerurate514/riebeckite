import { GraphContextMenuView } from "./ui_context_menu.js";
import { useGraphView } from "./ui_graph_state.js";
import { GraphSettingsPanel } from "./ui_settings.js";
import type { GraphContextMenu, GraphViewProps } from "./ui_types.js";

export type { GraphViewProps } from "./ui_types.js";

export default function GraphView(props: GraphViewProps) {
  const mode = props.mode ?? "global";
  const view = useGraphView(props, mode);
  const { visible, rendererRef } = view;

  const rootClass = [
    "rr-graph",
    view.expanded ? "rr-graph--expanded" : "",
    props.class ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const filterToNode = (menu: GraphContextMenu) => {
    const node = menu.node;
    view.setContextMenu(null);
    view.updateSearch(
      node.kind === "tag"
        ? `tag:${node.id.slice("tag:".length)}`
        : `"${node.title}"`,
    );
  };

  return (
    <div
      class={rootClass}
      data-graph-mode={mode}
      data-node-count={visible.nodes.length}
      data-link-count={visible.links.length}
      data-reduced-motion={view.reducedMotion ? "true" : "false"}
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
              aria-pressed={view.expanded}
              aria-label={
                view.expanded ? "Exit full screen graph" : "Expand graph"
              }
              onClick={() => view.setExpanded((value) => !value)}
            >
              {view.expanded ? "Close" : "Expand"}
            </button>
          ) : null}
          <button
            type="button"
            class="rr-graph__settings-toggle"
            aria-label="Graph settings"
            aria-expanded={view.panelOpen}
            aria-controls="rr-graph-settings"
            onClick={() => view.setPanelOpen((value) => !value)}
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
          ref={view.canvasRef}
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

        {view.contextMenu ? (
          <GraphContextMenuView
            menu={view.contextMenu}
            mode={mode}
            onOpen={() =>
              view.contextMenu && view.openFromMenu(view.contextMenu.node)
            }
            onCopyLink={() => {
              if (view.contextMenu) void view.copyLink(view.contextMenu.node);
            }}
            onFocusLocal={() => {
              if (view.contextMenu) view.focusLocal(view.contextMenu.node);
            }}
            onFilter={() => {
              if (view.contextMenu) filterToNode(view.contextMenu);
            }}
          />
        ) : null}

        {view.panelOpen ? (
          <GraphSettingsPanel
            mode={mode}
            settings={view.settings}
            dated={view.dated}
            animating={view.animating}
            reducedMotion={view.reducedMotion}
            maxDepth={props.maxDepth}
            hovered={view.hovered}
            selectedId={view.selectedId}
            nodes={visible.nodes}
            onClose={() => view.setPanelOpen(false)}
            onPlay={() => rendererRef.current?.playAnimation()}
            onStop={() => rendererRef.current?.stopAnimation()}
            patch={view.patch}
            updateSearch={view.updateSearch}
            addGroup={view.addGroup}
            updateGroup={view.updateGroup}
            moveGroup={view.moveGroup}
            removeGroup={view.removeGroup}
            restoreDefaults={view.restoreDefaults}
          />
        ) : null}
      </div>
    </div>
  );
}
