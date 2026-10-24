import assert from "node:assert/strict";
import test from "node:test";
import { resolveIconic } from "../src/iconic.js";
import { iconicData, link, target } from "./helpers.js";

function resolve(data = iconicData(), subject = target("notes/Note.md")) {
  const messages: string[] = [];
  const value = resolveIconic(data, subject, {
    colors: true,
    report: (_rule, message) => messages.push(message),
  });
  return { value, messages };
}

test("manual file icons are read by normalized path", () => {
  const data = iconicData({
    fileIcons: { "notes/Note.md": { icon: "lucide-star", color: "blue" } },
  });
  const { value } = resolve(data);
  assert.equal(value?.icon, "lucide-star");
  assert.equal(value?.color, "var(--rr-icon-blue)");
});

test("first matching rule overrides the manual icon", () => {
  const data = iconicData({
    fileIcons: { "notes/Note.md": { icon: "lucide-book" } },
    fileRules: [
      {
        id: "first",
        icon: "lucide-rocket",
        enabled: true,
        conditions: [{ source: "name", operator: "is", value: "Note" }],
      },
      {
        id: "second",
        icon: "lucide-star",
        enabled: true,
        conditions: [{ source: "extension", operator: "is", value: "md" }],
      },
    ],
  });
  const { value } = resolve(data);
  assert.equal(value?.icon, "lucide-rocket");
});

test("supports all, any, none, and negated conditions", () => {
  const rule = (match: "all" | "any" | "none") => ({
    id: match,
    icon: "lucide-star",
    enabled: true,
    match,
    conditions: [
      { source: "name", operator: "is", value: "Note" },
      { source: "extension", operator: "!is", value: "txt" },
    ],
  });
  assert.equal(
    resolve(iconicData({ fileRules: [rule("all")] })).value?.icon,
    "lucide-star",
  );
  assert.equal(
    resolve(iconicData({ fileRules: [rule("any")] })).value?.icon,
    "lucide-star",
  );
  assert.equal(
    resolve(iconicData({ fileRules: [rule("none")] })).value,
    undefined,
  );
});

test("supports tags, properties, links, and embeds", () => {
  const data = iconicData({
    fileRules: [
      {
        id: "rich",
        icon: "lucide-book",
        enabled: true,
        conditions: [
          { source: "tags", operator: "includes", value: "guide" },
          { source: "property:Status", operator: "is", value: "done" },
          { source: "links", operator: "anyContain", value: "Other" },
          { source: "embeds", operator: "anyContain", value: "Chart" },
        ],
      },
    ],
  });
  const { value } = resolve(
    data,
    target("notes/Note.md", {
      tags: ["guide"],
      frontmatter: { status: "done" },
      links: ["Other", "Chart"],
      embeds: ["Chart"],
    }),
  );
  assert.equal(value?.icon, "lucide-book");
});

test("unsupported conditions never match and are reported", () => {
  const data = iconicData({
    fileRules: [
      {
        id: "clock",
        name: "Clock rule",
        icon: "lucide-clock",
        enabled: true,
        conditions: [{ source: "clock", operator: "is", value: "morning" }],
      },
      {
        id: "date",
        name: "Date rule",
        icon: "lucide-calendar",
        enabled: true,
        conditions: [{ source: "created", operator: "isToday", value: "" }],
      },
    ],
  });
  const { value, messages } = resolve(data);
  assert.equal(value, undefined);
  assert.equal(messages.length, 2);
});

test("folder rules only apply to folders", () => {
  const data = iconicData({
    folderRules: [
      {
        id: "folder",
        icon: "lucide-folder",
        enabled: true,
        conditions: [{ source: "name", operator: "is", value: "notes" }],
      },
    ],
  });
  assert.equal(
    resolve(data, target("notes", { kind: "folder", slug: "notes" })).value
      ?.icon,
    "lucide-folder",
  );
  assert.equal(resolve(data).value, undefined);
});

test("disabled and empty rules are ignored", () => {
  const data = iconicData({
    fileRules: [
      { id: "off", icon: "lucide-star", enabled: false, conditions: [] },
      { id: "empty", icon: "lucide-star", enabled: true, conditions: [] },
    ],
  });
  assert.equal(resolve(data).value, undefined);
});

test("link helpers are accepted without changing matching", () => {
  assert.equal(link("Note").raw, "Note");
});
