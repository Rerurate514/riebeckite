import type { GraphGroup, GraphNode, GraphSettings } from "./index.js";
import {
  DEFAULT_GRAPH_SETTINGS,
  GRAPH_SETTINGS_RANGES,
  normalizeGraphSettings,
} from "./index.js";
import type {
  GraphContextMenu,
  GraphSettingsSetter,
  GraphViewProps,
} from "./ui_types.js";

export const GROUP_COLORS = [
  "#e07a5f",
  "#3d85c6",
  "#6aa84f",
  "#c27ba0",
  "#e6b422",
  "#7c6ee6",
];

type GraphActionContext = {
  props: GraphViewProps;
  settings: GraphSettings;
  setSettings: GraphSettingsSetter;
  setContextMenu: (value: GraphContextMenu | null) => void;
  groupCounter: { current: number };
};

export function createGraphActions({
  props,
  settings,
  setSettings,
  setContextMenu,
  groupCounter,
}: GraphActionContext) {
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

  return {
    patch,
    updateSearch,
    addGroup,
    updateGroup,
    moveGroup,
    removeGroup,
    restoreDefaults,
    openFromMenu,
    copyLink,
    focusLocal,
  };
}
