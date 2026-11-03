import sharp from "sharp";

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

export type OgLayout = (input: OgLayoutInput) => string;
export type OgPreset = "card" | "minimal" | "editorial";

export function defineOgLayout(layout: OgLayout): OgLayout {
  return layout;
}

export function presetLayout(preset: OgPreset): OgLayout {
  return ({ content, page, palette, site }) => {
    const siteName = content.showSiteName ? escapeXml(site.title) : "";
    const title = titleLines(page.title, preset === "editorial" ? 22 : 26)
      .map(
        (line, index) =>
          `<tspan x="${preset === "editorial" ? 120 : preset === "minimal" ? 72 : 96}" dy="${index === 0 ? 0 : 82}">${escapeXml(line)}</tspan>`,
      )
      .join("");
    const attribution = attributionText(content, page);
    const footer = attribution
      ? `<text x="${preset === "editorial" ? 120 : preset === "minimal" ? 72 : 96}" y="540" fill="${palette.foreground}" fill-opacity="0.72" font-size="26">${escapeXml(attribution)}</text>`
      : "";

    if (preset === "minimal") {
      return `<rect width="1200" height="630" fill="${palette.background}"/><text x="72" y="96" fill="${palette.accent}" font-size="28">${siteName}</text><text x="72" y="280" fill="${palette.foreground}" font-size="64" font-weight="700">${title}</text>${footer}`;
    }
    if (preset === "editorial") {
      return `<rect width="1200" height="630" fill="${palette.background}"/><rect x="72" y="72" width="14" height="486" fill="${palette.accent}"/><text x="120" y="128" fill="${palette.foreground}" font-size="28">${siteName}</text><text x="120" y="280" fill="${palette.foreground}" font-size="72" font-weight="700">${title}</text>${footer}`;
    }
    return `<rect width="1200" height="630" fill="${palette.background}"/><rect x="48" y="48" width="1104" height="534" rx="32" fill="#ffffff" fill-opacity="0.1"/><text x="96" y="128" fill="${palette.accent}" font-size="28">${siteName}</text><text x="96" y="280" fill="${palette.foreground}" font-size="68" font-weight="700">${title}</text>${footer}`;
  };
}

export async function renderOgImage(
  layout: OgLayout,
  input: OgLayoutInput,
): Promise<Uint8Array> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}"><style>text{font-family:"Noto Sans CJK JP","Noto Sans JP",sans-serif}</style>${layout(input)}</svg>`;
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
  const values = [
    ...(content.showAuthor && page.author ? [page.author] : []),
    ...(content.showTags ? page.tags.slice(0, 3) : []),
  ];
  return values.join(" · ");
}

function titleLines(title: string, maximumCharacters: number): string[] {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["Untitled"];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && characterLength(candidate) > maximumCharacters) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines
    .slice(0, 3)
    .map((value, index, values) =>
      index === values.length - 1 && lines.length > 3
        ? `${value.slice(0, Math.max(0, maximumCharacters - 1))}…`
        : value,
    );
}

function characterLength(value: string): number {
  return [...value].reduce((length, character) => {
    const codePoint = character.codePointAt(0);
    return length + (codePoint !== undefined && codePoint <= 0xff ? 1 : 2);
  }, 0);
}

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character] ?? character,
  );
}
