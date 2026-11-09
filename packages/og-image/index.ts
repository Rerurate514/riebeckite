import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type Child, createElement } from "hono/jsx";
import type satori from "satori";

export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_WIDTH = 1200;

export type OgPalette = Readonly<{
  background: string;
  foreground: string;
  accent: string;
}>;

export type OgPageMetadata = Readonly<{
  title: string;
  description?: string;
  permalink: string;
  language?: string;
  kind: string;
  tags: readonly string[];
  author?: string;
}>;

export type OgSiteMetadata = Readonly<{
  title: string;
  description?: string;
  author?: string;
  baseUrl?: string;
}>;

export type OgContent = Readonly<{
  showAuthor: boolean;
  showSiteName: boolean;
  showTags: boolean;
}>;

export type OgLayoutInput = Readonly<{
  page: OgPageMetadata;
  site: OgSiteMetadata;
  palette: OgPalette;
  content: OgContent;
}>;

export type OgLayoutResult = Child;
export type OgLayout = (input: OgLayoutInput) => OgLayoutResult;
export type OgPreset = "card" | "minimal" | "editorial";

export function defineOgLayout(layout: OgLayout): OgLayout {
  return layout;
}

export function presetLayout(preset: OgPreset): OgLayout {
  return ({ content, page, palette, site }) => {
    const padding =
      preset === "editorial" ? 120 : preset === "minimal" ? 72 : 96;
    const titleSize =
      preset === "editorial" ? 72 : preset === "minimal" ? 64 : 68;
    const children: Child[] = [];
    if (preset === "editorial") {
      children.push(
        createElement("div", {
          key: "accent",
          style: { backgroundColor: palette.accent, height: "100%", width: 14 },
        }),
      );
    }
    children.push(
      createElement(
        "div",
        {
          key: "content",
          style: {
            display: "flex",
            flex: 1,
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
            padding: preset === "card" ? 48 : 0,
          },
        },
        content.showSiteName
          ? createElement(
              "div",
              { style: { color: palette.accent, fontSize: 28 } },
              site.title,
            )
          : createElement("div", null),
        createElement(
          "div",
          {
            style: {
              color: palette.foreground,
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.2,
              maxHeight: 260,
              overflow: "hidden",
            },
          },
          page.title || "Untitled",
        ),
        createElement(
          "div",
          { style: { color: palette.foreground, fontSize: 26, opacity: 0.72 } },
          attributionText(content, page),
        ),
      ),
    );
    return createElement(
      "div",
      {
        style: {
          backgroundColor: palette.background,
          display: "flex",
          height: "100%",
          padding,
          width: "100%",
        },
      },
      children,
    );
  };
}

export async function renderOgImage(
  layout: OgLayout,
  input: OgLayoutInput,
): Promise<Uint8Array> {
  const result = layout(input);
  const svg =
    typeof result === "string"
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}"><style>${fontFaceCss}text{font-family:"Noto Sans JP",sans-serif}</style>${result}</svg>`
      : await (await import("satori")).default(
          toSatoriNode(result) as Parameters<typeof satori>[0],
          {
            width: OG_IMAGE_WIDTH,
            height: OG_IMAGE_HEIGHT,
            fonts: notoSansJpFonts,
          },
        );
  const { default: sharp } = await import("sharp");
  const png = await sharp(Buffer.from(svg), { limitInputPixels: false })
    .png()
    .toBuffer();
  const metadata = await sharp(png).metadata();
  if (
    metadata.format !== "png" ||
    metadata.width !== OG_IMAGE_WIDTH ||
    metadata.height !== OG_IMAGE_HEIGHT
  ) {
    throw new Error("OG image renderer produced an invalid PNG.");
  }
  return new Uint8Array(png);
}

function attributionText(content: OgContent, page: OgPageMetadata): string {
  return [
    ...(content.showAuthor && page.author ? [page.author] : []),
    ...(content.showTags ? page.tags.slice(0, 3) : []),
  ].join(" · ");
}

const notoSansJpFontData = ([400, 700] as const).map(
  (weight) =>
    [
      weight,
      readFileSync(
        fileURLToPath(
          new URL(
            `./fonts/noto-sans-jp-japanese-${weight}-normal.woff`,
            import.meta.url,
          ),
        ),
      ),
    ] as const,
);
const notoSansJpFonts = notoSansJpFontData.map(([weight, data]) => ({
  data,
  name: "Noto Sans JP",
  weight,
}));
const fontFaceCss = notoSansJpFontData
  .map(
    ([weight, data]) =>
      `@font-face{font-family:"Noto Sans JP";font-style:normal;font-weight:${weight};src:url(data:font/woff;base64,${data.toString("base64")}) format("woff")}`,
  )
  .join("");

function toSatoriNode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toSatoriNode);
  if (!value || typeof value !== "object") return value;
  const node = value as {
    tag?: unknown;
    type?: unknown;
    props?: Record<string, unknown>;
    children?: unknown[];
  };
  if (node.type !== undefined) return value;
  if (!node.tag) return value;
  const children = node.children ?? [];
  const props = { ...node.props };
  if (children.length > 0) {
    props.children =
      children.length === 1
        ? toSatoriNode(children[0])
        : children.map(toSatoriNode);
  }
  if (typeof node.tag === "function") {
    return toSatoriNode(node.tag(props));
  }
  return { type: node.tag, props };
}
