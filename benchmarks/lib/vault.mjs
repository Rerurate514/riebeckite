import fs from "node:fs/promises";
import path from "node:path";

export const PROFILE_NAMES = [
  "baseline",
  "realistic",
  "sparse",
  "medium",
  "dense",
  "asset",
];

const PROFILES = {
  baseline: {
    bodyParagraphs: 3,
    linkRange: [2, 5],
    embedRatio: 0,
    tagRange: [1, 2],
    aliasRatio: 0.5,
    assetRatio: 0,
    depth: 1,
    visibility: { public: 1 },
    l10nRatio: 0,
    permalinkRatio: 0,
  },
  realistic: {
    bodyParagraphs: 5,
    linkRange: [5, 15],
    embedRatio: 0.15,
    tagRange: [2, 4],
    aliasRatio: 0.4,
    assetRatio: 0.2,
    depth: 2,
    visibility: { public: 0.85, unlisted: 0.08, draft: 0.05, scheduled: 0.02 },
    l10nRatio: 0.08,
    permalinkRatio: 0.1,
  },
  sparse: {
    bodyParagraphs: 4,
    linkRange: [2, 5],
    embedRatio: 0.05,
    tagRange: [1, 3],
    aliasRatio: 0.3,
    assetRatio: 0.05,
    depth: 2,
    visibility: { public: 1 },
  },
  medium: {
    bodyParagraphs: 4,
    linkRange: [10, 20],
    embedRatio: 0.05,
    tagRange: [2, 4],
    aliasRatio: 0.3,
    assetRatio: 0.05,
    depth: 2,
    visibility: { public: 1 },
  },
  dense: {
    bodyParagraphs: 4,
    linkRange: [45, 55],
    embedRatio: 0.05,
    tagRange: [2, 4],
    aliasRatio: 0.3,
    assetRatio: 0.05,
    depth: 2,
    visibility: { public: 1 },
  },
  asset: {
    bodyParagraphs: 4,
    linkRange: [5, 10],
    embedRatio: 0.1,
    tagRange: [2, 4],
    aliasRatio: 0.3,
    assetRatio: 1,
    assetsPerNote: 2,
    depth: 2,
    visibility: { public: 1 },
  },
};

export function profileConfig(name) {
  const profile = PROFILES[name];
  if (!profile) throw new Error(`Unknown vault profile: ${name}`);
  return profile;
}

export function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function noteSlug(index, depth) {
  if (depth <= 1) return `notes/note-${pad(index)}`;
  const section = pad(Math.floor(index / 100), 3);
  return `notes/section-${section}/note-${pad(index, 5)}`;
}

function pad(value, width = 5) {
  return String(value).padStart(width, "0");
}

function pick(rng, range) {
  const [min, max] = range;
  return min + Math.floor(rng() * (max - min + 1));
}

function roll(rng, ratio) {
  return rng() < ratio;
}

function pickVisibility(rng, weights) {
  const rollValue = rng();
  let cumulative = 0;
  for (const [visibility, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (rollValue < cumulative) return visibility;
  }
  return "public";
}

export async function generateVault(baseDir, options) {
  const { size, profile = "baseline", seed = 1234, assetPool } = options;
  const config = profileConfig(profile);
  const rng = createRng(seed);
  await fs.mkdir(baseDir, { recursive: true });
  const assetCount =
    config.assetRatio > 0
      ? Math.max(1, assetPool ?? Math.ceil(size * (config.assetsPerNote ?? 1)))
      : 0;
  if (assetCount > 0) await generateAssets(baseDir, assetCount, rng);
  const noteIndices = Array.from({ length: size }, (_, index) => index);
  const states = noteIndices.map((index) => ({
    slug: noteSlug(index, config.depth),
    visibility: pickVisibility(rng, config.visibility),
  }));
  for (const index of noteIndices) {
    await writeNote(baseDir, config, rng, index, size, {
      assets: assetCount,
      visibility: states[index].visibility,
      permalink: roll(rng, config.permalinkRatio),
      lang: roll(rng, config.l10nRatio) ? "ja" : undefined,
    });
  }
  return { slug: (index) => noteSlug(index, config.depth), size, states };
}

async function generateAssets(baseDir, count, rng) {
  for (let index = 0; index < count; index++) {
    const kind = index % 5 === 4 ? "pdf" : "png";
    const bytes = kind === "pdf" ? rng() * 4096 : rng() * 2048;
    await fs.mkdir(path.join(baseDir, "assets"), { recursive: true });
    await fs.writeFile(
      path.join(baseDir, "assets", `asset-${pad(index)}.${kind}`),
      Buffer.alloc(Math.max(16, Math.round(bytes)), 0),
    );
  }
}

export async function writeNote(
  baseDir,
  config,
  rng,
  index,
  _size,
  options = {},
) {
  const slug = noteSlug(index, config.depth);
  const file = path.join(baseDir, `${slug}.md`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const linkCount = pick(rng, config.linkRange);
  const links = [];
  for (let linkIndex = 0; linkIndex < linkCount; linkIndex++) {
    const target = index === 0 ? 0 : Math.floor(rng() * index);
    links.push(`[[note-${pad(target)}]]`);
  }
  if (index > 0 && index % 25 === 0) links.unshift("[[note-00000]]");
  const embeds = [];
  if (roll(rng, config.embedRatio) && index > 1) {
    embeds.push(`![[note-${pad(Math.floor(rng() * index))}]]`);
  }
  const assets = [];
  if (config.assetRatio > 0 && options.assets > 0) {
    const perNote = config.assetsPerNote ?? 1;
    for (let assetIndex = 0; assetIndex < perNote; assetIndex++) {
      const target = Math.floor(rng() * options.assets);
      const kind = target % 5 === 4 ? "pdf" : "png";
      assets.push(`![asset](../assets/asset-${pad(target)}.${kind})`);
    }
  }
  const tags = [];
  const tagCount = pick(rng, config.tagRange);
  for (let tagIndex = 0; tagIndex < tagCount; tagIndex++) {
    tags.push(`topic-${Math.floor(rng() * 40)}`);
  }
  const aliases = roll(rng, config.aliasRatio) ? [`Alias ${index}`] : [];
  const body = [];
  body.push(`# Note ${index}`);
  body.push("");
  for (let paragraph = 0; paragraph < config.bodyParagraphs; paragraph++) {
    body.push(
      `Paragraph ${paragraph} of note ${index} with deterministic prose used to approximate real vault content.`,
    );
    body.push("");
  }
  body.push(...links);
  if (embeds.length > 0) body.push(...embeds);
  if (assets.length > 0) body.push(...assets);
  body.push("");
  body.push(tags.map((tag) => `#${tag}`).join(" "));

  const frontmatter = ["---", `title: Note ${index}`];
  const visibility = options.visibility ?? "public";
  frontmatter.push(
    `visibility: ${visibility === "scheduled" ? "public" : visibility}`,
  );
  if (visibility === "scheduled")
    frontmatter.push(`publishAt: "2999-01-01T00:00:00.000Z"`);
  if (aliases.length > 0) frontmatter.push(`aliases: ["${aliases[0]}"]`);
  frontmatter.push(`tags: [${tags.map((tag) => `"${tag}"`).join(", ")}]`);
  if (options.lang) frontmatter.push(`lang: ${options.lang}`);
  if (options.lang) frontmatter.push(`translation: note-${pad(index)}`);
  if (options.permalink)
    frontmatter.push(`permalink: /custom/note-${pad(index)}`);
  frontmatter.push("---");
  frontmatter.push("");
  await fs.writeFile(file, [...frontmatter, ...body].join("\n"), "utf8");
  return slug;
}

export async function appendParagraph(baseDir, depth, index, text) {
  const file = path.join(baseDir, `${noteSlug(index, depth)}.md`);
  await fs.appendFile(file, `\n${text}\n`, "utf8");
}

export async function editFrontmatter(baseDir, depth, index, mutate) {
  const file = path.join(baseDir, `${noteSlug(index, depth)}.md`);
  const source = await fs.readFile(file, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`Missing frontmatter: ${file}`);
  const updated = mutate(match[1]);
  const next = source.replace(match[0], `---\n${updated}\n---`);
  await fs.writeFile(file, next, "utf8");
}

export async function moveNote(baseDir, depth, index, destination) {
  const from = path.join(baseDir, `${noteSlug(index, depth)}.md`);
  const to = path.join(baseDir, destination);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
}

export async function editAsset(baseDir, index, kind, payload) {
  const file = path.join(baseDir, "assets", `asset-${pad(index)}.${kind}`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, Buffer.from(payload));
}

export function padIndex(value) {
  return pad(value);
}
