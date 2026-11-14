import type {
  GraphGroup,
  GraphMode,
  GraphNode,
  GraphSettings,
} from "./index.js";
import { GRAPH_SETTINGS_RANGES } from "./index.js";
import { RangeField } from "./ui_range_field.js";
import { GraphGroupsField } from "./ui_settings_groups.js";

type GraphSettingsPanelProps = {
  mode: GraphMode;
  settings: GraphSettings;
  dated: boolean;
  animating: boolean;
  reducedMotion: boolean;
  maxDepth?: number;
  hovered: string | null;
  selectedId: string | null;
  nodes: GraphNode[];
  onClose: () => void;
  onPlay: () => void;
  onStop: () => void;
  patch: (next: Partial<GraphSettings>) => void;
  updateSearch: (value: string) => void;
  addGroup: () => void;
  updateGroup: (id: string, next: Partial<GraphGroup>) => void;
  moveGroup: (id: string, direction: -1 | 1) => void;
  removeGroup: (id: string) => void;
  restoreDefaults: () => void;
};

export function GraphSettingsPanel(props: GraphSettingsPanelProps) {
  const { settings } = props;
  return (
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
          onClick={props.onClose}
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
              props.updateSearch(
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
              props.patch({
                showTags: (event.currentTarget as HTMLInputElement).checked,
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
              props.patch({
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
              props.patch({
                existingOnly: (event.currentTarget as HTMLInputElement).checked,
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
              props.patch({
                showOrphans: (event.currentTarget as HTMLInputElement).checked,
              })
            }
          />
          Orphans
        </label>
        {props.mode === "local" ? (
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
            onInput={(value) => props.patch({ depth: value })}
          />
        ) : null}
      </details>

      <details open>
        <summary>Groups</summary>
        <div class="rr-graph__groups">
          <GraphGroupsField
            groups={settings.groups}
            addGroup={props.addGroup}
            updateGroup={props.updateGroup}
            moveGroup={props.moveGroup}
            removeGroup={props.removeGroup}
          />
        </div>
      </details>

      <details open>
        <summary>Display</summary>
        <label class="rr-graph__check">
          <input
            type="checkbox"
            checked={settings.arrows}
            onChange={(event) =>
              props.patch({
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
          onInput={(value) => props.patch({ textFade: value })}
        />
        <RangeField
          label="Node size"
          value={settings.nodeSize}
          range={GRAPH_SETTINGS_RANGES.nodeSize}
          onInput={(value) => props.patch({ nodeSize: value })}
        />
        <RangeField
          label="Link thickness"
          value={settings.linkThickness}
          range={GRAPH_SETTINGS_RANGES.linkThickness}
          onInput={(value) => props.patch({ linkThickness: value })}
        />
        <label class="rr-graph__check">
          <input
            type="checkbox"
            checked={settings.animate}
            onChange={(event) =>
              props.patch({
                animate: (event.currentTarget as HTMLInputElement).checked,
              })
            }
          />
          Animate
        </label>
        {settings.animate ? (
          <div class="rr-graph__animate-actions">
            <button
              type="button"
              onClick={props.onPlay}
              disabled={props.animating || props.reducedMotion}
            >
              Play
            </button>
            <button
              type="button"
              onClick={props.onStop}
              disabled={!props.animating}
            >
              Stop
            </button>
            <button
              type="button"
              onClick={props.onPlay}
              disabled={props.reducedMotion}
            >
              Replay
            </button>
          </div>
        ) : null}
        {settings.animate && !props.dated ? (
          <p class="rr-graph__help">
            No publication dates are available. Notes appear in a stable
            sequential order instead.
          </p>
        ) : null}
        {settings.animate && props.reducedMotion ? (
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
          onInput={(value) => props.patch({ centerForce: value })}
        />
        <RangeField
          label="Repel force"
          value={settings.repelForce}
          range={GRAPH_SETTINGS_RANGES.repelForce}
          onInput={(value) => props.patch({ repelForce: value })}
        />
        <RangeField
          label="Link force"
          value={settings.linkForce}
          range={GRAPH_SETTINGS_RANGES.linkForce}
          onInput={(value) => props.patch({ linkForce: value })}
        />
        <RangeField
          label="Link distance"
          value={settings.linkDistance}
          range={GRAPH_SETTINGS_RANGES.linkDistance}
          onInput={(value) => props.patch({ linkDistance: value })}
        />
        <button type="button" onClick={props.restoreDefaults}>
          Restore default settings
        </button>
      </details>

      <p class="rr-graph__selection" aria-live="polite">
        {props.hovered
          ? `Hover: ${props.nodes.find((node) => node.id === props.hovered)?.title ?? ""}`
          : props.selectedId
            ? `Selected: ${props.nodes.find((node) => node.id === props.selectedId)?.title ?? ""}`
            : "Hover or select a node to highlight its links."}
      </p>
    </aside>
  );
}
