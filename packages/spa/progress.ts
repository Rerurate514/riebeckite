const SHOW_DELAY = 150;
const STYLE_ID = "riebeckite-spa-progress-style";
const STYLE = `
[data-spa-progress] {
  position: fixed;
  inset-block-start: 0;
  inset-inline: 0;
  z-index: 2147483647;
  height: 2px;
  overflow: hidden;
  pointer-events: none;
}
[data-spa-progress][hidden] {
  display: none;
}
[data-spa-progress]::before {
  position: absolute;
  inset-block: 0;
  inline-size: 38%;
  background: var(--rb-color-accent, #f66620);
  content: "";
  transform: translateX(-100%);
  animation: riebeckite-spa-progress 1.2s ease-in-out infinite;
}
@keyframes riebeckite-spa-progress {
  to {
    transform: translateX(365%);
  }
}
@media (prefers-reduced-motion: reduce) {
  [data-spa-progress]::before {
    inline-size: 100%;
    opacity: 0.6;
    animation: none;
  }
}
`;

export type SpaProgress = {
  readonly start: () => void;
  readonly done: () => void;
  readonly dispose: () => void;
};

export function createSpaProgress(): SpaProgress {
  let bar: HTMLElement | null = null;
  let style: HTMLStyleElement | null = null;
  let timer: number | undefined;
  let disposed = false;

  const show = () => {
    if (disposed || !document.body) return;
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = STYLE;
      document.head.append(style);
    }
    if (!bar) {
      bar = document.createElement("div");
      bar.setAttribute("data-spa-progress", "");
      bar.setAttribute("role", "progressbar");
      bar.setAttribute("aria-label", "Loading page");
      bar.hidden = true;
      document.body.append(bar);
    }
    bar.hidden = false;
  };

  const start = () => {
    if (disposed || timer !== undefined || (bar && !bar.hidden)) return;
    timer = window.setTimeout(() => {
      timer = undefined;
      show();
    }, SHOW_DELAY);
  };

  const done = () => {
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
    if (bar) bar.hidden = true;
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    done();
    bar?.remove();
    bar = null;
    style?.remove();
    style = null;
  };

  return { start, done, dispose };
}
