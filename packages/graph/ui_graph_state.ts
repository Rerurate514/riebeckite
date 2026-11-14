import { useEffect, useMemo, useRef, useState } from "hono/jsx";
import type { GraphRenderer, GraphRendererCallbacks } from "./client.js";
import { createGraphRenderer } from "./client.js";
import type { GraphMode, GraphSettings } from "./index.js";
import {
  buildVisibleGraph,
  DEFAULT_GRAPH_SETTINGS,
  GRAPH_SETTINGS_RANGES,
  hasDatedNodes,
  normalizeGraphSettings,
} from "./index.js";
import { createGraphActions } from "./ui_graph_actions.js";
import { useGraphSettingsStorage } from "./ui_graph_storage.js";
import type { GraphContextMenu, GraphViewProps } from "./ui_types.js";

export function useGraphView(props: GraphViewProps, mode: GraphMode) {
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(
    props.selectedId ?? null,
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [contextMenu, setContextMenu] = useState<GraphContextMenu | null>(null);
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

  useGraphSettingsStorage(props, settings, setSettings);

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

  const actions = createGraphActions({
    props,
    settings,
    setSettings,
    setContextMenu,
    groupCounter,
  });

  return {
    settings,
    visible,
    dated,
    panelOpen,
    setPanelOpen,
    expanded,
    setExpanded,
    selectedId,
    hovered,
    animating,
    reducedMotion,
    contextMenu,
    setContextMenu,
    canvasRef,
    rendererRef,
    ...actions,
  };
}
