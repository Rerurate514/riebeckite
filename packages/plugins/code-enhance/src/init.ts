import type { CodeEnhanceClientOptions } from "./types.js";

export const DEFAULT_COPY_LABEL = "Copy";
export const DEFAULT_COPIED_LABEL = "Copied";

export function initCodeEnhance(options: CodeEnhanceClientOptions = {}) {
  const copyLabel = options.copyLabel ?? DEFAULT_COPY_LABEL;
  const copiedLabel = options.copiedLabel ?? DEFAULT_COPIED_LABEL;
  const timers = new Set<number>();

  const onClick = async (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const copyButton = target.closest<HTMLButtonElement>("[data-code-copy]");
    if (copyButton) {
      await copyCode(copyButton, copyLabel, copiedLabel, timers);
      return;
    }

    const wrapButton = target.closest<HTMLButtonElement>(
      "[data-code-wrap-toggle]",
    );
    if (wrapButton) {
      toggleWrap(wrapButton);
      return;
    }

    const collapseButton = target.closest<HTMLButtonElement>(
      "[data-code-collapse-toggle]",
    );
    if (collapseButton) toggleCollapse(collapseButton);
  };

  document.addEventListener("click", onClick);
  return () => {
    document.removeEventListener("click", onClick);
    for (const timer of timers) window.clearTimeout(timer);
    timers.clear();
  };
}

async function copyCode(
  button: HTMLButtonElement,
  copyLabel: string,
  copiedLabel: string,
  timers: Set<number>,
) {
  const code = getCodeText(button);
  if (!code) return;

  await navigator.clipboard.writeText(code);
  button.dataset.codeCopyState = "success";
  button.textContent = copiedLabel;
  const timer = window.setTimeout(() => {
    timers.delete(timer);
    delete button.dataset.codeCopyState;
    button.textContent = copyLabel;
  }, 1500);
  timers.add(timer);
}

function getCodeText(button: HTMLButtonElement): string {
  const figure = button.closest<HTMLElement>(".rr-code");
  const code = figure?.querySelector<HTMLElement>(".rr-code__code");
  return code?.textContent ?? "";
}

function toggleWrap(button: HTMLButtonElement) {
  const figure = button.closest<HTMLElement>(".rr-code");
  const pre = figure?.querySelector<HTMLElement>(".rr-code__pre");
  if (!pre) return;

  const enabled = pre.classList.toggle("rr-code__pre--wrap");
  button.setAttribute("aria-pressed", String(enabled));
}

function toggleCollapse(button: HTMLButtonElement) {
  const figure = button.closest<HTMLElement>(".rr-code");
  const body = figure?.querySelector<HTMLElement>(".rr-code__body");
  if (!figure || !body) return;

  const collapsed = figure.dataset.collapsed !== "true";
  figure.dataset.collapsed = String(collapsed);
  body.hidden = collapsed;
  button.setAttribute("aria-expanded", String(!collapsed));
  button.textContent = collapsed ? "Expand" : "Collapse";
}
