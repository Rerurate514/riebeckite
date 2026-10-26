import { element, text } from "./hast.js";
import type { DiagramFigureInput, DiagramNode } from "./types.js";

export function deterministicDiagramId(kind: string, source: string): string {
  let hash = 0;
  for (const character of source)
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return `rb-${kind}-${Math.abs(hash).toString(36)}`;
}

export function buildDiagramFigure(input: DiagramFigureInput): DiagramNode {
  const labelId = `${input.id}-caption`;
  const children: DiagramNode[] = [];
  if (input.caption)
    children.push(
      element(
        "figcaption",
        {
          id: labelId,
          className: `${input.className}__caption`,
          dataDiagramCaption: "true",
        },
        [text(input.caption)],
      ),
    );
  children.push(buildContent(input, labelId));
  if (input.fallback)
    children.push(
      element(
        "details",
        {
          className: `${input.className}__fallback rb-source-fallback`,
          dataDiagramFallback: "true",
        },
        [
          element("summary", {}, [
            text(input.fallbackLabel ?? "Diagram source"),
          ]),
          element("pre", {}, [element("code", {}, [text(input.source)])]),
        ],
      ),
    );
  return element(
    "figure",
    {
      className: input.className,
      dataDiagram: input.kind,
      dataDiagramStatus: input.status,
      dataDiagramId: input.id,
      ...input.attributes,
    },
    children,
  );
}

function buildContent(input: DiagramFigureInput, labelId: string): DiagramNode {
  const properties: Record<string, unknown> = {
    className: `${input.className}__canvas`,
    dataDiagramContent: "true",
    role: "img",
    ariaLabelledby: input.caption ? labelId : undefined,
    ariaLabel: input.caption ? undefined : input.label,
  };
  if (input.content.kind === "canvas")
    return element("canvas", { ...properties, ...input.content.attrs }, []);
  if (input.content.kind === "image")
    return element(
      "img",
      {
        ...properties,
        src: input.content.src,
        alt: input.content.alt ?? input.label,
        loading: "lazy",
      },
      [],
    );
  return element("div", properties, [
    { type: "raw", value: input.content.svg },
  ]);
}
