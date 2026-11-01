import assert from "node:assert/strict";
import { test } from "node:test";
import { ContentManager, type ContentSource } from "@riebeckite/core";
import { obsidianMarkdown } from "../index.js";

function memorySource(
  files: Record<string, string | Uint8Array>,
): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

async function render(
  files: Record<string, string | Uint8Array>,
  permalink = "/",
): Promise<string> {
  const manager = new ContentManager(memorySource(files), [], {
    plugins: [obsidianMarkdown()],
  });
  const manifest = await manager.getManifest();
  const entry = manifest.publicEntries.find(
    (candidate) => candidate.permalink === permalink,
  );
  assert.ok(entry, `missing entry ${permalink}`);
  return entry.html;
}

test("resolves same-page heading links to the heading anchor", async () => {
  const html = await render({
    "index.md": "---\npublish: true\n---\n\n# 見出し\n\n[[#見出し]]\n",
  });

  assert.match(html, /<h1 id="見出し">見出し<\/h1>/);
  assert.match(
    html,
    /<a href="\/#%E8%A6%8B%E5%87%BA%E3%81%97" class="rr-obsidian-wikilink">見出し<\/a>/,
  );
});

test("resolves same-page block links to a plain block id", async () => {
  const html = await render({
    "index.md": "---\npublish: true\n---\n\nBlock text ^blk\n\n[[#^blk]]\n",
  });

  assert.match(html, /<p data-block-id="blk" id="blk">Block text<\/p>/);
  assert.match(
    html,
    /<a href="\/#blk" class="rr-obsidian-wikilink">\^blk<\/a>/,
  );
  assert.doesNotMatch(html, /user-content-blk/);
});

test("resolves cross-note heading and block links with aliases", async () => {
  const html = await render({
    "index.md":
      "---\npublish: true\n---\n\n[[note#Heading|Alias]] [[note#^blk]] [[note#Heading]]\n",
    "note.md": "---\npublish: true\n---\n\n## Heading\n\nBlock ^blk\n",
  });

  assert.match(
    html,
    /<a href="\/note#heading" class="rr-obsidian-wikilink">Alias<\/a>/,
  );
  assert.match(
    html,
    /<a href="\/note#blk" class="rr-obsidian-wikilink">note > \^blk<\/a>/,
  );
  assert.match(
    html,
    /<a href="\/note#heading" class="rr-obsidian-wikilink">note > Heading<\/a>/,
  );

  const noteHtml = await render(
    {
      "index.md": "---\npublish: true\n---\n\n[[note]]\n",
      "note.md": "---\npublish: true\n---\n\n## Heading\n\nBlock ^blk\n",
    },
    "/note",
  );
  assert.match(noteHtml, /<p data-block-id="blk" id="blk">Block<\/p>/);
});

test("applies Obsidian image size aliases and keeps alt text distinct", async () => {
  const image = new Uint8Array([137, 80, 78, 71]);
  const html = await render({
    "index.md":
      "---\npublish: true\n---\n\n![[pic.png|300]]\n\n![[pic.png|300x200]]\n\n![[pic.png|A description]]\n",
    "pic.png": image,
  });

  assert.match(html, /<img src="\/pic\.png" alt="pic\.png" width="300"/);
  assert.match(
    html,
    /<img src="\/pic\.png" alt="pic\.png" width="300" height="200"/,
  );
  assert.match(html, /<img src="\/pic\.png" alt="A description"/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
});

test("rejects invalid image dimensions instead of emitting them", async () => {
  const image = new Uint8Array([137, 80, 78, 71]);
  const html = await render({
    "index.md":
      "---\npublish: true\n---\n\n![[pic.png|0]] ![[pic.png|0x200]] ![[pic.png|300x]]\n",
    "pic.png": image,
  });

  assert.doesNotMatch(html, /width=/);
  assert.doesNotMatch(html, /height=/);
  assert.match(html, /<img src="\/pic\.png" alt="0"/);
});

test("embeds a whole heading section up to the next peer heading", async () => {
  const html = await render({
    "index.md": "---\npublish: true\n---\n\n![[note#Section]]\n",
    "note.md":
      "---\npublish: true\n---\n\n# Section\n\nFirst.\n\n- one\n  - nested\n\n## Sub\n\nDeep.\n\n# Next\n\nOutside.\n",
  });

  assert.match(html, /First\./);
  assert.match(html, /nested/);
  assert.match(html, /Deep\./);
  assert.doesNotMatch(html, /Outside\./);
  assert.match(html, /data-wikilink-fragment="Section"/);
});

test("embeds a block reference that spans a nested list", async () => {
  const html = await render({
    "index.md": "---\npublish: true\n---\n\n![[note#^list]]\n",
    "note.md":
      "---\npublish: true\n---\n\n- one\n  - nested\n  - nested two\n- two\n\n^list\n",
  });

  assert.match(html, /<ul>/);
  assert.match(html, /nested two/);
  assert.match(html, /<li>two<\/li>/);
  assert.match(html, /data-wikilink-fragment="\^list"/);
});

test("embeds a blockquote block marked on its own line", async () => {
  const html = await render({
    "index.md": "---\npublish: true\n---\n\n![[note#^quote]]\n",
    "note.md":
      "---\npublish: true\n---\n\nBefore.\n\n> Quoted line\n> Second line\n\n^quote\n\nAfter.\n",
  });

  assert.match(
    html,
    /<blockquote>\s*<p>\s*Quoted line\s+Second line\s*<\/p>\s*<\/blockquote>/,
  );
  assert.doesNotMatch(html, /After\./);
});

test("embeds a same-page heading section", async () => {
  const html = await render({
    "index.md":
      "---\npublish: true\n---\n\n![[#Part]]\n\n# Part\n\nIncluded body.\n",
  });

  assert.match(html, /data-wikilink-embed="index"/);
  assert.match(html, /data-wikilink-fragment="Part"/);
  assert.match(html, /Included body\./);
});

test("removes Obsidian comments and leaves code blocks untouched", async () => {
  const html = await render({
    "index.md":
      "---\npublish: true\n---\n\nbefore %%hidden inline%% after\n\n%%\nmulti\nline\n%%\n\n`%%inline code%%`\n\n```\n%%fenced%%\n```\n",
  });

  assert.match(html, /before\s+after/);
  assert.doesNotMatch(html, /hidden inline/);
  assert.doesNotMatch(html, /multi/);
  assert.match(html, /%%inline code%%/);
  assert.match(html, /%%fenced%%/);
  assert.doesNotMatch(html, /<p><\/p>/);
});

test("stops recursive embeds without leaking content", async () => {
  const html = await render({
    "index.md": "---\npublish: true\n---\n\n![[a]]\n",
    "a.md": "---\npublish: true\n---\n\nA body.\n\n![[b]]\n",
    "b.md": "---\npublish: true\n---\n\nB body.\n\n![[a]]\n",
  });

  assert.match(html, /A body\./);
  assert.match(html, /B body\./);
});

test("does not embed private notes and keeps broken link diagnostics", async () => {
  const manager = new ContentManager(
    memorySource({
      "index.md":
        "---\npublish: true\n---\n\n[[secret]] ![[secret]] [[missing]] ![[missing]]\n",
      "secret.md": "---\npublish: false\n---\n\nSECRET_MARKER\n",
    }),
    [],
    { plugins: [obsidianMarkdown()] },
  );

  const manifest = await manager.getManifest();
  const entry = manifest.publicEntries.find(
    (candidate) => candidate.permalink === "/",
  );
  assert.ok(entry);
  assert.doesNotMatch(entry.html, /SECRET_MARKER/);
  assert.match(
    entry.html,
    /class="rr-obsidian-wikilink rr-obsidian-wikilink--broken">secret<\/a>/,
  );
  assert.match(entry.html, /\[\[Unresolved embed: secret\]\]/);
  assert.match(
    entry.html,
    /class="rr-obsidian-wikilink rr-obsidian-wikilink--broken">missing<\/a>/,
  );
  assert.match(entry.html, /\[\[Unresolved embed: missing\]\]/);
});

test("keeps sanitization for dangerous HTML and URLs", async () => {
  const html = await render({
    "index.md":
      '---\npublish: true\n---\n\n<script>alert(1)</script>\n\n<a href="javascript:alert(1)">x</a>\n\n<iframe src="https://example.com"></iframe>\n',
  });

  assert.doesNotMatch(html, /<script/);
  assert.doesNotMatch(html, /javascript:/);
  assert.doesNotMatch(html, /<iframe/);
});

test("resolves Japanese and spaced note names", async () => {
  const html = await render({
    "index.md":
      "---\npublish: true\n---\n\n[[日本語 ノート]] [[日本語 ノート#節]]\n",
    "日本語 ノート.md": "---\npublish: true\n---\n\n# 節\n\n本文。\n",
  });

  assert.match(
    html,
    /<a href="\/%E6%97%A5%E6%9C%AC%E8%AA%9E%20%E3%83%8E%E3%83%BC%E3%83%88" class="rr-obsidian-wikilink">日本語 ノート<\/a>/,
  );
  assert.match(
    html,
    /<a href="\/%E6%97%A5%E6%9C%AC%E8%AA%9E%20%E3%83%8E%E3%83%BC%E3%83%88#%E7%AF%80" class="rr-obsidian-wikilink">日本語 ノート > 節<\/a>/,
  );
});
