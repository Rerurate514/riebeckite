import { PeleError, render } from "pele";

export type PeleRenderResult =
  | { ok: true; svg: string }
  | { ok: false; message: string };

export function renderPeleSvg(
  source: string,
  idPrefix: string,
): PeleRenderResult {
  try {
    const svg = render(source, { idPrefix, images: false }).svg;
    if (!isSafeSvg(svg)) {
      return { ok: false, message: "Pele produced unsafe SVG output." };
    }
    return { ok: true, svg };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof PeleError || error instanceof Error
          ? error.message
          : "Pele could not render this diagram.",
    };
  }
}

function isSafeSvg(svg: string): boolean {
  return (
    svg.trimStart().startsWith("<svg") &&
    !/<\/?script\b/i.test(svg) &&
    !/<\/?foreignObject\b/i.test(svg) &&
    !/\son[a-z]+\s*=/i.test(svg) &&
    !/\b(?:href|xlink:href)\s*=\s*["']\s*javascript:/i.test(svg)
  );
}
