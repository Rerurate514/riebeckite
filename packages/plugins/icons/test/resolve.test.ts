import assert from "node:assert/strict";
import test from "node:test";
import { parseIconReference } from "../src/iconize.js";
import {
  createIconResolver,
  resolveIconsOptions,
  validateIconsOptions,
} from "../src/resolve.js";
import { entry, iconicData, iconizeData, loaded } from "./helpers.js";

function resolver(options = {}, settings = loaded()) {
  return createIconResolver({
    settings,
    options: resolveIconsOptions(options),
    reportRule: () => {},
  });
}

test("direct Iconize icons beat rules and inherit the global color", () => {
  const iconize = iconizeData(
    { "notes/rocket.md": { iconName: "LiRocket" } },
    {
      iconColor: "ff0000",
      rules: [{ rule: "^notes/", icon: "LiBook", order: 1 }],
    },
  );
  const value = resolver({}, loaded({ iconize })).forEntry(
    entry("notes/rocket"),
  );
  assert.equal(value?.id, "lucide:rocket");
  assert.equal(value?.color, "#ff0000");
  assert.match(value?.html ?? "", /class="rr-icon rr-icon--svg"/);
});

test("Iconize rules use order, basename matching, and type filters", () => {
  const iconize = iconizeData(
    {},
    {
      rules: [
        { rule: "draft", icon: "LiFile", order: 2, for: "files" },
        { rule: "notes", icon: "LiBook", order: 1, for: "folders" },
      ],
    },
  );
  const shared = loaded({ iconize });
  assert.equal(
    resolver({}, shared).forEntry(entry("notes/draft"))?.id,
    "lucide:file",
  );
  assert.equal(resolver({}, shared).forFolder("notes")?.id, "lucide:book");
});

test("frontmatter icons override Iconic and Iconize", () => {
  const iconize = iconizeData({ "note.md": { iconName: "LiBook" } });
  const iconic = iconicData({
    fileIcons: { "note.md": { icon: "lucide-star" } },
  });
  const value = resolver({}, loaded({ iconize, iconic })).forEntry(
    entry("note", { icon: "LiRocket", iconColor: "#00ff00" }),
  );
  assert.equal(value?.id, "lucide:rocket");
  assert.equal(value?.color, "#00ff00");
});

test("precedence is configurable and Iconic rules beat manual icons", () => {
  const iconic = iconicData({
    fileIcons: { "note.md": { icon: "lucide-book" } },
    fileRules: [
      {
        id: "rule",
        icon: "lucide-rocket",
        enabled: true,
        conditions: [{ source: "name", operator: "is", value: "note" }],
      },
    ],
  });
  const settings = loaded({ iconic });
  assert.equal(
    resolver({}, settings).forEntry(entry("note"))?.id,
    "lucide:rocket",
  );
  assert.equal(
    resolver(
      { precedence: ["config", "iconize", "iconic"] },
      settings,
    ).forEntry(entry("note"))?.id,
    "lucide:rocket",
  );
  assert.equal(
    resolver(
      {
        precedence: ["config", "frontmatter", "iconize", "iconic"],
        overrides: { "note.md": "LiStar" },
      },
      settings,
    ).forEntry(entry("note"))?.id,
    "lucide:star",
  );
});

test("tag and property icons are resolved case-insensitively", () => {
  const iconic = iconicData({
    tagIcons: { Guide: { icon: "lucide-book", color: "red" } },
    propertyIcons: { Status: { icon: "🚀" } },
  });
  const value = resolver({}, loaded({ iconic }));
  assert.equal(value.forTag("guide")?.id, "lucide:book");
  assert.equal(value.forTag("guide")?.color, "var(--rr-icon-red)");
  assert.equal(value.forProperty("status")?.id, "emoji:🚀");
});

test("inline names resolve emoji first, then Lucide, and keep unknown names", () => {
  const value = resolver(
    {},
    loaded({ iconize: iconizeData({}, { iconIdentifier: ":" }) }),
  );
  assert.equal(value.inline("rocket")?.kind, "emoji");
  assert.equal(value.inline("smile")?.kind, "emoji");
  assert.equal(value.inline("LiRocket")?.id, "lucide:rocket");
  assert.equal(value.inline("list")?.id, "lucide:list");
  assert.equal(value.inline("not-a-real-icon-xyz"), undefined);
  assert.equal(value.identifier, ":");
});

test("icon references preserve names starting with li and split pack names", () => {
  assert.equal(parseIconReference("LiRocket", []), "lucide:rocket");
  assert.equal(parseIconReference("list", []), "lucide:list");
  assert.equal(
    parseIconReference("MypackRocket", ["my-pack"]),
    "pack:MyPack:Rocket",
  );
});

test("inline icons respect the Iconize switch and Lucide pack mode", () => {
  const disabled = loaded({
    iconize: iconizeData({}, { iconsInNotesEnabled: false }),
  });
  assert.equal(resolver({}, disabled).inline("rocket"), undefined);

  const lucideOnly = loaded({
    iconize: iconizeData({}, { lucideIconPackType: "none" }),
  });
  assert.equal(resolver({}, lucideOnly).inline("rocket")?.kind, "emoji");
  assert.equal(
    resolver({}, lucideOnly).inline("not-a-real-icon-xyz"),
    undefined,
  );
});

test("options validation rejects unknown and duplicate values", () => {
  const issues = validateIconsOptions({
    sources: ["iconic", "iconic"],
    precedence: ["config", "config"],
    inline: "yes",
  } as never);
  assert.ok(issues?.some((issue) => issue.path === "sources[1]"));
  assert.ok(issues?.some((issue) => issue.path === "precedence[1]"));
  assert.ok(issues?.some((issue) => issue.path === "inline"));
  assert.equal(validateIconsOptions({}), undefined);
});
