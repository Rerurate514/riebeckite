/// <reference path="./wavedrom.d.ts" />

type WavedromApi = typeof import("wavedrom")["default"];
type SkinName = "default" | "narrow" | "lowkey";

const PENDING_SELECTOR = '[data-wavedrom="pending"]';
const CANVAS_ATTRIBUTE = "data-wavedrom-canvas";
const CANVAS_ID_PREFIX = "rb-wavedrom-canvas-";
const SKINS: readonly SkinName[] = ["default", "narrow", "lowkey"];

let renderCounter = 0;

/**
 * Draws every server-rendered WaveDrom figure with the `wavedrom` package.
 *
 * The `wavedrom` library is imported lazily so sites that never render a
 * timing diagram do not ship it. Figures carry their normalized WaveJSON in
 * `data-wavedrom-spec`; the requested skin (a build-time option) travels in
 * `data-wavedrom-skin` because client entry code cannot see plugin options.
 */
export async function initWaveDrom(): Promise<void> {
  const figures = Array.from(
    document.querySelectorAll<HTMLElement>(PENDING_SELECTOR),
  );
  if (figures.length === 0) return;

  let api: WavedromApi;
  try {
    api = await loadWavedrom();
  } catch {
    revealFallbacks(figures);
    return;
  }

  let notFirstSignal = false;
  for (const figure of figures) {
    const canvas = figure.querySelector<HTMLElement>(`[${CANVAS_ATTRIBUTE}]`);
    const serialized = figure.dataset.wavedromSpec;
    if (!canvas || !serialized) {
      setError(figure);
      continue;
    }

    let spec: Record<string, unknown>;
    try {
      spec = JSON.parse(serialized) as Record<string, unknown>;
    } catch {
      setError(figure);
      continue;
    }

    try {
      const skin = await loadSkin(figure.dataset.wavedromSkin, api);
      renderFigure(api, spec, canvas, skin, notFirstSignal);
      figure.dataset.wavedrom = "rendered";
      if (spec.signal) notFirstSignal = true;
    } catch {
      setError(figure);
    }
  }
}

function renderFigure(
  api: WavedromApi,
  spec: Record<string, unknown>,
  canvas: HTMLElement,
  skin: unknown,
  notFirstSignal: boolean,
) {
  const index = renderCounter++;
  canvas.id = `${CANVAS_ID_PREFIX}${index}`;
  // `renderWaveForm` reads the active skin from `window.WaveSkin`.
  (window as unknown as { WaveSkin?: unknown }).WaveSkin = skin ?? api.waveSkin;
  api.renderWaveForm(index, spec, CANVAS_ID_PREFIX, notFirstSignal);
}

async function loadWavedrom(): Promise<WavedromApi> {
  const mod = (await import("wavedrom")) as {
    default?: WavedromApi;
  } & Partial<WavedromApi>;
  return (mod.default ?? mod) as WavedromApi;
}

async function loadSkin(
  name: string | undefined,
  api: WavedromApi,
): Promise<unknown> {
  const skin = (name ?? "default") as SkinName;
  if (!SKINS.includes(skin) || skin === "default") return api.waveSkin;

  try {
    const mod = (await import(
      skin === "narrow" ? "wavedrom/skins/narrow" : "wavedrom/skins/lowkey"
    )) as Record<string, unknown> & { default?: Record<string, unknown> };
    return mod[skin] ?? mod.default?.[skin] ?? api.waveSkin;
  } catch {
    return api.waveSkin;
  }
}

function revealFallbacks(figures: readonly HTMLElement[]) {
  for (const figure of figures) setError(figure);
}

function setError(figure: HTMLElement) {
  figure.dataset.wavedrom = "error";
  const details = figure.querySelector<HTMLDetailsElement>("details");
  if (details) details.open = true;
}
