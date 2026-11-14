import type { GraphRenderer } from "./client_types.js";
import type { GraphSettings, VisibleGraph } from "./index.js";

export function forceOptions(settings: GraphSettings) {
  return {
    centerForce: settings.centerForce,
    repelForce: settings.repelForce,
    linkForce: settings.linkForce,
    linkDistance: settings.linkDistance,
  };
}

export function visibleSignature(visible: VisibleGraph): string {
  return `${visible.nodes.map((node) => node.id).join("\0")}|${visible.links
    .map((link) => `${link.source}>${link.target}`)
    .join("\0")}`;
}

export type GraphColors = ReturnType<typeof readColors>;

export function readColors(canvas: HTMLCanvasElement) {
  const style = getComputedStyle(canvas);
  return {
    background: css(style, "--rb-color-paper", "#ffffff"),
    accent: css(style, "--rb-color-accent", "#2563eb"),
    link: css(style, "--rb-color-link", "#2563eb"),
    ink: css(style, "--rb-color-ink", "#1f2937"),
    muted: css(style, "--rb-color-muted", "#6b7280"),
    edge: css(style, "--rb-color-border-strong", "#94a3b8"),
    label: css(style, "--rb-color-ink", "#1f2937"),
    focus: css(style, "--rb-color-focus", "#2563eb"),
  };
}

export function css(
  style: CSSStyleDeclaration,
  name: string,
  fallback: string,
): string {
  const value = style.getPropertyValue(name).trim();
  return value.length > 0 ? value : fallback;
}

export function withAlpha(color: string, alpha: number): string {
  const clamped = clamp(alpha, 0, 1);
  if (color.startsWith("#")) {
    const hex =
      color.length === 4
        ? color
            .slice(1)
            .split("")
            .map((character) => character + character)
            .join("")
        : color.slice(1);
    if (hex.length === 6 && /^[0-9a-f]{6}$/i.test(hex)) {
      const red = Number.parseInt(hex.slice(0, 2), 16);
      const green = Number.parseInt(hex.slice(2, 4), 16);
      const blue = Number.parseInt(hex.slice(4, 6), 16);
      return `rgba(${red}, ${green}, ${blue}, ${clamped})`;
    }
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${clamped})`);
  }
  return color;
}

export function truncateLabel(title: string): string {
  return title.length > 34 ? `${title.slice(0, 33)}…` : title;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function createNoopRenderer(): GraphRenderer {
  return {
    update() {},
    setSelected() {},
    zoomBy() {},
    resetView() {},
    focusNode() {},
    playAnimation() {},
    stopAnimation() {},
    isAnimating: () => false,
    destroy() {},
  };
}
